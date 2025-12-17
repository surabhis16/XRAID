#adaptive ensemble architecture

# import pandas as pd
import numpy as np
import os
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, Dense, Dropout, BatchNormalization
from tensorflow.keras.regularizers import l2
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import pickle
import joblib

# create models directory
os.makedirs('models', exist_ok=True)

# data loading and preprocessing
print("Loading CICIDS2017 dataset...")
folder_path = "/kaggle/input/network-intrusion-dataset"
csv_files = [f for f in os.listdir(folder_path) if f.endswith('.csv')]

dfs = []
for file in csv_files:
    path = os.path.join(folder_path, file)
    df = pd.read_csv(path, low_memory=False)
    dfs.append(df)

data = pd.concat(dfs, ignore_index=True)
data.columns = data.columns.str.strip()

# clean labels: 0 = benign, 1 = attack
data['Label'] = data['Label'].astype(str).str.strip()
data['Label'] = data['Label'].apply(lambda x: 0 if x.upper() == 'BENIGN' else 1)

print(f"Dataset shape: {data.shape}")
print(f"Label distribution:\n{data['Label'].value_counts()}")

# separate features and target
X = data.drop(columns=['Label'])
y = data['Label']

# store original feature names before preprocessing
original_feature_names = X.columns.tolist()

# handle infinite and nan values
X = np.where(np.isinf(X), np.nan, X)
imputer = SimpleImputer(strategy='mean')
X = imputer.fit_transform(X)

# scale features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42, stratify=y
)

print(f"Training set: {X_train.shape}, Test set: {X_test.shape}")

# autoencoder architecture
def create_optimal_autoencoder(input_dim, encoding_dims=[64, 32, 16]):
    input_layer = Input(shape=(input_dim,))
    x = input_layer

    # encoder
    for i, dim in enumerate(encoding_dims):
        x = Dense(
            dim,
            activation='relu',
            kernel_regularizer=l2(0.001),
            name=f'encoder_{i+1}'
        )(x)
        x = BatchNormalization(name=f'bn_encoder_{i+1}')(x)
        dropout_rate = 0.3 - (i * 0.05)
        x = Dropout(dropout_rate, name=f'dropout_encoder_{i+1}')(x)

    # decoder
    for i, dim in enumerate(reversed(encoding_dims[:-1])):
        x = Dense(
            dim,
            activation='relu',
            kernel_regularizer=l2(0.001),
            name=f'decoder_{i+1}'
        )(x)
        x = BatchNormalization(name=f'bn_decoder_{i+1}')(x)
        dropout_rate = 0.2 + (i * 0.05)
        x = Dropout(dropout_rate, name=f'dropout_decoder_{i+1}')(x)

    output_layer = Dense(input_dim, activation='linear', name='output')(x)

    autoencoder = Model(inputs=input_layer, outputs=output_layer, name='NetworkAnomalyAE')
    autoencoder.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='mse',
        metrics=['mae']
    )

    return autoencoder

# train random forest
print("Training Random Forest...")
rf_model = RandomForestClassifier(
    n_estimators=200,
    max_depth=15,
    min_samples_split=5,
    min_samples_leaf=2,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)
rf_model.fit(X_train, y_train)
rf_pred = rf_model.predict(X_test)
rf_proba = rf_model.predict_proba(X_test)[:, 1]

print(f"Random Forest accuracy: {accuracy_score(y_test, rf_pred):.4f}")

# train isolation forest
print("Training Isolation Forest...")
iso_forest = IsolationForest(
    n_estimators=200,
    contamination=0.05,
    max_samples='auto',
    random_state=42,
    n_jobs=-1
)
iso_forest.fit(X_train)
iso_pred = iso_forest.predict(X_test)
iso_pred_binary = np.where(iso_pred == -1, 1, 0)

print(f"Isolation Forest accuracy: {accuracy_score(y_test, iso_pred_binary):.4f}")

# train autoencoder
print("Training Autoencoder...")

# use only benign traffic for training
X_train_benign = X_train[y_train == 0]

autoencoder = create_optimal_autoencoder(
    input_dim=X_train.shape[1],
    encoding_dims=[64, 32, 16]
)

early_stopping = EarlyStopping(
    monitor='val_loss',
    patience=15,
    restore_best_weights=True,
    min_delta=1e-5
)

reduce_lr = ReduceLROnPlateau(
    monitor='val_loss',
    factor=0.5,
    patience=8,
    min_lr=1e-6,
    verbose=0
)

autoencoder.fit(
    X_train_benign,
    X_train_benign,
    epochs=100,
    batch_size=128,
    shuffle=True,
    validation_split=0.2,
    callbacks=[early_stopping, reduce_lr],
    verbose=0
)

# threshold selection
val_split = int(len(X_train_benign) * 0.8)
X_val_benign = X_train_benign[val_split:]

X_val_pred = autoencoder.predict(X_val_benign, verbose=0)
val_errors = np.mean((X_val_benign - X_val_pred) ** 2, axis=1)

threshold = max(
    np.mean(val_errors) + 2.5 * np.std(val_errors),
    np.percentile(val_errors, 95)
)

# autoencoder predictions
X_test_pred = autoencoder.predict(X_test, verbose=0)
reconstruction_errors = np.mean((X_test - X_test_pred) ** 2, axis=1)
ae_pred_binary = (reconstruction_errors > threshold).astype(int)

print(f"Autoencoder accuracy: {accuracy_score(y_test, ae_pred_binary):.4f}")

# adaptive ensemble prediction
def adaptive_ensemble_predict(rf_pred, rf_proba, iso_pred, ae_pred, rec_errors, threshold):
    rf_if_agree_anomaly = (rf_pred == 1) & (iso_pred == 1)
    rf_very_confident = rf_proba > 0.9
    ae_confident_detection = (
        (ae_pred == 1) &
        (rf_pred == 0) &
        (iso_pred == 0) &
        (rec_errors > threshold * 1.2)
    )
    return (rf_if_agree_anomaly | rf_very_confident | ae_confident_detection).astype(int)

ensemble_pred = adaptive_ensemble_predict(
    rf_pred,
    rf_proba,
    iso_pred_binary,
    ae_pred_binary,
    reconstruction_errors,
    threshold
)

print(classification_report(y_test, ensemble_pred))
ensemble_accuracy = accuracy_score(y_test, ensemble_pred)
print(f"Final ensemble accuracy: {ensemble_accuracy:.4f}")

# save models
joblib.dump(rf_model, 'models/rf_model.pkl')
joblib.dump(iso_forest, 'models/iso_forest.pkl')
autoencoder.save('models/autoencoder.h5')

# save preprocessing objects
joblib.dump(scaler, 'models/scaler.pkl')
joblib.dump(imputer, 'models/imputer.pkl')

# save threshold
with open('models/ae_threshold.txt', 'w') as f:
    f.write(str(threshold))

# save feature names
with open('models/feature_names.pkl', 'wb') as f:
    pickle.dump(original_feature_names, f)

# save ensemble function
with open('models/ensemble_function.pkl', 'wb') as f:
    pickle.dump(adaptive_ensemble_predict, f)

# save metadata
metadata = {
    'rf_accuracy': accuracy_score(y_test, rf_pred),
    'if_accuracy': accuracy_score(y_test, iso_pred_binary),
    'ae_accuracy': accuracy_score(y_test, ae_pred_binary),
    'ensemble_accuracy': ensemble_accuracy,
    'threshold': threshold,
    'n_features': X_train.shape[1],
    'training_samples': len(X_train),
    'test_samples': len(X_test)
}

with open('models/metadata.pkl', 'wb') as f:
    pickle.dump(metadata, f)

print("All models and artifacts saved.")
