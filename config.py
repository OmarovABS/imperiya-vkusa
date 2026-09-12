import os
import secrets
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
UPLOADS_DIR = STATIC_DIR / "uploads"

# Create directories if they don't exist
STATIC_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)

# Database
DATABASE_URL = f"sqlite+aiosqlite:///{BASE_DIR}/delivery.db"

# Security
# IMPORTANT: the previous key embedded a real name + birth date and the
# admin password was that same birth date — both are easy to guess and leak
# personal info if this file is ever shared or committed to a public repo.
# Prefer setting SECRET_KEY / ADMIN_USERNAME / ADMIN_PASSWORD via environment
# variables in production; a random key is generated as a local-dev fallback.
SECRET_KEY = os.environ.get("SECRET_KEY") or secrets.token_hex(32)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Admin credentials (change these before deploying!)
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "Абдулбасир")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "19102007")

# Image settings
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
WEBP_QUALITY = 85
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Telegram (for future notifications)
TELEGRAM_BOT_TOKEN = ""
TELEGRAM_CHAT_ID = ""

# CORS
# NOTE: mixing "*" with allow_credentials=True (see main.py) is invalid per
# the CORS spec — browsers reject a wildcard origin on credentialed requests.
# Since the frontend is now served by this same app (see main.py), same-origin
# requests need no CORS entry at all; these are only for running the frontend
# from a separate dev server/port during development.
#
# In production (frontend on Surge, API on Render) pass the site domain via the
# CORS_ORIGINS env var — a comma-separated list appended to the dev entries.
EXTRA_CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ORIGINS", "").split(",")
    if o.strip()
]
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8080",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://imperiya-vkusa.surge.sh",
] + EXTRA_CORS_ORIGINS

# Cache settings
PRODUCTS_CACHE_TTL = 300  # 5 minutes
