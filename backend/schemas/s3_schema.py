from pydantic import BaseModel
from typing import Optional


class PresignedUrlRequest(BaseModel):
    """Request to get a presigned URL for uploading an image."""
    content_type: str = "image/jpeg"
    file_name: Optional[str] = None


class PresignedUrlResponse(BaseModel):
    """Response containing the presigned URL and object key."""
    presigned_url: str
    object_key: str
    fields: Optional[dict] = None


class PresignedGetUrlResponse(BaseModel):
    """Response containing a presigned GET URL for viewing an image."""
    presigned_url: str
    object_key: str