from fastapi import APIRouter, HTTPException, status

from app.schemas import OrderCreate, OrderResponse, ProductResponse
from app.database import (
    get_product_by_id, create_order, get_all_orders,
)
from app.services import cache
from app.services.notifications import send_telegram_notification

router = APIRouter(tags=["public"])


@router.get("/products", response_model=list[ProductResponse])
async def get_products():
    """Get all products with caching."""
    return await cache.get_products()


@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_new_order(order: OrderCreate):
    """Create a new order."""
    # Recalculate prices from the database instead of trusting the client,
    # otherwise a request could be edited to submit arbitrary (e.g. zero) prices.
    verified_items = []
    total_price = 0
    for item in order.items:
        product = await get_product_by_id(item.product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item.product_id} not found"
            )
        if not product.get("is_available"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"'{product['name']}' is no longer available"
            )
        real_price = product["price"]
        total_price += real_price * item.quantity
        verified_items.append({
            "product_id": product["id"],
            "product_name": product["name"],
            "quantity": item.quantity,
            "price": real_price,
        })

    # Create order in database
    order_id = await create_order(
        customer_name=order.customer_name,
        phone=order.phone,
        address=order.address,
        total_price=total_price,
        items=verified_items
    )

    # Get created order
    orders = await get_all_orders()
    created_order = next((o for o in orders if o["id"] == order_id), None)

    if created_order:
        # Send Telegram notification (stub)
        await send_telegram_notification(created_order)
        return OrderResponse(**created_order)

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to create order"
    )