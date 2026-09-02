from fastapi import FastAPI

from app.database.database import Base, engine
from app.models.product import Product
from app.api.products import router as product_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SmartCart API",
    description="Backend for Human-Following Smart Cart with Autonomous Billing",
    version="1.0.0"
)
app.include_router(product_router)

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