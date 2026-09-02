from sqlalchemy import Column, Integer, String, Float

from app.database.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)

    rfid_uid = Column(
        String,
        unique=True,
        index=True,
        nullable=False
    )

    name = Column(
        String,
        nullable=False
    )

    category = Column(
        String,
        nullable=False
    )

    price = Column(
        Float,
        nullable=False
    )

    stock = Column(
        Integer,
        default=0
    )