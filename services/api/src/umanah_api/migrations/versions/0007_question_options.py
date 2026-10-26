"""choice questions

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-01
"""
from alembic import op
import sqlalchemy as sa


revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('questions') as b:
        b.add_column(sa.Column('options', sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('questions') as b:
        b.drop_column('options')
