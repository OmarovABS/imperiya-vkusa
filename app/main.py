from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.config import STATIC_DIR, CORS_ORIGINS, ADMIN_USERNAME, ADMIN_PASSWORD
from app.database import init_db, create_user, get_user_by_username
from app.auth import get_password_hash
from app.api import auth, public, admin, pages


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and create default admin user on startup."""
    await init_db()

    # Create default admin user if not exists
    existing_user = await get_user_by_username(ADMIN_USERNAME)
    if not existing_user:
        password_hash = get_password_hash(ADMIN_PASSWORD)
        await create_user(ADMIN_USERNAME, password_hash)
        print(f"Default admin user created: {ADMIN_USERNAME}")

    yield


def create_app() -> FastAPI:
    app = FastAPI(title="FoodDrop API", version="1.0.0", lifespan=lifespan)

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API routers
    app.include_router(public.router, prefix="/api")
    app.include_router(auth.router, prefix="/api")
    app.include_router(admin.router, prefix="/api")
    app.include_router(pages.router)

    # Serve the frontend.
    # /static takes care of uploaded images and the whole static tree; the
    # root-level mounts below let relative asset paths (css/, js/, img/) used
    # by the HTML pages resolve correctly both here and on a static hoster.
    app.mount("/css", StaticFiles(directory=str(STATIC_DIR / "css")), name="css")
    app.mount("/js", StaticFiles(directory=str(STATIC_DIR / "js")), name="js")
    app.mount("/img", StaticFiles(directory=str(STATIC_DIR / "img")), name="img")
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)