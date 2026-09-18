# FoodDrop - Food Delivery Platform

A modern full-stack food delivery application built with FastAPI, featuring a responsive frontend and admin panel.

## 🚀 Features

- **Product Catalog**: Browse and filter food items by category
- **Order Management**: Create and track orders with real-time status updates
- **Admin Panel**: Full CRUD operations for products and order management
- **Image Processing**: Automatic WebP conversion and optimization
- **JWT Authentication**: Secure admin access with OAuth2
- **Caching**: In-memory caching for improved performance
- **Responsive Design**: Mobile-friendly interface with PWA support

## 🛠 Tech Stack

### Backend
- **FastAPI** - Modern, fast web framework for building APIs
- **aiosqlite** - Asynchronous SQLite driver
- **Pydantic** - Data validation using Python type annotations
- **python-jose** - JWT token handling
- **passlib** - Password hashing with bcrypt
- **Pillow** - Image processing and optimization
- **httpx** - Async HTTP client

### Frontend
- **Vanilla JavaScript** - No framework dependencies
- **CSS3** - Modern styling with responsive design
- **WebP** - Optimized image format

### Database
- **SQLite** - Lightweight, file-based database with async operations

## 📦 Installation

### Prerequisites
- Python 3.8 or higher
- pip package manager

### Setup

1. Clone the repository:
```bash
git clone https://github.com/OmarovABS/imperiya-vkusa.git
cd imperiya-vkusa
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:

**Option 1 (Recommended):**
```bash
python run.py
```
This script starts the backend and automatically opens the site in your browser.

**Option 2 (Windows):**
```bash
start.bat
```
Simply double-click the `start.bat` file.

**Option 3 (Manual):**
```bash
python -m app.main
```

Or with uvicorn:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### Access Points
- **Website**: `http://localhost:8001/`
- **Admin Panel**: `http://localhost:8001/admin.html`
- **API Documentation**: `http://localhost:8001/docs`

## ⚙️ Configuration

All settings are located in `app/config.py`. For production, use environment variables:

### Security (Change in Production!)
```bash
export SECRET_KEY="your-secret-key-min-32-chars"
export ADMIN_USERNAME="your_admin_username"
export ADMIN_PASSWORD="your_secure_password"
```

### Telegram Notifications (Optional)
```bash
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="your_chat_id"
```

### Image Settings
- `MAX_IMAGE_SIZE`: Maximum image size (default: 5MB)
- `WEBP_QUALITY`: WebP quality (default: 85)

### CORS
Configure allowed origins via environment variable:
```bash
export CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
```

## 📡 API Endpoints

### Public Endpoints

#### `GET /api/products`
Get all products (with caching)

**Response:**
```json
[
  {
    "id": 1,
    "name": "Philadelphia Roll",
    "description": "Rice, nori, salmon, cream cheese",
    "price": 450,
    "weight": 250,
    "category": "Rolls",
    "image_url": "/static/uploads/abc123.webp",
    "is_available": true,
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00"
  }
]
```

#### `POST /api/orders`
Create a new order

**Request Body:**
```json
{
  "customer_name": "Ivan Ivanov",
  "phone": "+79001234567",
  "address": "Pushkin St. 10, Apt. 5",
  "items": [
    {
      "product_id": 1,
      "product_name": "Philadelphia Roll",
      "quantity": 2,
      "price": 450
    }
  ]
}
```

### Authentication

#### `POST /api/auth/login`
Login to the system (OAuth2 Password Flow)

**Request Body (form-data):**
- `username`: admin username
- `password`: admin password

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Admin Endpoints (Protected)

All admin endpoints require `Authorization: Bearer <token>` header

#### `POST /api/admin/products`
Create a new product

**Request Body (form-data):**
- `name`: product name
- `description`: product description (optional)
- `price`: price in rubles
- `weight`: weight in grams (optional)
- `category`: product category
- `is_available`: availability (default: true)
- `image`: image file (optional)

#### `PUT /api/admin/products/{id}`
Update a product

**Request Body (form-data):**
- All fields are optional
- `image`: image file (optional)

#### `DELETE /api/admin/products/{id}`
Delete a product

#### `GET /api/admin/orders`
Get all orders

#### `PUT /api/admin/orders/{id}`
Update order status

#### `DELETE /api/admin/orders/{id}`
Delete an order

## 📁 Project Structure

```
imperiya-vkusa/
├── app/
│   ├── __init__.py
│   ├── main.py               # Application entry point, CORS, routers, lifespan
│   ├── config.py             # Configuration and secrets
│   ├── database.py           # Database operations (aiosqlite)
│   ├── schemas.py            # Pydantic models
│   ├── auth.py               # Authentication (JWT, passwords)
│   ├── api/                  # API routers
│   │   ├── __init__.py
│   │   ├── public.py         # Public: product browsing, order creation
│   │   ├── auth.py           # POST /api/auth/login
│   │   ├── admin.py          # Admin: products and orders management
│   │   └── pages.py          # HTML pages and webmanifest
│   └── services/             # Business logic
│       ├── __init__.py
│       ├── cache.py          # Product caching
│       ├── images.py         # Image processing and deletion
│       └── notifications.py  # Telegram notifications (stub)
├── static/                   # Frontend assets (served via /static/...)
│   ├── index.html            # Main website
│   ├── admin.html            # Admin panel
│   ├── privacy.html          # Privacy policy
│   ├── terms.html            # Terms of service
│   ├── manifest.webmanifest  # PWA manifest
│   ├── css/                  # Stylesheets (styles.css, admin.css)
│   ├── js/                   # JavaScript (client + admin)
│   ├── img/                  # Local images (logo, dishes, icons)
│   └── uploads/              # Uploaded images (auto-created)
├── run.py                    # Server startup script with browser open
├── start.bat                 # One-click server startup (Windows)
├── requirements.txt          # Python dependencies
├── README.md
└── delivery.db               # SQLite database (auto-created)
```

## ✨ Key Features

### Product Caching
Products are cached in memory for 5 minutes (configurable in `config.py`). This reduces database load on frequent requests.

### Image Processing
- Automatic WebP conversion
- Size optimization
- Unique filename generation
- Old image cleanup on updates

### Database
- SQLite (single file `delivery.db`)
- Async operations via aiosqlite
- Automatic table creation on first run
- Default admin user auto-created

## 🔒 Security

⚠️ **Important:** Before deploying to production:

1. Set `SECRET_KEY` via environment variable (otherwise a random key is generated on each server restart, invalidating all previously issued auth tokens)
2. Set `ADMIN_USERNAME` / `ADMIN_PASSWORD` via environment variables - default values are for local development only
3. Configure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` for notifications
4. Add your real domain to `CORS_ORIGINS` if frontend will run on a separate domain/port from backend

```bash
export SECRET_KEY="generate-a-long-random-string"
export ADMIN_USERNAME="your_username"
export ADMIN_PASSWORD="complex-password"
```

## 🎯 Technical Highlights

### Security Best Practices
- **Price validation**: Order prices are fetched from the database (not from client requests) to prevent price manipulation
- **JWT authentication**: Secure token-based authentication with bcrypt password hashing
- **Environment variables**: Sensitive configuration via environment variables
- **CORS configuration**: Properly configured cross-origin resource sharing

### Code Quality
- **Async/await**: Full async architecture using FastAPI and aiosqlite
- **Type hints**: Comprehensive type annotations for better code maintainability
- **Modular structure**: Clean separation of concerns with dedicated modules for auth, database, and business logic
- **Error handling**: Proper exception handling and validation

### Performance
- **In-memory caching**: Reduces database load for frequently accessed data
- **Image optimization**: Automatic WebP conversion for faster load times
- **Async operations**: Non-blocking database operations for better concurrency

## 📝 Development Notes

The `static/img/` directory contains placeholder images. For production deployment, replace these with actual product photos or upload new images through the admin panel.

## 📄 License

MIT License
