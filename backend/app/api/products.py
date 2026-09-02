from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.database import get_db
from app.models.product import Product


router = APIRouter(
    prefix="/products",
    tags=["Products"]
)


class ProductCreate(BaseModel):
    rfid_uid: str
    name: str
    category: str
    price: float
    stock: int = 0


@router.post("/")
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db)
):
    existing_product = (
        db.query(Product)
        .filter(Product.rfid_uid == product.rfid_uid)
        .first()
    )

    if existing_product:
        raise HTTPException(
            status_code=400,
            detail="RFID UID already registered"
        )

    new_product = Product(
        rfid_uid=product.rfid_uid,
        name=product.name,
        category=product.category,
        price=product.price,
        stock=product.stock
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    return new_product


@router.get("/")
def get_products(
    db: Session = Depends(get_db)
):
    return db.query(Product).all()


@router.get("/rfid/{rfid_uid}")
def get_product_by_rfid(
    rfid_uid: str,
    db: Session = Depends(get_db)
):
    product = (
        db.query(Product)
        .filter(Product.rfid_uid == rfid_uid)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return product