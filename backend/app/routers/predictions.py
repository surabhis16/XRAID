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
        
        # print initial info (for debugging)
        print("CSV UPLOAD INFO")
        print(f"Original CSV shape: {df.shape}")
        print(f"CSV columns: {len(df.columns)}")
        print(f"Model expects: {len(model_manager.feature_names)} features")
        print(f"\nFirst 10 CSV columns: {list(df.columns[:10])}")
        print(f"First 10 model features: {model_manager.feature_names[:10]}")
        
        # Remove duplicate columns (CICIDS has duplicate "Fwd Header Length")
        duplicate_cols = df.columns[df.columns.duplicated()].tolist()
        if duplicate_cols:
            print(f"\n⚠️  Found duplicate columns: {duplicate_cols}")
            df = df.loc[:, ~df.columns.duplicated()]
            print(f"✓ Removed duplicates, new shape: {df.shape}")
        
        # Remove label columns if present
        label_columns = ['Label', 'label', 'LABEL']
        for col in label_columns:
            if col in df.columns:
                print(f"✓ Removing label column: '{col}'")
                df = df.drop(columns=[col])
        
        # Clean column names (strip whitespace, normalize)
        df.columns = df.columns.str.strip()
        original_cols = df.columns.tolist()
        
        # Try to match columns with model features
        print(f"\n Matching columns with model features...")
        
        # Create normalized mappings for matching
        def normalize_name(name):
            return name.lower().replace(' ', '_').replace('/', '_').replace('-', '_')
        
        csv_col_map = {normalize_name(col): col for col in df.columns}
        model_feat_map = {normalize_name(feat): feat for feat in model_manager.feature_names}
        
        # Find matches
        matched_columns = []
        missing_features = []
        
        for model_feat in model_manager.feature_names:
            normalized_feat = normalize_name(model_feat)
            if normalized_feat in csv_col_map:
                matched_columns.append(csv_col_map[normalized_feat])
            else:
                missing_features.append(model_feat)
                matched_columns.append(None)  # Placeholder for missing column
        
        print(f"Matched {len([c for c in matched_columns if c])} / {len(model_manager.feature_names)} features")
        
        if missing_features:
            print(f"\nMissing features ({len(missing_features)}):")
            for feat in missing_features[:10]:  # Show first 10
                print(f"   - {feat}")
            if len(missing_features) > 10:
                print(f"   ... and {len(missing_features) - 10} more")
        
        # Create feature dataframe with correct columns
        feature_df = pd.DataFrame()
        
        for i, (model_feat, csv_col) in enumerate(zip(model_manager.feature_names, matched_columns)):
            if csv_col is not None:
                feature_df[model_feat] = df[csv_col]
            else:
                # Fill missing features with 0
                print(f"Filling missing feature '{model_feat}' with 0")
                feature_df[model_feat] = 0
        
        # Clean data - handle infinity and NaN
        print(f"\nCleaning data...")
        
        # Replace infinity
        inf_count = np.isinf(feature_df.select_dtypes(include=[np.number]).values).sum()
        if inf_count > 0:
            print(f"   Found {inf_count} infinity values, replacing with NaN")
            feature_df = feature_df.replace([np.inf, -np.inf], np.nan)
        
        # Handle NaN
        nan_count = feature_df.isna().sum().sum()
        if nan_count > 0:
            print(f"   Found {nan_count} NaN values, filling with 0")
            feature_df = feature_df.fillna(0)
        
        # Ensure all numeric
        for col in feature_df.columns:
            feature_df[col] = pd.to_numeric(feature_df[col], errors='coerce').fillna(0)
        
        # Convert to numpy
        features_array = feature_df.values
        
        print(f"\nFinal prepared data:")
        print(f"   Shape: {features_array.shape}")
        print(f"   Data type: {features_array.dtype}")
        print(f"   Sample values (first row, first 5 features): {features_array[0, :5]}")
        print("\n")
        
        # Final validation
        if features_array.shape[1] != len(model_manager.feature_names):
            raise HTTPException(
                status_code=400,
                detail=f"Feature mismatch: prepared {features_array.shape[1]} features, model expects {len(model_manager.feature_names)}"
            )
        
        # Preprocess
        print("Preprocessing features with scaler and imputer...")
        processed_features = preprocess_features(features_array)
        print(f"Preprocessed shape: {processed_features.shape}\n")
        
        results = []
        
        # Predict each flow (limit 1000 for demo)
        max_flows = min(len(processed_features), 1000)
        print(f"Processing {max_flows} flows...\n")
        
        for i in range(max_flows):
            if i % 100 == 0:
                print(f"   Processing flow {i+1}/{max_flows}...")
            
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
        
        print(f"\nSuccessfully processed {max_flows} flows!")
        
        return {
            'status': 'success',
            'total_flows_uploaded': len(features_array),
            'total_flows_processed': max_flows,
            'predictions': results[:20]  # Return first 20
        }
        
    except Exception as e:
        db.rollback()
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))