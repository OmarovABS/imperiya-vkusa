from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.config import STATIC_DIR

router = APIRouter(tags=["pages"])


@router.get("/")
async def root():
    """Serve the storefront."""
    return FileResponse(str(STATIC_DIR / "index.html"))


@router.get("/admin.html")
async def admin_page():
    """Serve the admin panel."""
    return FileResponse(str(STATIC_DIR / "admin.html"))


@router.get("/privacy.html")
async def privacy_page():
    """Serve the privacy policy page."""
    return FileResponse(str(STATIC_DIR / "privacy.html"))


@router.get("/terms.html")
async def terms_page():
    """Serve the terms of service page."""
    return FileResponse(str(STATIC_DIR / "terms.html"))


@router.get("/manifest.webmanifest")
async def web_manifest():
    """Serve the PWA manifest."""
    return FileResponse(
        str(STATIC_DIR / "manifest.webmanifest"),
        media_type="application/manifest+json"
    )


@router.get("/api")
async def api_root():
    """API info endpoint."""
    return {"message": "Imperiya Vkusa API", "version": "1.0.0"}