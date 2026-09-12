import asyncio
import aiosqlite
from pathlib import Path

from database import init_db

BASE_DIR = Path(__file__).parent
DATABASE_PATH = BASE_DIR / "delivery.db"

SAMPLE_PRODUCTS = [
    # Пиццы
    {
        "name": "Пепперони Классик",
        "description": "Томатный соус, моцарелла, пепперони",
        "price": 590,
        "weight": 450,
        "category": "pizza",
        "image_url": "img/dishes/pepperoni.jpg",
        "is_available": True
    },
    {
        "name": "Маргарита",
        "description": "Томатный соус, моцарелла, свежий базилик",
        "price": 490,
        "weight": 400,
        "category": "pizza",
        "image_url": "img/dishes/margherita.jpg",
        "is_available": True
    },
    {
        "name": "Четыре сыра",
        "description": "Моцарелла, пармезан, горгонзола, чеддер",
        "price": 650,
        "weight": 480,
        "category": "pizza",
        "image_url": "img/dishes/four-cheese.jpg",
        "is_available": True
    },
    {
        "name": "Гавайская",
        "description": "Томатный соус, моцарелла, ананас, курица",
        "price": 620,
        "weight": 460,
        "category": "pizza",
        "image_url": "img/dishes/hawaiian.jpg",
        "is_available": True
    },
    
    # Роллы
    {
        "name": "Филадельфия Классик",
        "description": "Лосось, сливочный сыр, огурец, нори",
        "price": 450,
        "weight": 250,
        "category": "rolls",
        "image_url": "img/dishes/philadelphia.jpg",
        "is_available": True
    },
    {
        "name": "Дракон Ролл",
        "description": "Угорь, авокадо, огурец, икра",
        "price": 520,
        "weight": 280,
        "category": "rolls",
        "image_url": "img/dishes/dragon-roll.jpg",
        "is_available": True
    },
    {
        "name": "Калифорния",
        "description": "Краб, авокадо, огурец, икра",
        "price": 420,
        "weight": 240,
        "category": "rolls",
        "image_url": "img/dishes/california.jpg",
        "is_available": True
    },
    {
        "name": "Запечённый ролл с лососем",
        "description": "Лосось, сливочный сыр, запечённый соус",
        "price": 480,
        "weight": 260,
        "category": "rolls",
        "image_url": "img/dishes/baked-salmon-roll.jpg",
        "is_available": True
    },
    
    # Бургеры
    {
        "name": "Чизбургер",
        "description": "Говяжья котлета, чеддер, соус, овощи",
        "price": 390,
        "weight": 350,
        "category": "burgers",
        "image_url": "img/dishes/cheeseburger.jpg",
        "is_available": True
    },
    {
        "name": "Двойной Чизбургер",
        "description": "Две говяжьи котлеты, двойной чеддер, соус",
        "price": 490,
        "weight": 450,
        "category": "burgers",
        "image_url": "img/dishes/double-cheeseburger.jpg",
        "is_available": True
    },
    {
        "name": "Острый Бургер",
        "description": "Говяжья котлета, халапеньо, острый соус",
        "price": 420,
        "weight": 380,
        "category": "burgers",
        "image_url": "img/dishes/spicy-burger.jpg",
        "is_available": True
    },
    
    # Закуски
    {
        "name": "Картофель фри",
        "description": "Хрустящий картофель с соусом",
        "price": 190,
        "weight": 150,
        "category": "snacks",
        "image_url": "img/dishes/fries.jpg",
        "is_available": True
    },
    {
        "name": "Крылья BBQ",
        "description": "Сочные куриные крылья в соусе BBQ",
        "price": 350,
        "weight": 300,
        "category": "snacks",
        "image_url": "img/dishes/bbq-wings.jpg",
        "is_available": True
    },
    {
        "name": "Сырные палочки",
        "description": "Хрустящие сырные палочки с моцареллой",
        "price": 290,
        "weight": 200,
        "category": "snacks",
        "image_url": "img/dishes/cheese-sticks.jpg",
        "is_available": True
    },
    {
        "name": "Наггетсы",
        "description": "Куриные наггетсы с соусом",
        "price": 250,
        "weight": 180,
        "category": "snacks",
        "image_url": "img/dishes/nuggets.jpg",
        "is_available": True
    }
]


async def seed_database():
    """Seed the database with sample products."""
    # Ensure tables exist (idempotent)
    await init_db()

    conn = await aiosqlite.connect(DATABASE_PATH)
    conn.row_factory = aiosqlite.Row
    
    # Check if products already exist
    cursor = await conn.execute("SELECT COUNT(*) as count FROM products")
    row = await cursor.fetchone()
    if row["count"] > 0:
        print(f"Database already has {row['count']} products. Skipping seed.")
        await conn.close()
        return
    
    # Insert sample products
    for product in SAMPLE_PRODUCTS:
        await conn.execute(
            """INSERT INTO products 
               (name, description, price, weight, category, image_url, is_available)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                product["name"],
                product["description"],
                product["price"],
                product["weight"],
                product["category"],
                product["image_url"],
                product["is_available"]
            )
        )
    
    await conn.commit()
    await conn.close()
    print(f"Successfully seeded {len(SAMPLE_PRODUCTS)} products into the database.")


if __name__ == "__main__":
    asyncio.run(seed_database())
