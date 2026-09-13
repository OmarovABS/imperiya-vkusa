import io
import uuid
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, status, UploadFile
from PIL import Image

from app.config import UPLOADS_DIR, MAX_IMAGE_SIZE, WEBP_QUALITY, ALLOWED_IMAGE_EXTENSIONS


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
    file_ext = Path(image_file.filename or "").suffix.lower()
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


def delete_image(image_url: Optional[str]) -> bool:
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