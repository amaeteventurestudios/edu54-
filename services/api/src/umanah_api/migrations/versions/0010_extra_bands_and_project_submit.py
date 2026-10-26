"""per-student widened content bands; projects handed in to the teacher

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-10
"""
from alembic import op
import sqlalchemy as sa


revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('users') as b:
        b.add_column(sa.Column('extra_bands', sa.JSON(), nullable=False, server_default='[]'))
    with op.batch_alter_table('projects') as b:
        b.add_column(sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('projects') as b:
        b.drop_column('submitted_at')
    with op.batch_alter_table('users') as b:
        b.drop_column('extra_bands')
