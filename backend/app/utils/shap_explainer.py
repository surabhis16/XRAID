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
    """Trust multiclass classifier"""
    
    # Get all model predictions
    rf_pred = model_manager.rf_binary.predict(features)[0]
    rf_proba = model_manager.rf_binary.predict_proba(features)[0, 1]
    
    iso_pred = model_manager.iso_forest.predict(features)[0]
    iso_pred_binary = 1 if iso_pred == -1 else 0
    
    ae_reconstruction = model_manager.autoencoder.predict(features, verbose=0)
    ae_error = float(np.mean((features - ae_reconstruction) ** 2))
    ae_pred_binary = 1 if ae_error > model_manager.ae_threshold else 0
    
    # Get multiclass prediction
    attack_type_encoded = model_manager.rf_multiclass.predict(features)[0]
    attack_type_proba = model_manager.rf_multiclass.predict_proba(features)[0]
    attack_type = model_manager.label_encoder.inverse_transform([attack_type_encoded])[0]
    type_confidence = float(attack_type_proba[attack_type_encoded])
    
    # If multiclass says attack with >35% confidence, trust it
    if attack_type != 'Benign' and type_confidence > 0.35:
        is_attack = 1
        final_prediction = attack_type
        final_confidence = type_confidence
    # Or if binary models are very confident
    elif rf_proba > 0.7 or (rf_proba > 0.5 and iso_pred_binary == 1):
        is_attack = 1
        final_prediction = attack_type if attack_type != 'Benign' else 'Other'
        final_confidence = rf_proba
    else:
        is_attack = 0
        final_prediction = 'Benign'
        final_confidence = 1.0 - rf_proba
    
    # Debug output for attacks
    if is_attack == 1:
        print(f"      Binary: RF={rf_proba:.3f}, ISO={iso_pred_binary}, AE={ae_pred_binary}")
        print(f"      Multiclass: {attack_type} ({type_confidence:.3f})")
        print(f"      Top 3 predictions:")
        
        # Show top 3 attack types
        top_3_idx = attack_type_proba.argsort()[-3:][::-1]
        for idx in top_3_idx:
            cls = model_manager.label_encoder.inverse_transform([idx])[0]
            prob = attack_type_proba[idx]
            print(f"         {cls}: {prob:.3f}")
    
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
    try:
        # Get SHAP values
        shap_values = model_manager.shap_explainer.shap_values(features)
        
        # Handle different SHAP output formats
        if isinstance(shap_values, list):
            # Binary classifier returns [class_0_values, class_1_values]
            # We want class 1 (attack) values
            shap_values_attack = shap_values[1]
            if len(shap_values_attack.shape) > 1:
                shap_values_attack = shap_values_attack[0]  # Get first sample
        else:
            # Single array output
            if len(shap_values.shape) > 1:
                shap_values_attack = shap_values[0]
            else:
                shap_values_attack = shap_values
        
        # Ensure 1D array and correct length
        shap_values_attack = np.array(shap_values_attack).flatten()
        
        # If SHAP values are doubled (concatenated for binary classes), take first half
        expected_len = len(model_manager.feature_names)
        if len(shap_values_attack) == expected_len * 2:
            print(f"SHAP values doubled ({len(shap_values_attack)}), taking attack class values (first {expected_len})")
            shap_values_attack = shap_values_attack[:expected_len]
        elif len(shap_values_attack) != expected_len:
            print(f"SHAP length mismatch: {len(shap_values_attack)} != {expected_len}, truncating")
            shap_values_attack = shap_values_attack[:expected_len]
        
        # Get feature values
        feature_values = np.array(features[0]).flatten()
        
        # Ensure matching lengths
        min_len = min(len(shap_values_attack), len(feature_values), len(model_manager.feature_names))
        shap_values_attack = shap_values_attack[:min_len]
        feature_values = feature_values[:min_len]
        feature_names = model_manager.feature_names[:min_len]
        
        # Create feature importance list
        feature_importance = []
        for shap_val, feat_val, feat_name in zip(shap_values_attack, feature_values, feature_names):
            # Convert to scalar
            shap_scalar = float(np.asarray(shap_val).item())
            feat_scalar = float(np.asarray(feat_val).item())
            
            feature_importance.append({
                'feature': feat_name,
                'shap_value': shap_scalar,
                'feature_value': feat_scalar,
                'abs_shap': abs(shap_scalar)
            })
        
        # Sort by absolute SHAP value
        feature_importance.sort(key=lambda x: x['abs_shap'], reverse=True)
        
        # Get top 5 features
        top_features = feature_importance[:5]
        
        # Generate summary
        if prediction_result['is_attack']:
            top_feature = top_features[0]
            summary = f"Flagged as {prediction_result['attack_type']} due to "
            summary += f"abnormal {top_feature['feature']} "
            summary += f"(value: {top_feature['feature_value']:.2f}, "
            summary += f"SHAP contribution: {top_feature['shap_value']:+.3f})"
        else:
            summary = f"Classified as Benign. Network flow characteristics within normal ranges."
        
        # Convert to list of scalars
        shap_values_list = [float(np.asarray(v).item()) for v in shap_values_attack]
        
        return {
            'shap_values': shap_values_list,
            'top_features': top_features,
            'summary': summary,
            'feature_names': list(feature_names)
        }
        
    except Exception as e:
        print(f"Error in generate_shap_explanation: {e}")
        import traceback
        traceback.print_exc()
        
        # Return fallback
        return {
            'shap_values': [0.0] * len(model_manager.feature_names),
            'top_features': [
                {
                    'feature': model_manager.feature_names[0],
                    'shap_value': 0.0,
                    'feature_value': 0.0,
                    'abs_shap': 0.0
                }
            ],
            'summary': f"Prediction: {prediction_result['attack_type']} (SHAP explanation unavailable)",
            'feature_names': model_manager.feature_names
        }