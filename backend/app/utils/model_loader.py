import joblib
import pickle
import numpy as np
import shap
import tensorflow as tf

class ModelManager:
    def __init__(self):
        self.models_loaded = False
        self.rf_binary = None
        self.iso_forest = None
        self.autoencoder = None
        self.rf_multiclass = None
        self.label_encoder = None
        self.scaler = None
        self.imputer = None
        self.ae_threshold = None
        self.feature_names = None
        self.shap_explainer = None
        
    def load_models(self):
        """Load all trained models"""
        try:
            print("Loading models...")
            
            self.rf_binary = joblib.load('models/rf_model.pkl')
            self.iso_forest = joblib.load('models/iso_forest.pkl')
            self.autoencoder = tf.keras.models.load_model('models/autoencoder.keras', compile=False)
            
            self.autoencoder.compile(
                optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
                loss=tf.keras.losses.MeanSquaredError(),
                metrics=[tf.keras.metrics.MeanAbsoluteError()]
            )
            
            self.rf_multiclass = joblib.load('models/attack_type_classifier.pkl')
            self.label_encoder = joblib.load('models/label_encoder.pkl')
            self.scaler = joblib.load('models/scaler.pkl')
            self.imputer = joblib.load('models/imputer.pkl')
            
            with open('models/ae_threshold.txt', 'r') as f:
                self.ae_threshold = float(f.read())
            
            with open('models/feature_names.pkl', 'rb') as f:
                self.feature_names = pickle.load(f)
            
            self.shap_explainer = shap.TreeExplainer(self.rf_binary)
            
            self.models_loaded = True
            print("All models loaded successfully")
            
        except Exception as e:
            print(f"Error loading models: {e}")
            raise

model_manager = ModelManager()