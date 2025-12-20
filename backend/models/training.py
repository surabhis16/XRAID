#trained on kaggle; CICIDS2017 dataset 
import pandas as pd
import numpy as np
import os
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, Dense, Dropout, BatchNormalization
from tensorflow.keras.regularizers import l2
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import pickle
import joblib

# Create models directory
os.makedirs('models', exist_ok=True)

# Data loading with attack types
print("Loading CICIDS2017 dataset with attack types...")

folder_path = "/kaggle/input/network-intrusion-dataset"
csv_files = [f for f in os.listdir(folder_path) if f.endswith('.csv')]

dfs = []
for file in csv_files:
    path = os.path.join(folder_path, file)
    df = pd.read_csv(path, low_memory=False)
    dfs.append(df)

data = pd.concat(dfs, ignore_index=True)
data.columns = data.columns.str.strip()

# Keep original attack type labels
data['Label'] = data['Label'].astype(str).str.strip().str.upper()

print(f"\nDataset shape: {data.shape}")
print(f"\nOriginal label distribution:")
print(data['Label'].value_counts())


# Map attack types to categories (useful for multi-class classification later)
print("\nMapping attack types to main categories...")

attack_type_mapping = {
    'BENIGN': 'Benign',
    'PortScan': 'PortScan',
    'Web Attack � Brute Force': 'WebAttack',
    'Web Attack � XSS': 'WebAttack',
    'Web Attack � Sql Injection': 'WebAttack',
    'FTP-Patator': 'BruteForce',
    'SSH-Patator': 'BruteForce',
    'DDoS': 'DDoS',
    'Bot': 'Botnet',
    'Infiltration': 'Infiltration',
    'DoS slowloris': 'DoS',
    'DoS Slowhttptest': 'DoS',
    'DoS Hulk': 'DoS',
    'DoS GoldenEye': 'DoS',
    'Heartbleed': 'Exploit'
}

# Apply mapping
data['AttackType'] = data['Label'].map(attack_type_mapping)
data['AttackType'] = data['AttackType'].fillna('Other')

print(f"\nConsolidated attack type distribution:")
print(data['AttackType'].value_counts())

# Create binary label (for binary models)
data['IsMalicious'] = (data['AttackType'] != 'Benign').astype(int)

print(f"\nBinary distribution: {data['IsMalicious'].value_counts()}")


# Prepare features
X = data.drop(columns=['Label', 'AttackType', 'IsMalicious'])
y_binary = data['IsMalicious']
y_multiclass = data['AttackType']

# Store original feature names
original_feature_names = X.columns.tolist()
print(f"\nNumber of features: {len(original_feature_names)}")

# Handle infinite and NaN values
X = np.where(np.isinf(X), np.nan, X)
imputer = SimpleImputer(strategy='mean')
X = imputer.fit_transform(X)

# Scale features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Encode multi-class labels
label_encoder = LabelEncoder()
y_multiclass_encoded = label_encoder.fit_transform(y_multiclass)

print(f"\nEncoded classes: {label_encoder.classes_}")
print(f"Number of classes: {len(label_encoder.classes_)}")

# Train-test split (stratify on multi-class; to handle class imbalance)
X_train, X_test, y_train_binary, y_test_binary, y_train_multi, y_test_multi = train_test_split(
    X_scaled, y_binary, y_multiclass_encoded, 
    test_size=0.2, random_state=42, stratify=y_multiclass_encoded
)

print(f"\nTraining set: {X_train.shape}")
print(f"Test set: {X_test.shape}")

# Autoencoder architecture (optimized)
def create_optimal_autoencoder(input_dim, encoding_dims=[64, 32, 16]):
    input_layer = Input(shape=(input_dim,))
    
    # Encoder
    x = input_layer
    for i, dim in enumerate(encoding_dims):
        x = Dense(dim, activation='relu', 
                 kernel_regularizer=l2(0.001),
                 name=f'encoder_{i+1}')(x)
        x = BatchNormalization(name=f'bn_encoder_{i+1}')(x)
        dropout_rate = 0.3 - (i * 0.05)
        x = Dropout(dropout_rate, name=f'dropout_encoder_{i+1}')(x)
    
    encoded = x
    
    # Decoder
    for i, dim in enumerate(reversed(encoding_dims[:-1])):
        x = Dense(dim, activation='relu',
                 kernel_regularizer=l2(0.001),
                 name=f'decoder_{i+1}')(x)
        x = BatchNormalization(name=f'bn_decoder_{i+1}')(x)
        dropout_rate = 0.2 + (i * 0.05)
        x = Dropout(dropout_rate, name=f'dropout_decoder_{i+1}')(x)
    
    decoded = Dense(input_dim, activation='linear', name='output')(x)
    
    autoencoder = Model(inputs=input_layer, outputs=decoded, name='NetworkAnomalyAE')
    autoencoder.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss=tf.keras.losses.MeanSquaredError(),
        metrics=[tf.keras.metrics.MeanAbsoluteError()]
    )
    
    return autoencoder

# Random Forest training (first, for binary classification)
print("[1/4] Random Forest :")
rf_binary = RandomForestClassifier(
    n_estimators=200,
    max_depth=15,
    min_samples_split=5,
    min_samples_leaf=2,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)
rf_binary.fit(X_train, y_train_binary)
rf_pred = rf_binary.predict(X_test)
rf_proba = rf_binary.predict_proba(X_test)[:, 1]

print("Random Forest (Binary) trained")
print(f"  Accuracy: {accuracy_score(y_test_binary, rf_pred):.4f}")

# Isolation forest training (unsupervised; for outliers/anomalies)
print("[2/4] Isolation Forest :")

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

print("Isolation Forest trained")
print(f"  Accuracy: {accuracy_score(y_test_binary, iso_pred_binary):.4f}")

# Autoencoder training
print("[3/4] Autoencoder :")

# Use only benign traffic
X_train_benign = X_train[y_train_binary == 0]
print(f"  Training on {len(X_train_benign)} benign samples")

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

history = autoencoder.fit(
    X_train_benign, X_train_benign,
    epochs=100,
    batch_size=128,
    shuffle=True,
    validation_split=0.2,
    callbacks=[early_stopping, reduce_lr],
    verbose=0
)

print("Autoencoder trained")

# Compute threshold
val_split = int(len(X_train_benign) * 0.8)
X_val_benign = X_train_benign[val_split:]
X_val_pred = autoencoder.predict(X_val_benign, verbose=0)
val_errors = np.mean((X_val_benign - X_val_pred) ** 2, axis=1)

mean_error = np.mean(val_errors)
std_error = np.std(val_errors)
threshold_statistical = mean_error + 2.5 * std_error
threshold_percentile = np.percentile(val_errors, 95)
threshold = max(threshold_statistical, threshold_percentile)

print(f"  Threshold: {threshold:.6f}")

# Get AE predictions
X_test_pred = autoencoder.predict(X_test, verbose=0)
reconstruction_errors = np.mean((X_test - X_test_pred) ** 2, axis=1)
ae_pred_binary = (reconstruction_errors > threshold).astype(int)

print(f"  Accuracy: {accuracy_score(y_test_binary, ae_pred_binary):.4f}")


# Binary Ensemble Evaluation
print("Binary Ensemble Evaluation :")

def adaptive_ensemble_predict(rf_pred, rf_proba, iso_pred, ae_pred, rec_errors, threshold):
    rf_if_agree_anomaly = (rf_pred == 1) & (iso_pred == 1)
    rf_very_confident = rf_proba > 0.9
    ae_only_detection = (ae_pred == 1) & (rf_pred == 0) & (iso_pred == 0)
    ae_very_confident = rec_errors > (threshold * 1.2)
    ae_confident_detection = ae_only_detection & ae_very_confident
    
    final_pred = rf_if_agree_anomaly | rf_very_confident | ae_confident_detection
    return final_pred.astype(int)

ensemble_pred = adaptive_ensemble_predict(
    rf_pred, rf_proba, iso_pred_binary, ae_pred_binary, 
    reconstruction_errors, threshold
)

print("\nBinary Ensemble Results:")
print(classification_report(y_test_binary, ensemble_pred, target_names=['Benign', 'Attack']))
binary_accuracy = accuracy_score(y_test_binary, ensemble_pred)
print(f"Binary Accuracy: {binary_accuracy:.4f}")


# Train Multi-Class Classifier (for identifying specific attacks)=
print("[4/4] Multi Class Attack Type Classifier :")

rf_multiclass = RandomForestClassifier(
    n_estimators=200,
    max_depth=20,  # Deeper for multi-class
    min_samples_split=5,
    min_samples_leaf=2,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)
rf_multiclass.fit(X_train, y_train_multi)

# Evaluate multi-class
y_pred_multi = rf_multiclass.predict(X_test)
y_pred_multi_proba = rf_multiclass.predict_proba(X_test)

print("\n✓ Multi-Class Classifier trained")
print("\nMulti-Class Classification Report:")
print(classification_report(
    y_test_multi, 
    y_pred_multi, 
    target_names=label_encoder.classes_,
    digits=4
))

multiclass_accuracy = accuracy_score(y_test_multi, y_pred_multi)
print(f"\nMulti Class Accuracy: {multiclass_accuracy:.4f}")

# Confusion matrix
cm = confusion_matrix(y_test_multi, y_pred_multi)
print("\nConfusion Matrix:")
print(cm)

# Save the models
print("Saving models...")

# Binary models
print("Saving binary detection models...")
joblib.dump(rf_binary, 'models/rf_model.pkl')
joblib.dump(iso_forest, 'models/iso_forest.pkl')
autoencoder.save('models/autoencoder.keras')  

# Multi-class model
print("Saving multi-class classifier...")
joblib.dump(rf_multiclass, 'models/attack_type_classifier.pkl')
joblib.dump(label_encoder, 'models/label_encoder.pkl')

# Preprocessing
print("Saving preprocessing objects...")
joblib.dump(scaler, 'models/scaler.pkl')
joblib.dump(imputer, 'models/imputer.pkl')

# Threshold
with open('models/ae_threshold.txt', 'w') as f:
    f.write(str(threshold))

# Feature names
with open('models/feature_names.pkl', 'wb') as f:
    pickle.dump(original_feature_names, f)

# Metadata
metadata = {
    'binary_accuracy': binary_accuracy,
    'multiclass_accuracy': multiclass_accuracy,
    'rf_binary_accuracy': accuracy_score(y_test_binary, rf_pred),
    'if_accuracy': accuracy_score(y_test_binary, iso_pred_binary),
    'ae_accuracy': accuracy_score(y_test_binary, ae_pred_binary),
    'threshold': threshold,
    'n_features': X_train.shape[1],
    'n_classes': len(label_encoder.classes_),
    'classes': label_encoder.classes_.tolist(),
    'training_samples': len(X_train),
    'test_samples': len(X_test)
}

with open('models/metadata.pkl', 'wb') as f:
    pickle.dump(metadata, f)

print("\nAll models saved successfully!")

# - models/rf_model.pkl               : Binary Random Forest classifier
# - models/iso_forest.pkl             : Isolation Forest (anomaly detection)
# - models/autoencoder.keras          : Autoencoder model
# - models/attack_type_classifier.pkl : Multi-class Random Forest classifier
# - models/label_encoder.pkl          : Encodes class labels
# - models/scaler.pkl                 : Feature StandardScaler
# - models/imputer.pkl                : Handles missing values (SimpleImputer)
# - models/ae_threshold.txt           : Autoencoder anomaly threshold
# - models/feature_names.pkl          : Ordered list of feature names
# - models/metadata.pkl               : Training metadata (versions, params, stats)


# Create unified prediction function
print("Creating Unified Prediction Pipeline...")

def predict_network_flow(flow_features, return_details=False):
    """
    Unified prediction pipeline for XRAID
    
    Args:
        flow_features: numpy array (n_samples, n_features) - preprocessed network flow
        return_details: bool - if True, return detailed predictions from all models
    
    Returns:
        dict with prediction results
    """
    # Load models (cache these in production)
    rf_binary = joblib.load('models/rf_model.pkl')
    iso_forest = joblib.load('models/iso_forest.pkl')
    from tensorflow.keras.models import load_model
    autoencoder = load_model('models/autoencoder.keras', compile=False)
    
    # Recompile with explicit loss
    autoencoder.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss=tf.keras.losses.MeanSquaredError(),
        metrics=[tf.keras.metrics.MeanAbsoluteError()]
    )
    
    with open('models/ae_threshold.txt', 'r') as f:
        threshold = float(f.read())
    
    rf_multiclass = joblib.load('models/attack_type_classifier.pkl')
    label_encoder = joblib.load('models/label_encoder.pkl')
    
    # Binary predictions
    rf_pred = rf_binary.predict(flow_features)[0]
    rf_proba = rf_binary.predict_proba(flow_features)[0, 1]
    
    iso_pred = iso_forest.predict(flow_features)[0]
    iso_pred_binary = 1 if iso_pred == -1 else 0
    
    ae_reconstruction = autoencoder.predict(flow_features, verbose=0)
    ae_error = np.mean((flow_features - ae_reconstruction) ** 2)
    ae_pred_binary = 1 if ae_error > threshold else 0
    
    # Ensemble decision
    rf_if_agree_anomaly = (rf_pred == 1) and (iso_pred_binary == 1)
    rf_very_confident = rf_proba > 0.9
    ae_only_detection = (ae_pred_binary == 1) and (rf_pred == 0) and (iso_pred_binary == 0)
    ae_very_confident = ae_error > (threshold * 1.2)
    ae_confident_detection = ae_only_detection and ae_very_confident
    
    is_attack = int(rf_if_agree_anomaly or rf_very_confident or ae_confident_detection)
    
    # Multi-class prediction
    attack_type_encoded = rf_multiclass.predict(flow_features)[0]
    attack_type_proba = rf_multiclass.predict_proba(flow_features)[0]
    attack_type = label_encoder.inverse_transform([attack_type_encoded])[0]
    type_confidence = attack_type_proba[attack_type_encoded]
    
    # Final result
    if is_attack == 1 and attack_type != 'Benign':
        final_prediction = attack_type
        final_confidence = min(rf_proba, type_confidence)  # Conservative
    else:
        final_prediction = 'Benign'
        final_confidence = 1.0 - rf_proba
    
    result = {
        'prediction': final_prediction,
        'is_attack': bool(is_attack),
        'confidence': float(final_confidence),
        'attack_type_confidence': float(type_confidence)
    }
    
    if return_details:
        result.update({
            'rf_prediction': int(rf_pred),
            'rf_confidence': float(rf_proba),
            'if_prediction': int(iso_pred_binary),
            'if_anomaly_score': float(iso_pred),
            'ae_prediction': int(ae_pred_binary),
            'ae_reconstruction_error': float(ae_error),
            'ae_threshold': float(threshold),
            'all_attack_types': {
                label_encoder.inverse_transform([i])[0]: float(prob)
                for i, prob in enumerate(attack_type_proba)
            }
        })
    
    return result

# Test the function
print("\nTesting unified prediction pipeline...")
test_sample = X_test[0:1]
result = predict_network_flow(test_sample, return_details=True)

print(f"\nSample Prediction:")
print(f"  Final Prediction: {result['prediction']}")
print(f"  Is Attack: {result['is_attack']}")
print(f"  Confidence: {result['confidence']:.2%}")
print(f"  Type Confidence: {result['attack_type_confidence']:.2%}")
print(f"\n  Individual Models:")
print(f"    RF Binary: {result['rf_prediction']} (conf: {result['rf_confidence']:.2%})")
print(f"    IF Binary: {result['if_prediction']}")
print(f"    AE Binary: {result['ae_prediction']} (error: {result['ae_reconstruction_error']:.6f})")

# Save prediction function
import dill
with open('models/predict_function.pkl', 'wb') as f:
    dill.dump(predict_network_flow, f)

print("\nSaved: models/predict_function.pkl")


# Final Summary
print("Training Complete!")

print(f"\nFinal Results:")
print(f"  Binary Detection Accuracy: {binary_accuracy:.2%}")
print(f"  Multi-Class Accuracy: {multiclass_accuracy:.2%}")
print(f"  Number of Attack Types: {len(label_encoder.classes_)}")
print(f"  Attack Types: {', '.join(label_encoder.classes_)}")
