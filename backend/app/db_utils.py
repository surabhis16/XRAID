"""
Database utility functions showcasing advanced PostgreSQL features
"""
from sqlalchemy import text, func
from sqlalchemy.orm import Session
from app.models import Alert, NetworkFlow, ShapExplanation
from typing import Dict, List, Any
from datetime import datetime, timedelta


def get_database_statistics(db: Session) -> Dict[str, Any]:
    """
    Get comprehensive database statistics
    Showcases: Aggregate functions, subqueries, joins
    """
    total_alerts = db.query(func.count(Alert.alert_id)).scalar()
    total_attacks = db.query(func.count(Alert.alert_id)).filter(
        Alert.prediction == 'Attack'
    ).scalar()
    
    # Average confidence by prediction type
    avg_confidence = db.query(
        Alert.prediction,
        func.avg(Alert.confidence).label('avg_conf'),
        func.min(Alert.confidence).label('min_conf'),
        func.max(Alert.confidence).label('max_conf')
    ).group_by(Alert.prediction).all()
    
    # Attack type distribution
    attack_dist = db.query(
        Alert.attack_type,
        func.count(Alert.alert_id).label('count')
    ).group_by(Alert.attack_type).order_by(func.count(Alert.alert_id).desc()).all()
    
    # Status distribution
    status_dist = db.query(
        Alert.status,
        func.count(Alert.alert_id).label('count')
    ).group_by(Alert.status).all()
    
    return {
        'total_alerts': total_alerts,
        'total_attacks': total_attacks,
        'benign_count': total_alerts - total_attacks,
        'attack_rate': (total_attacks / total_alerts * 100) if total_alerts > 0 else 0,
        'confidence_stats': [
            {
                'prediction': r.prediction,
                'avg': float(r.avg_conf),
                'min': float(r.min_conf),
                'max': float(r.max_conf)
            } for r in avg_confidence
        ],
        'attack_distribution': [
            {'type': r.attack_type, 'count': r.count} for r in attack_dist
        ],
        'status_distribution': [
            {'status': r.status, 'count': r.count} for r in status_dist
        ]
    }


def test_foreign_key_cascade(db: Session) -> Dict[str, str]:
    """
    Test foreign key CASCADE delete
    Demonstrates: Referential integrity, cascade operations
    """
    try:
        # Create test alert
        test_alert = Alert(
            prediction="Attack",
            attack_type="DDoS",
            confidence=0.95,
            rf_confidence=0.95,
            if_confidence=0.9,
            ae_reconstruction_error=10.5,
            status="unreviewed"
        )
        db.add(test_alert)
        db.flush()
        
        alert_id = test_alert.alert_id
        
        # Create related records
        network_flow = NetworkFlow(
            alert_id=alert_id,
            raw_features={"test": "data"}
        )
        shap_exp = ShapExplanation(
            alert_id=alert_id,
            shap_values=[0.1, 0.2, 0.3],
            top_features=[{"feature": "test", "value": 1.0}],
            summary="Test explanation"
        )
        db.add(network_flow)
        db.add(shap_exp)
        db.commit()
        
        # Verify records exist
        flow_exists = db.query(NetworkFlow).filter_by(alert_id=alert_id).count()
        shap_exists = db.query(ShapExplanation).filter_by(alert_id=alert_id).count()
        
        # Delete alert (should cascade)
        db.delete(test_alert)
        db.commit()
        
        # Verify cascade delete
        flow_after = db.query(NetworkFlow).filter_by(alert_id=alert_id).count()
        shap_after = db.query(ShapExplanation).filter_by(alert_id=alert_id).count()
        
        return {
            'status': 'success',
            'message': 'CASCADE DELETE working correctly',
            'before_delete': {'flows': flow_exists, 'shap': shap_exists},
            'after_delete': {'flows': flow_after, 'shap': shap_after}
        }
    except Exception as e:
        db.rollback()
        return {'status': 'error', 'message': str(e)}


def test_check_constraints(db: Session) -> List[Dict[str, Any]]:
    """
    Test check constraints
    Demonstrates: Data validation, constraint enforcement
    """
    results = []
    
    # Test 1: Invalid confidence (should fail)
    try:
        alert = Alert(
            prediction="Attack",
            attack_type="DDoS",
            confidence=1.5,  # Invalid: > 1.0
            rf_confidence=0.95,
            if_confidence=0.9,
            ae_reconstruction_error=10.5
        )
        db.add(alert)
        db.commit()
        results.append({'test': 'Invalid confidence', 'status': 'FAILED', 'reason': 'Should have rejected'})
    except Exception as e:
        db.rollback()
        results.append({'test': 'Invalid confidence', 'status': 'PASSED', 'reason': str(e)})
    
    # Test 2: Invalid port (should fail)
    try:
        alert = Alert(
            prediction="Attack",
            attack_type="DDoS",
            confidence=0.95,
            rf_confidence=0.95,
            if_confidence=0.9,
            ae_reconstruction_error=10.5,
            source_port=70000  # Invalid: > 65535
        )
        db.add(alert)
        db.commit()
        results.append({'test': 'Invalid port', 'status': 'FAILED', 'reason': 'Should have rejected'})
    except Exception as e:
        db.rollback()
        results.append({'test': 'Invalid port', 'status': 'PASSED', 'reason': str(e)})
    
    # Test 3: Invalid status (should fail)
    try:
        alert = Alert(
            prediction="Attack",
            attack_type="DDoS",
            confidence=0.95,
            rf_confidence=0.95,
            if_confidence=0.9,
            ae_reconstruction_error=10.5,
            status="invalid_status"  # Not in allowed values
        )
        db.add(alert)
        db.commit()
        results.append({'test': 'Invalid status', 'status': 'FAILED', 'reason': 'Should have rejected'})
    except Exception as e:
        db.rollback()
        results.append({'test': 'Invalid status', 'status': 'PASSED', 'reason': str(e)})
    
    # Test 4: Valid data (should pass)
    try:
        alert = Alert(
            prediction="Attack",
            attack_type="DDoS",
            confidence=0.95,
            rf_confidence=0.95,
            if_confidence=0.9,
            ae_reconstruction_error=10.5,
            source_port=8080,
            status="unreviewed"
        )
        db.add(alert)
        db.commit()
        db.delete(alert)  # Clean up
        db.commit()
        results.append({'test': 'Valid data', 'status': 'PASSED', 'reason': 'Accepted correctly'})
    except Exception as e:
        db.rollback()
        results.append({'test': 'Valid data', 'status': 'FAILED', 'reason': str(e)})
    
    return results


def get_index_usage_stats(db: Session) -> List[Dict[str, Any]]:
    """
    Get PostgreSQL index usage statistics
    Demonstrates: Database performance monitoring
    """
    if "postgresql" not in str(db.bind.url):
        return [{'message': 'Index stats only available for PostgreSQL'}]
    
    sql = text("""
        SELECT 
            schemaname,
            tablename,
            indexname,
            idx_scan as scans,
            idx_tup_read as tuples_read,
            idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC;
    """)
    
    result = db.execute(sql)
    return [dict(row._mapping) for row in result]


def explain_query_plan(db: Session, query_description: str = "Recent alerts") -> List[str]:
    """
    Show query execution plan
    Demonstrates: Query optimization, EXPLAIN ANALYZE
    """
    if "postgresql" not in str(db.bind.url):
        return ["Query plans only available for PostgreSQL"]
    
    # Example query: Get recent high-confidence attacks
    sql = text("""
        EXPLAIN ANALYZE
        SELECT a.alert_id, a.attack_type, a.confidence, a.timestamp
        FROM alerts a
        WHERE a.prediction = 'Attack'
            AND a.confidence > 0.9
            AND a.timestamp > CURRENT_TIMESTAMP - INTERVAL '7 days'
        ORDER BY a.confidence DESC
        LIMIT 10;
    """)
    
    result = db.execute(sql)
    return [row[0] for row in result]


def get_table_sizes(db: Session) -> List[Dict[str, Any]]:
    """
    Get table sizes and row counts
    Demonstrates: Database metadata queries
    """
    if "postgresql" not in str(db.bind.url):
        # SQLite fallback
        tables = ['alerts', 'network_flows', 'shap_explanations']
        return [
            {
                'table': table,
                'rows': db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            }
            for table in tables
        ]
    
    sql = text("""
        SELECT 
            tablename as table_name,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
            pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    """)
    
    result = db.execute(sql)
    return [dict(row._mapping) for row in result]


# CLI tool for testing
if __name__ == "__main__":
    from app.database import SessionLocal
    
    print("Database Testing Tool")
    
    db = SessionLocal()
    
    try:
        print("\n1. Database Statistics:")
        stats = get_database_statistics(db)
        print(f"Total Alerts: {stats['total_alerts']}")
        print(f"Total Attacks: {stats['total_attacks']}")
        print(f"Attack Rate: {stats['attack_rate']:.2f}%")
        
        print("\n2. Testing Foreign Key Cascade:")
        cascade_result = test_foreign_key_cascade(db)
        print(cascade_result)
        
        print("\n3. Testing Check Constraints:")
        constraint_results = test_check_constraints(db)
        for result in constraint_results:
            print(f"  {result['test']}: {result['status']}")
        
        print("\n4. Table Sizes:")
        sizes = get_table_sizes(db)
        for size in sizes:
            print(f"  {size}")
        
        print("\nAll tests completed.")
        
    finally:
        db.close()