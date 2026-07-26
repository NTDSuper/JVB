import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.users_model import User
from routers.auth import get_current_user
from schemas.s3_schema import PresignedUrlRequest, PresignedUrlResponse
from services.auth_service import AuthService
from services.s3_services import S3Service

router = APIRouter(prefix="/api/upload", tags=["Upload"])
logger = logging.getLogger(__name__)

s3_service = S3Service()


@router.post("/presigned-url", response_model=PresignedUrlResponse)
def get_presigned_upload_url(
    payload: PresignedUrlRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),  # noqa: ARG001
):
    """
    Generate a presigned URL for uploading an image directly to S3.

    This API only:
    1. Authenticates the user
    2. Generates a unique object key
    3. Creates a presigned PUT URL with short expiration
    4. Returns the URL and object key

    It does NOT upload files or store anything in the database.
    """
    # Check permission - only users with product:create or product:update can upload
    user_perms = AuthService.get_permission_codes(current_user)
    if "product:create" not in user_perms and "product:update" not in user_perms:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: 'product:create' or 'product:update' required.",
        )

    # Validate content type
    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
    }
    if payload.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid content type. Allowed: {', '.join(sorted(allowed_types))}",
        )

    # Generate unique object key
    object_key = s3_service.generate_object_key(payload.file_name)

    # Generate presigned upload URL
    result = s3_service.generate_presigned_upload_url(object_key, payload.content_type)

    logger.info(
        "Presigned URL generated for user=%s object_key=%s",
        current_user.username,
        object_key,
    )

    return PresignedUrlResponse(
        presigned_url=result["presigned_url"],
        object_key=object_key,
        fields=result.get("fields"),
    )