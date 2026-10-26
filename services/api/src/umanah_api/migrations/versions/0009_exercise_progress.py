"""School Library practice exercise progress

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-01
"""
from alembic import op
import sqlalchemy as sa


revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('exercise_progress',
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('node_id', sa.String(length=32), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('recent', sa.String(length=40), nullable=False),
    sa.Column('attempts', sa.Integer(), nullable=False),
    sa.Column('correct', sa.Integer(), nullable=False),
    sa.Column('mastered_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('user_id', 'node_id')
    )


def downgrade() -> None:
    op.drop_table('exercise_progress')
