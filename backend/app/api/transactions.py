from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.models.transaction import Transaction


router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"]
)


@router.post("/checkout/{cart_id}")
def checkout(
    cart_id: int,
    db: Session = Depends(get_db)
):

    # Find cart
    cart = (
        db.query(Cart)
        .filter(Cart.id == cart_id)
        .first()
    )

    if not cart:
        raise HTTPException(
            status_code=404,
            detail="Cart not found"
        )

    if cart.status != "active":
        raise HTTPException(
            status_code=400,
            detail="Cart is not active"
        )

    # Get cart items
    items = (
        db.query(CartItem)
        .filter(CartItem.cart_id == cart_id)
        .all()
    )

    if not items:
        raise HTTPException(
            status_code=400,
            detail="Cart is empty"
        )

    # Calculate total
    total = 0

    for item in items:
        total += item.price * item.quantity

    # Generate transaction code
    transaction_count = (
        db.query(Transaction).count()
    )

    transaction = Transaction(
        transaction_code=f"TXN-{transaction_count + 1:05d}",
        cart_id=cart_id,
        total_amount=total,
        payment_status="pending"
    )

    db.add(transaction)

    # Mark cart as checkout pending
    cart.status = "checkout_pending"

    db.commit()
    db.refresh(transaction)

    return {
        "message": "Checkout initiated",
        "transaction_code": transaction.transaction_code,
        "cart_id": cart_id,
        "total_amount": total,
        "payment_status": transaction.payment_status
    }

@router.get("/")
def get_transactions(
    db: Session = Depends(get_db)
):
    return (
        db.query(Transaction)
        .order_by(Transaction.created_at.desc())
        .all()
    )


@router.get("/{transaction_code}")
def get_transaction(
    transaction_code: str,
    db: Session = Depends(get_db)
):

    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.transaction_code == transaction_code
        )
        .first()
    )

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    return transaction