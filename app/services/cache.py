import time
from typing import Optional

from app.config import PRODUCTS_CACHE_TTL
from app.database import get_all_products

_products_cache: Optional[list] = None
_cache_timestamp: float = 0


def invalidate():
    """Invalidate the products cache."""
    global _products_cache, _cache_timestamp
    _products_cache = None
    _cache_timestamp = 0


def _is_valid() -> bool:
    """Check if the cache is still valid."""
    return time.time() - _cache_timestamp < PRODUCTS_CACHE_TTL


async def get_products() -> list:
    """Get products from cache or database."""
    global _products_cache, _cache_timestamp

    if _products_cache and _is_valid():
        return _products_cache

    products = await get_all_products()
    _products_cache = products
    _cache_timestamp = time.time()
    return products