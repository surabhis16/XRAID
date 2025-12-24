"""
Enhanced models with validators and constraints

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '3051641557c5'
down_revision = '5f3d5465a8ab'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns with defaults for existing rows
    
    # 1. Add updated_at with a default value first (nullable)
    op.add_column('alerts', sa.Column('updated_at', sa.DateTime(), nullable=True))
    
    # 2. Set existing rows to have timestamp = updated_at
    op.execute("UPDATE alerts SET updated_at = timestamp WHERE updated_at IS NULL")
    
    # 3. Now make it NOT NULL
    op.alter_column('alerts', 'updated_at', nullable=False)
    
    # Add other new columns with nullable=True or defaults
    op.add_column('alerts', sa.Column('protocol', sa.String(length=10), nullable=True))
    op.add_column('alerts', sa.Column('severity_score', sa.Float(), nullable=True))
    op.add_column('alerts', sa.Column('analyst_notes', sa.Text(), nullable=True))
    op.add_column('alerts', sa.Column('reviewed_by', sa.String(length=100), nullable=True))
    op.add_column('alerts', sa.Column('reviewed_at', sa.DateTime(), nullable=True))
    
    # Add columns to network_flows
    op.add_column('network_flows', sa.Column('total_packets', sa.Integer(), nullable=True))
    op.add_column('network_flows', sa.Column('total_bytes', sa.Integer(), nullable=True))
    op.add_column('network_flows', sa.Column('flow_duration', sa.Float(), nullable=True))
    op.add_column('network_flows', sa.Column('created_at', sa.DateTime(), nullable=True))
    
    # Set created_at for existing rows
    op.execute("UPDATE network_flows SET created_at = NOW() WHERE created_at IS NULL")
    op.alter_column('network_flows', 'created_at', nullable=False)
    
    # Add column to shap_explanations
    op.add_column('shap_explanations', sa.Column('model_version', sa.String(length=20), nullable=True))
    
    # Create new indexes
    op.create_index('idx_attack_type_severity', 'alerts', ['attack_type', 'severity_score'], unique=False)
    op.create_index('idx_source_dest_ip', 'alerts', ['source_ip', 'destination_ip'], unique=False)
    op.create_index('idx_network_flow_created', 'network_flows', ['created_at'], unique=False)
    
    # Add new check constraints (only if they don't exist)
    try:
        op.create_check_constraint('check_severity_range', 'alerts', 
            'severity_score IS NULL OR (severity_score >= 0.0 AND severity_score <= 100.0)')
    except:
        pass  # Constraint might already exist
    
    try:
        op.create_check_constraint('check_review_consistency', 'alerts',
            "(status = 'unreviewed') OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)")
    except:
        pass
    
    try:
        op.create_check_constraint('check_packets_positive', 'network_flows',
            'total_packets IS NULL OR total_packets >= 0')
    except:
        pass
    
    try:
        op.create_check_constraint('check_bytes_positive', 'network_flows',
            'total_bytes IS NULL OR total_bytes >= 0')
    except:
        pass
    
    try:
        op.create_check_constraint('check_duration_positive', 'network_flows',
            'flow_duration IS NULL OR flow_duration >= 0')
    except:
        pass
    
    # Modify existing columns if needed (make source_ip and destination_ip indexed)
    op.create_index(op.f('ix_alerts_source_ip'), 'alerts', ['source_ip'], unique=False)
    op.create_index(op.f('ix_alerts_destination_ip'), 'alerts', ['destination_ip'], unique=False)


def downgrade():
    # Remove indexes
    op.drop_index(op.f('ix_alerts_destination_ip'), table_name='alerts')
    op.drop_index(op.f('ix_alerts_source_ip'), table_name='alerts')
    op.drop_index('idx_network_flow_created', table_name='network_flows')
    op.drop_index('idx_source_dest_ip', table_name='alerts')
    op.drop_index('idx_attack_type_severity', table_name='alerts')
    
    # Remove check constraints
    op.drop_constraint('check_duration_positive', 'network_flows', type_='check')
    op.drop_constraint('check_bytes_positive', 'network_flows', type_='check')
    op.drop_constraint('check_packets_positive', 'network_flows', type_='check')
    op.drop_constraint('check_review_consistency', 'alerts', type_='check')
    op.drop_constraint('check_severity_range', 'alerts', type_='check')
    
    # Remove columns
    op.drop_column('shap_explanations', 'model_version')
    op.drop_column('network_flows', 'created_at')
    op.drop_column('network_flows', 'flow_duration')
    op.drop_column('network_flows', 'total_bytes')
    op.drop_column('network_flows', 'total_packets')
    op.drop_column('alerts', 'reviewed_at')
    op.drop_column('alerts', 'reviewed_by')
    op.drop_column('alerts', 'analyst_notes')
    op.drop_column('alerts', 'severity_score')
    op.drop_column('alerts', 'protocol')
    op.drop_column('alerts', 'updated_at')