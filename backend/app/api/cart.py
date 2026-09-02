from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.cart import Cart, CartItem
from app.models.product import Product


router = APIRouter(
    prefix="/cart",
    tags=["Cart"]
)


@router.post("/create")
def create_cart(
    db: Session = Depends(get_db)
):
    cart_count = db.query(Cart).count()

    cart = Cart(
        cart_code=f"CART-{cart_count + 1:03d}",
        status="active"
    )

    db.add(cart)
    db.commit()
    db.refresh(cart)

    return cart


@router.post("/{cart_id}/add/{rfid_uid}")
def add_product_to_cart(
    cart_id: int,
    rfid_uid: str,
    db: Session = Depends(get_db)
):

    # Check cart
    cart = db.query(Cart).filter(Cart.id == cart_id).first()

    if not cart:
        raise HTTPException(
            status_code=404,
            detail="Cart not found"
        )

    # Check product
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

    # Check whether product already exists
    item = (
        db.query(CartItem)
        .filter(
            CartItem.cart_id == cart_id,
            CartItem.product_id == product.id
        )
        .first()
    )

    if item:

        item.quantity += 1

    else:

        item = CartItem(
            cart_id=cart_id,
            product_id=product.id,
            quantity=1,
            price=product.price
        )

        db.add(item)

    db.commit()
    db.refresh(item)

    return {
        "message": "Product added to cart",
        "product": product.name,
        "quantity": item.quantity,
        "price": item.price
    }


@router.delete("/{cart_id}/remove/{rfid_uid}")
def remove_product_from_cart(
    cart_id: int,
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

    item = (
        db.query(CartItem)
        .filter(
            CartItem.cart_id == cart_id,
            CartItem.product_id == product.id
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Product is not in cart"
        )

    if item.quantity > 1:

        item.quantity -= 1

    else:

        db.delete(item)

    db.commit()

    return {
        "message": "Product removed from cart"
    }


@router.get("/{cart_id}")
def get_cart(
    cart_id: int,
    db: Session = Depends(get_db)
):

    cart = db.query(Cart).filter(Cart.id == cart_id).first()

    if not cart:
        raise HTTPException(
            status_code=404,
            detail="Cart not found"
        )

    items = (
        db.query(CartItem)
        .filter(CartItem.cart_id == cart_id)
        .all()
    )

    cart_items = []

    subtotal = 0

    for item in items:

        product = (
            db.query(Product)
            .filter(Product.id == item.product_id)
            .first()
        )

        item_total = item.price * item.quantity

        subtotal += item_total

        cart_items.append({
            "product": product.name,
            "rfid_uid": product.rfid_uid,
            "quantity": item.quantity,
            "unit_price": item.price,
            "total": item_total
        })

    return {
        "cart_id": cart.id,
        "cart_code": cart.cart_code,
        "status": cart.status,
        "items": cart_items,
        "subtotal": subtotal
    }