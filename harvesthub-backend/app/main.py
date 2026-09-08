from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.customers.router import router as customers_router
from app.categories.router import router as categories_router
from app.farmers.router import router as farmers_router
from app.products.router import router as products_router
from app.cart.router import router as cart_router
from app.checkout.router import router as checkout_router
from app.orders.router import router as orders_router
from app.webhooks.router import router as webhooks_router

app = FastAPI(title="HarvestHub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers_router, prefix="/api/v1")
app.include_router(categories_router, prefix="/api/v1")
app.include_router(farmers_router, prefix="/api/v1")
app.include_router(products_router, prefix="/api/v1")
app.include_router(cart_router, prefix="/api/v1")
app.include_router(checkout_router, prefix="/api/v1")
app.include_router(orders_router, prefix="/api/v1")
app.include_router(webhooks_router, prefix="/api/v1")

@app.get("/health")
def health():
    return {"status": "ok"}