from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from app.database import get_db
from app.models import Alert, NetworkFlow, ShapExplanation

router = APIRouter()

class AlertResponse(BaseModel):
    alert_id: int
    timestamp: datetime
    prediction: str
    attack_type: str
    confidence: float
    status: str
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    
    class Config:
        from_attributes = True

class AlertDetailResponse(BaseModel):
    alert: AlertResponse
    shap_explanation: Dict[str, Any]
    network_flow: Dict[str, Any]

@router.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(
    limit: int = 20,
    skip: int = 0,
    attack_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get recent alerts with optional filtering"""
    query = db.query(Alert)
    
    # Filter by attack type if specified
    if attack_type:
        query = query.filter(Alert.attack_type == attack_type)
    
    alerts = query.order_by(Alert.timestamp.desc()).offset(skip).limit(limit).all()
    return alerts

@router.get("/alerts/{alert_id}", response_model=AlertDetailResponse)
async def get_alert_detail(alert_id: int, db: Session = Depends(get_db)):
    """Get detailed alert information with SHAP explanation"""
    # Get alert
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Get SHAP explanation
    shap_exp = db.query(ShapExplanation).filter(ShapExplanation.alert_id == alert_id).first()
    
    # Get network flow
    network_flow = db.query(NetworkFlow).filter(NetworkFlow.alert_id == alert_id).first()
    
    return AlertDetailResponse(
        alert=AlertResponse(
            alert_id=alert.alert_id,
            timestamp=alert.timestamp,
            prediction=alert.prediction,
            attack_type=alert.attack_type,
            confidence=alert.confidence,
            status=alert.status,
            source_ip=alert.source_ip,
            destination_ip=alert.destination_ip
        ),
        shap_explanation={
            'top_features': shap_exp.top_features if shap_exp else [],
            'summary': shap_exp.summary if shap_exp else "",
            'generated_at': shap_exp.generated_at.isoformat() if shap_exp else None,
            'shap_values': shap_exp.shap_values if shap_exp else []
        },
        network_flow=network_flow.raw_features if network_flow else {}
    )

@router.patch("/alerts/{alert_id}/status")
async def update_alert_status(
    alert_id: int,
    status: str,
    db: Session = Depends(get_db)
):
    """Update alert status"""
    valid_statuses = ["unreviewed", "investigating", "confirmed", "false_positive", "resolved"]
    
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # add reviewed_by and reviewed_at when changing status
    alert.status = status
    if status != 'unreviewed':
        from datetime import datetime, timezone
        alert.reviewed_by = 'analyst_user' 
        alert.reviewed_at = datetime.now(timezone.utc)  
    
    db.commit()
    
    return {"status": "updated", "alert_id": alert_id, "new_status": status}

@router.get("/alerts/search/by-confidence")
async def search_by_confidence(
    min_confidence: float = 0.0,
    max_confidence: float = 1.0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Search alerts by confidence range"""
    alerts = db.query(Alert).filter(
        Alert.confidence >= min_confidence,
        Alert.confidence <= max_confidence
    ).order_by(Alert.confidence.desc()).limit(limit).all()
    
    return [AlertResponse(
        alert_id=a.alert_id,
        timestamp=a.timestamp,
        prediction=a.prediction,
        attack_type=a.attack_type,
        confidence=a.confidence,
        status=a.status,
        source_ip=a.source_ip,
        destination_ip=a.destination_ip
    ) for a in alerts]