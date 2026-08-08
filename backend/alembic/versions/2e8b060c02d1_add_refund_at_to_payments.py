"""add refund_at column to payments

Revision ID: 2e8b060c02d1
Revises: 1e7a050a01b0
Create Date: 2026-07-22 22:13:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "2e8b060c02d1"
down_revision: Union[str, Sequence[str], None] = "1e7a050a01b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("refund_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("payments", "refund_at")
