"""add soft delete columns to products and users

Revision ID: 3a5b8c9d0e1f
Revises: 7617f4a7858b
Create Date: 2026-07-04 01:46:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "3a5b8c9d0e1f"
down_revision: Union[str, None] = "7617f4a7858b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add deleted_at column to products table
    op.add_column("products", sa.Column("deleted_at", sa.DateTime(), nullable=True))

    # Add deleted_at column to users table
    op.add_column("users", sa.Column("deleted_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    # Remove deleted_at column from products table
    op.drop_column("products", "deleted_at")

    # Remove deleted_at column from users table
    op.drop_column("users", "deleted_at")
