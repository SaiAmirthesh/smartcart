from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime

from app.database.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)

    transaction_code = Column(
        String,
        unique=True,
        index=True,
        nullable=False
    )

    cart_id = Column(
        Integer,
        nullable=False
    )

    total_amount = Column(
        Float,
        nullable=False
    )

    payment_status = Column(
        String,
        default="pending"
    )

    payment_method = Column(
        String,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )