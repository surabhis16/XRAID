"""
SHAP explanation utilities for XRAID
"""
import numpy as np
from typing import Dict, Any
from app.utils.model_loader import model_manager

def preprocess_features(raw_features: np.ndarray) -> np.ndarray:
    """Preprocess raw network flow features"""
    # Handle inf/nan
    raw_features = np.where(np.isinf(raw_features), np.nan, raw_features)
    
    # Impute and scale
    features = model_manager.imputer.transform(raw_features)
    features = model_manager.scaler.transform(features)
    
    return features

def predict_with_ensemble(features: np.ndarray) -> Dict[str, Any]:
    """Run ensemble prediction"""
    # Binary predictions
    rf_pred = model_manager.rf_binary.predict(features)[0]
    rf_proba = model_manager.rf_binary.predict_proba(features)[0, 1]
    
    iso_pred = model_manager.iso_forest.predict(features)[0]
    iso_pred_binary = 1 if iso_pred == -1 else 0
    
    ae_reconstruction = model_manager.autoencoder.predict(features, verbose=0)
    ae_error = float(np.mean((features - ae_reconstruction) ** 2))
    ae_pred_binary = 1 if ae_error > model_manager.ae_threshold else 0
    
    # Adaptive ensemble logic
    rf_if_agree_anomaly = (rf_pred == 1) and (iso_pred_binary == 1)
    rf_very_confident = rf_proba > 0.9
    ae_only_detection = (ae_pred_binary == 1) and (rf_pred == 0) and (iso_pred_binary == 0)
    ae_very_confident = ae_error > (model_manager.ae_threshold * 1.2)
    ae_confident_detection = ae_only_detection and ae_very_confident
    
    is_attack = int(rf_if_agree_anomaly or rf_very_confident or ae_confident_detection)
    
    # Multi-class prediction
    attack_type_encoded = model_manager.rf_multiclass.predict(features)[0]
    attack_type_proba = model_manager.rf_multiclass.predict_proba(features)[0]
    attack_type = model_manager.label_encoder.inverse_transform([attack_type_encoded])[0]
    type_confidence = float(attack_type_proba[attack_type_encoded])
    
    # Final result
    if is_attack == 1 and attack_type != 'Benign':
        final_prediction = attack_type
        final_confidence = float(min(rf_proba, type_confidence))
    else:
        final_prediction = 'Benign'
        final_confidence = float(1.0 - rf_proba)
    
    return {
        'prediction': 'Attack' if is_attack == 1 else 'Benign',
        'attack_type': final_prediction,
        'confidence': final_confidence,
        'attack_type_confidence': type_confidence,
        'rf_confidence': float(rf_proba),
        'if_anomaly_score': float(iso_pred),
        'ae_reconstruction_error': ae_error,
        'is_attack': bool(is_attack)
    }

def generate_shap_explanation(features: np.ndarray, prediction_result: Dict) -> Dict[str, Any]:
    """Generate SHAP explanation for prediction"""
    # Get SHAP values
    shap_values = model_manager.shap_explainer.shap_values(features)
    
    # For binary classifier, shap_values is a list [class_0_values, class_1_values]
    # We want class 1 (attack) values
    if isinstance(shap_values, list):
        shap_values_attack = shap_values[1][0]  # Attack class, first sample
    else:
        shap_values_attack = shap_values[0]
    
    # Get feature values
    feature_values = features[0]
    
    # Create feature importance list
    feature_importance = []
    for i, (shap_val, feat_val, feat_name) in enumerate(zip(
        shap_values_attack, feature_values, model_manager.feature_names
    )):
        feature_importance.append({
            'feature': feat_name,
            'shap_value': float(shap_val),
            'feature_value': float(feat_val),
            'abs_shap': abs(float(shap_val))
        })
    
    # Sort by absolute SHAP value
    feature_importance.sort(key=lambda x: x['abs_shap'], reverse=True)
    
    # Get top 5 features
    top_features = feature_importance[:5]
    
    # Generate plain-English summary
    if prediction_result['is_attack']:
        top_feature = top_features[0]
        summary = f"Flagged as {prediction_result['attack_type']} due to "
        summary += f"abnormal {top_feature['feature']} "
        summary += f"(value: {top_feature['feature_value']:.2f}, "
        summary += f"SHAP contribution: {top_feature['shap_value']:+.3f})"
    else:
        summary = f"Classified as Benign. Network flow characteristics within normal ranges."
    
    return {
        'shap_values': [float(v) for v in shap_values_attack],
        'top_features': top_features,
        'summary': summary,
        'feature_names': model_manager.feature_names
    }