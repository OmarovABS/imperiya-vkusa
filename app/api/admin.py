from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form

from app.auth import get_current_active_user
from app.database import (
    get_product_by_id, create_product, update_product, delete_product,
    get_all_orders, get_order_by_id, update_order_status, delete_order,
    delete_all_orders,
)
from app.schemas import (
    ProductResponse, OrderResponse, MessageResponse, OrderStatusUpdate,
)
from app.services import cache
from app.services.images import process_image, delete_image

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product_admin(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    price: int = Form(...),
    weight: Optional[int] = Form(None),
    category: str = Form(...),
    is_available: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new product (admin only)."""
    # Process image if provided: uploaded file takes priority over URL
    if image:
        image_url = process_image(image)

    # Create product
    product_id = await create_product(
        name=name,
        description=description,
        price=price,
        weight=weight,
        category=category,
        image_url=image_url,
        is_available=is_available
    )

    # Invalidate cache
    cache.invalidate()

    # Get created product
    product = await get_product_by_id(product_id)
    if product:
        return ProductResponse(**product)

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to create product"
    )


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product_admin(
    product_id: int,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    price: Optional[int] = Form(None),
    weight: Optional[int] = Form(None),
    category: Optional[str] = Form(None),
    is_available: Optional[bool] = Form(None),
    image: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_active_user)
):
    """Update a product (admin only)."""
    # Check if product exists
    existing_product = await get_product_by_id(product_id)
    if not existing_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Handle image: uploaded file takes priority over URL
    new_image_url = None
    if image:
        # Delete old image
        delete_image(existing_product.get("image_url"))
        # Process new image
        new_image_url = process_image(image)
    elif image_url is not None:
        old_url = existing_product.get("image_url")
        if old_url != image_url:
            # Old image replaced by a different reference
            delete_image(old_url)
        new_image_url = image_url

    # Update product
    updated = await update_product(
        product_id=product_id,
        name=name,
        description=description,
        price=price,
        weight=weight,
        category=category,
        image_url=new_image_url,
        is_available=is_available
    )

    if updated:
        # Invalidate cache
        cache.invalidate()

        # Get updated product
        product = await get_product_by_id(product_id)
        if product:
            return ProductResponse(**product)

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to update product"
    )


@router.delete("/products/{product_id}", response_model=MessageResponse)
async def delete_product_admin(
    product_id: int,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete a product (admin only)."""
    # Check if product exists
    product = await get_product_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Delete image
    if product.get("image_url"):
        delete_image(product["image_url"])

    # Delete product
    deleted = await delete_product(product_id)

    if deleted:
        # Invalidate cache
        cache.invalidate()
        return MessageResponse(message="Product deleted successfully")

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to delete product"
    )


@router.get("/orders", response_model=list[OrderResponse])
async def get_orders_admin(
    current_user: dict = Depends(get_current_active_user)
):
    """Get all orders (admin only)."""
    return await get_all_orders()


@router.patch("/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status_admin(
    order_id: int,
    payload: OrderStatusUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update order status (admin only)."""
    if payload.status not in ("pending", "completed"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Status must be 'pending' or 'completed'"
        )

    existing_order = await get_order_by_id(order_id)
    if not existing_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    await update_order_status(order_id, payload.status)

    order = await get_order_by_id(order_id)
    if order:
        return OrderResponse(**order)

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to update order"
    )


@router.delete("/orders/{order_id}", response_model=MessageResponse)
async def delete_order_admin(
    order_id: int,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete an order (admin only)."""
    deleted = await delete_order(order_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    return MessageResponse(message="Order deleted successfully")


@router.delete("/orders", response_model=MessageResponse)
async def clear_orders_admin(
    current_user: dict = Depends(get_current_active_user)
):
    """Delete all orders (admin only)."""
    deleted = await delete_all_orders()
    return MessageResponse(message=f"Deleted {deleted} orders")