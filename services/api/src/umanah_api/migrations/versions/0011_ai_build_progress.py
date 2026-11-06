"""EDU54 Workbench: finished 3D AI lessons per learner

Revision ID: 0011
Revises: 0010
Create Date: 2026-11-06
"""
from alembic import op
import sqlalchemy as sa


revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('ai_build_progress',
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('lesson', sa.String(length=80), nullable=False),
    sa.Column('done_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('user_id', 'lesson')
    )


def downgrade() -> None:
    op.drop_table('ai_build_progress')
