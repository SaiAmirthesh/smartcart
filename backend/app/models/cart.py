from sqlalchemy import Column, Integer, String, Float, ForeignKey

from app.database.database import Base


class Cart(Base):
    __tablename__ = "carts"

    id = Column(Integer, primary_key=True, index=True)

    cart_code = Column(
        String,
        unique=True,
        index=True,
        nullable=False
    )

    status = Column(
        String,
        default="active"
    )


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)

    cart_id = Column(
        Integer,
        ForeignKey("carts.id"),
        nullable=False
    )

    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=False
    )

    quantity = Column(
        Integer,
        default=1
    )

    price = Column(
        Float,
        nullable=False
    )