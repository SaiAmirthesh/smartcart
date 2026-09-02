from fastapi import FastAPI

from app.database.database import Base, engine
from app.models.product import Product
from app.models.cart import Cart, CartItem
from app.models.transaction import Transaction
from app.api.products import router as product_router
from app.api.cart import router as cart_router
from app.api.transactions import router as transaction_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SmartCart API",
    description="Backend for Human-Following Smart Cart with Autonomous Billing",
    version="1.0.0"
)

app.include_router(product_router)
app.include_router(cart_router)
app.include_router(transaction_router)

@app.get("/")
def root():
    return {
        "message": "SmartCart Backend is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }