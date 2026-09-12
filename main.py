from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from typing import Optional
from pathlib import Path
from contextlib import asynccontextmanager
import uuid

from config import (
    UPLOADS_DIR, STATIC_DIR, CORS_ORIGINS,
    MAX_IMAGE_SIZE, WEBP_QUALITY, ALLOWED_IMAGE_EXTENSIONS,
    PRODUCTS_CACHE_TTL, ADMIN_USERNAME, ADMIN_PASSWORD, BASE_DIR
)
from database import (
    init_db, create_user, get_user_by_username,
    get_all_products, get_product_by_id, create_product,
    update_product, delete_product, create_order, get_all_orders,
    get_order_by_id, update_order_status, delete_order, delete_all_orders
)
from schemas import (
    ProductResponse,
    OrderCreate, OrderResponse, Token, MessageResponse, OrderStatusUpdate
)
from auth import (
    get_password_hash, authenticate_user, create_access_token,
    get_current_active_user
)
from PIL import Image
import io
import time


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and create default admin user on startup."""
    await init_db()

    # Create default admin user if not exists
    existing_user = await get_user_by_username(ADMIN_USERNAME)
    if not existing_user:
        password_hash = get_password_hash(ADMIN_PASSWORD)
        await create_user(ADMIN_USERNAME, password_hash)
        print(f"Default admin user created: {ADMIN_USERNAME} / {ADMIN_PASSWORD}")
    else:
        print("Admin user already exists")
    
    yield


app = FastAPI(title="Imperiya Vkusa API", version="1.0.0", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (uploaded product photos)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Mount frontend assets and serve the site itself, so the whole project
# (site + admin panel + API) runs from a single `python main.py`
app.mount("/css", StaticFiles(directory=str(BASE_DIR / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(BASE_DIR / "js")), name="js")
app.mount("/img", StaticFiles(directory=str(BASE_DIR / "img")), name="img")

# Cache for products
_products_cache: Optional[list] = None
_cache_timestamp: float = 0


def invalidate_cache():
    """Invalidate the products cache."""
    global _products_cache, _cache_timestamp
    _products_cache = None
    _cache_timestamp = 0


def is_cache_valid() -> bool:
    """Check if the cache is still valid."""
    return time.time() - _cache_timestamp < PRODUCTS_CACHE_TTL


async def get_cached_products() -> list:
    """Get products from cache or database."""
    global _products_cache, _cache_timestamp
    
    if _products_cache and is_cache_valid():
        return _products_cache
    
    products = await get_all_products()
    _products_cache = products
    _cache_timestamp = time.time()
    return products


def process_image(image_file: UploadFile) -> str:
    """Process and optimize image to WebP format."""
    # Validate file size
    content = image_file.file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image size exceeds maximum of {MAX_IMAGE_SIZE // (1024*1024)}MB"
        )
    
    # Validate file extension
    file_ext = Path(image_file.filename).suffix.lower()
    if file_ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid image format. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )
    
    # Open and convert image
    try:
        img = Image.open(io.BytesIO(content))
        
        # Convert RGBA to RGB if necessary
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        
        # Generate unique filename
        filename = f"{uuid.uuid4().hex}.webp"
        filepath = UPLOADS_DIR / filename
        
        # Save optimized WebP
        img.save(filepath, 'WEBP', quality=WEBP_QUALITY, optimize=True)
        
        # Return relative path
        return f"/static/uploads/{filename}"
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process image: {str(e)}"
        )


def delete_image(image_url: str) -> bool:
    """Delete image from disk."""
    if not image_url or not image_url.startswith("/static/uploads/"):
        return False
    
    filename = image_url.replace("/static/uploads/", "")
    filepath = UPLOADS_DIR / filename
    
    if filepath.exists():
        try:
            filepath.unlink()
            return True
        except Exception:
            return False
    
    return False


async def send_telegram_notification(order_data: dict):
    """Send order notification to Telegram (stub for future implementation)."""
    # TODO: Implement actual Telegram notification
    # Example implementation:
    # message = f"New order!\nName: {order_data['customer_name']}\nPhone: {order_data['phone']}\nAddress: {order_data['address']}\nTotal: {order_data['total_price']}₽"
    # async with httpx.AsyncClient() as client:
    #     await client.post(
    #         f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
    #         json={"chat_id": TELEGRAM_CHAT_ID, "text": message}
    #     )
    pass


# Public endpoints
@app.get("/api/products", response_model=list[ProductResponse])
async def get_products():
    """Get all products with caching."""
    products = await get_cached_products()
    return products


@app.post("/api/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
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


# Auth endpoints
@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login and get access token."""
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer"}


# Admin endpoints
@app.post("/api/admin/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
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
    invalidate_cache()
    
    # Get created product
    product = await get_product_by_id(product_id)
    if product:
        return ProductResponse(**product)
    
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to create product"
    )


@app.put("/api/admin/products/{product_id}", response_model=ProductResponse)
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
        invalidate_cache()
        
        # Get updated product
        product = await get_product_by_id(product_id)
        if product:
            return ProductResponse(**product)
    
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to update product"
    )


@app.delete("/api/admin/products/{product_id}", response_model=MessageResponse)
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
        invalidate_cache()
        return MessageResponse(message="Product deleted successfully")
    
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to delete product"
    )


@app.get("/api/admin/orders", response_model=list[OrderResponse])
async def get_orders_admin(
    current_user: dict = Depends(get_current_active_user)
):
    """Get all orders (admin only)."""
    orders = await get_all_orders()
    return orders


@app.patch("/api/admin/orders/{order_id}/status", response_model=OrderResponse)
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


@app.delete("/api/admin/orders/{order_id}", response_model=MessageResponse)
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


@app.delete("/api/admin/orders", response_model=MessageResponse)
async def clear_orders_admin(
    current_user: dict = Depends(get_current_active_user)
):
    """Delete all orders (admin only)."""
    deleted = await delete_all_orders()
    return MessageResponse(message=f"Deleted {deleted} orders")


@app.get("/")
async def root():
    """Serve the storefront."""
    return FileResponse(str(BASE_DIR / "index.html"))


@app.get("/admin.html")
async def admin_page():
    """Serve the admin panel."""
    return FileResponse(str(BASE_DIR / "admin.html"))


@app.get("/api")
async def api_root():
    """API info endpoint."""
    return {"message": "Imperiya Vkusa API", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
