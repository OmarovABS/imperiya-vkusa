import aiosqlite
from typing import Optional, List, Dict, Any
from app.config import BASE_DIR
import json

DATABASE_PATH = BASE_DIR / "delivery.db"


async def get_db_connection() -> aiosqlite.Connection:
    """Create and return an async SQLite connection."""
    conn = await aiosqlite.connect(DATABASE_PATH)
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA encoding = 'UTF-8'")
    return conn


async def init_db():
    """Initialize database tables."""
    conn = await get_db_connection()

    await conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    await conn.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price INTEGER NOT NULL,
            weight INTEGER,
            category TEXT NOT NULL,
            image_url TEXT,
            is_available BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    await conn.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            address TEXT NOT NULL,
            total_price INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            items TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    await conn.commit()
    await conn.close()


async def create_user(username: str, password_hash: str) -> int:
    """Create a new user and return the ID."""
    conn = await get_db_connection()
    cursor = await conn.execute(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        (username, password_hash)
    )
    await conn.commit()
    user_id = cursor.lastrowid
    await conn.close()
    return user_id


async def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    """Get user by username."""
    conn = await get_db_connection()
    cursor = await conn.execute(
        "SELECT * FROM users WHERE username = ?",
        (username,)
    )
    row = await cursor.fetchone()
    await conn.close()

    if row:
        return dict(row)
    return None


async def get_all_products() -> List[Dict[str, Any]]:
    """Get all products."""
    conn = await get_db_connection()
    cursor = await conn.execute(
        "SELECT * FROM products ORDER BY category, name"
    )
    rows = await cursor.fetchall()
    await conn.close()

    return [dict(row) for row in rows]


async def get_product_by_id(product_id: int) -> Optional[Dict[str, Any]]:
    """Get product by ID."""
    conn = await get_db_connection()
    cursor = await conn.execute(
        "SELECT * FROM products WHERE id = ?",
        (product_id,)
    )
    row = await cursor.fetchone()
    await conn.close()

    if row:
        return dict(row)
    return None


async def create_product(
    name: str,
    description: str,
    price: int,
    weight: int,
    category: str,
    image_url: str,
    is_available: bool = True
) -> int:
    """Create a new product and return the ID."""
    conn = await get_db_connection()
    cursor = await conn.execute(
        """INSERT INTO products
           (name, description, price, weight, category, image_url, is_available)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (name, description, price, weight, category, image_url, is_available)
    )
    await conn.commit()
    product_id = cursor.lastrowid
    await conn.close()
    return product_id


async def update_product(
    product_id: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
    price: Optional[int] = None,
    weight: Optional[int] = None,
    category: Optional[str] = None,
    image_url: Optional[str] = None,
    is_available: Optional[bool] = None
) -> bool:
    """Update product fields."""
    conn = await get_db_connection()

    updates = []
    params = []

    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if description is not None:
        updates.append("description = ?")
        params.append(description)
    if price is not None:
        updates.append("price = ?")
        params.append(price)
    if weight is not None:
        updates.append("weight = ?")
        params.append(weight)
    if category is not None:
        updates.append("category = ?")
        params.append(category)
    if image_url is not None:
        updates.append("image_url = ?")
        params.append(image_url)
    if is_available is not None:
        updates.append("is_available = ?")
        params.append(is_available)

    if updates:
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(product_id)

        query = f"UPDATE products SET {', '.join(updates)} WHERE id = ?"
        await conn.execute(query, params)
        await conn.commit()
        await conn.close()
        return True

    await conn.close()
    return False


async def delete_product(product_id: int) -> bool:
    """Delete product by ID."""
    conn = await get_db_connection()
    cursor = await conn.execute(
        "DELETE FROM products WHERE id = ?",
        (product_id,)
    )
    await conn.commit()
    deleted = cursor.rowcount > 0
    await conn.close()
    return deleted


async def create_order(
    customer_name: str,
    phone: str,
    address: str,
    total_price: int,
    items: List[Dict[str, Any]]
) -> int:
    """Create a new order and return the ID."""
    conn = await get_db_connection()
    cursor = await conn.execute(
        """INSERT INTO orders
           (customer_name, phone, address, total_price, items)
           VALUES (?, ?, ?, ?, ?)""",
        (customer_name, phone, address, total_price, json.dumps(items))
    )
    await conn.commit()
    order_id = cursor.lastrowid
    await conn.close()
    return order_id


async def get_all_orders() -> List[Dict[str, Any]]:
    """Get all orders."""
    conn = await get_db_connection()
    cursor = await conn.execute(
        "SELECT * FROM orders ORDER BY created_at DESC"
    )
    rows = await cursor.fetchall()
    await conn.close()

    orders = []
    for row in rows:
        order = dict(row)
        order['items'] = json.loads(order['items'])
        orders.append(order)

    return orders


async def get_order_by_id(order_id: int) -> Optional[Dict[str, Any]]:
    """Get order by ID."""
    conn = await get_db_connection()
    cursor = await conn.execute(
        "SELECT * FROM orders WHERE id = ?",
        (order_id,)
    )
    row = await cursor.fetchone()
    await conn.close()

    if not row:
        return None

    order = dict(row)
    order['items'] = json.loads(order['items'])
    return order


async def update_order_status(order_id: int, status: str) -> bool:
    """Update order status."""
    conn = await get_db_connection()
    cursor = await conn.execute(
        "UPDATE orders SET status = ? WHERE id = ?",
        (status, order_id)
    )
    await conn.commit()
    updated = cursor.rowcount > 0
    await conn.close()
    return updated


async def delete_order(order_id: int) -> bool:
    """Delete an order by ID."""
    conn = await get_db_connection()
    cursor = await conn.execute(
        "DELETE FROM orders WHERE id = ?",
        (order_id,)
    )
    await conn.commit()
    deleted = cursor.rowcount > 0
    await conn.close()
    return deleted


async def delete_all_orders() -> int:
    """Delete all orders and return the number deleted."""
    conn = await get_db_connection()
    cursor = await conn.execute("DELETE FROM orders")
    await conn.commit()
    count = cursor.rowcount
    await conn.close()
    return count