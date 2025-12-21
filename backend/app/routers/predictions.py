from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
import pandas as pd
import numpy as np
import io

from app.database import get_db
from app.models import Alert, NetworkFlow, ShapExplanation
from app.utils.model_loader import model_manager
from app.utils.shap_explainer import generate_shap_explanation, preprocess_features, predict_with_ensemble

router = APIRouter()

class PredictionRequest(BaseModel):
    features: List[float]

class PredictionResponse(BaseModel):
    prediction: str
    attack_type: str
    confidence: float
    attack_type_confidence: float
    rf_confidence: float
    if_anomaly_score: float
    ae_reconstruction_error: float
    alert_id: int

@router.post("/predict", response_model=PredictionResponse)
async def predict_single(
    request: PredictionRequest,
    db: Session = Depends(get_db)
):
    """Predict single network flow with SHAP explanation"""
    try:
        # Prepare features
        features_array = np.array(request.features).reshape(1, -1)
        
        # Check feature count
        if features_array.shape[1] != len(model_manager.feature_names):
            raise HTTPException(
                status_code=400,
                detail=f"Expected {len(model_manager.feature_names)} features, got {features_array.shape[1]}"
            )
        
        # Preprocess
        processed_features = preprocess_features(features_array)
        
        # Predict
        prediction_result = predict_with_ensemble(processed_features)
        
        # Generate SHAP explanation
        shap_explanation = generate_shap_explanation(processed_features, prediction_result)
        
        # Store in database
        alert = Alert(
            prediction=prediction_result['prediction'],
            attack_type=prediction_result['attack_type'],
            confidence=prediction_result['confidence'],
            rf_confidence=prediction_result['rf_confidence'],
            if_confidence=prediction_result['if_anomaly_score'],
            ae_reconstruction_error=prediction_result['ae_reconstruction_error']
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        
        # Store network flow
        network_flow = NetworkFlow(
            alert_id=alert.alert_id,
            raw_features={
                feat: float(val) for feat, val in 
                zip(model_manager.feature_names, features_array[0])
            }
        )
        db.add(network_flow)
        
        # Store SHAP explanation
        shap_record = ShapExplanation(
            alert_id=alert.alert_id,
            shap_values=shap_explanation['shap_values'],
            top_features=shap_explanation['top_features'],
            summary=shap_explanation['summary']
        )
        db.add(shap_record)
        db.commit()
        
        return PredictionResponse(
            prediction=prediction_result['prediction'],
            attack_type=prediction_result['attack_type'],
            confidence=prediction_result['confidence'],
            attack_type_confidence=prediction_result['attack_type_confidence'],
            rf_confidence=prediction_result['rf_confidence'],
            if_anomaly_score=prediction_result['if_anomaly_score'],
            ae_reconstruction_error=prediction_result['ae_reconstruction_error'],
            alert_id=alert.alert_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload CSV file and predict all flows"""
    try:
        # Read CSV
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # Remove label column if exists
        label_columns = ['Label', 'label', 'LABEL']
        for col in label_columns:
            if col in df.columns:
                df = df.drop(columns=[col])
        
        # Convert to numpy
        features_array = df.values
        
        # Check if there are the right number of features
        if features_array.shape[1] != len(model_manager.feature_names):
            raise HTTPException(
                status_code=400,
                detail=f"CSV has {features_array.shape[1]} features, expected {len(model_manager.feature_names)}"
            )
        
        # Preprocess
        processed_features = preprocess_features(features_array)
        
        results = []
        
        # Predict each flow (limit 1000 for demo)
        max_flows = min(len(processed_features), 1000)
        
        for i in range(max_flows):
            feature_row = processed_features[i:i+1]
            
            # Predict
            prediction_result = predict_with_ensemble(feature_row)
            
            # Generate SHAP
            shap_explanation = generate_shap_explanation(feature_row, prediction_result)
            
            # Store alert
            alert = Alert(
                prediction=prediction_result['prediction'],
                attack_type=prediction_result['attack_type'],
                confidence=prediction_result['confidence'],
                rf_confidence=prediction_result['rf_confidence'],
                if_confidence=prediction_result['if_anomaly_score'],
                ae_reconstruction_error=prediction_result['ae_reconstruction_error']
            )
            db.add(alert)
            db.flush()  # Get alert_id without committing
            
            # Store flow
            network_flow = NetworkFlow(
                alert_id=alert.alert_id,
                raw_features={
                    feat: float(val) for feat, val in 
                    zip(model_manager.feature_names, features_array[i])
                }
            )
            db.add(network_flow)
            
            # Store SHAP
            shap_record = ShapExplanation(
                alert_id=alert.alert_id,
                shap_values=shap_explanation['shap_values'],
                top_features=shap_explanation['top_features'],
                summary=shap_explanation['summary']
            )
            db.add(shap_record)
            
            results.append({
                'alert_id': alert.alert_id,
                'prediction': prediction_result['attack_type'],
                'confidence': prediction_result['confidence']
            })
        
        db.commit()
        
        return {
            'status': 'success',
            'total_flows_uploaded': len(features_array),
            'total_flows_processed': max_flows,
            'predictions': results[:20]  # Return first 20
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))