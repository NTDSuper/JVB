import logging
import os
from uuid import uuid4
from datetime import datetime, timedelta, timezone
from botocore.config import Config
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class S3Service:
    """
    Service for interacting with AWS S3.
    Handles presigned URL generation, object deletion, and public URL construction.
    """

    def __init__(self):
        self.bucket = os.getenv("AWS_S3_BUCKET")
        self.region = os.getenv("AWS_REGION", "ap-southeast-2")
        self.access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
        self.secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.presigned_expire = int(os.getenv("AWS_PRESIGNED_EXPIRE", "300"))

        print(self.region)

        self.client = boto3.client(
            "s3",
            region_name="ap-southeast-2",
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            endpoint_url="https://s3.ap-southeast-2.amazonaws.com",
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "virtual"},
            ),
        )

        # Public bucket URL for constructing image URLs
        self.public_url_base = f"https://{self.bucket}.s3.{self.region}.amazonaws.com"

    def generate_object_key(self, original_filename: str | None = None) -> str:
        """
        Generate a unique object key for an image.
        Format: products/{uuid4}[:ext]
        """
        unique_id = str(uuid4())
        if original_filename and "." in original_filename:
            ext = original_filename.rsplit(".", 1)[1].lower()
            # Only allow common image extensions
            if ext in ("jpg", "jpeg", "png", "gif", "webp", "svg"):
                return f"products/{unique_id}.{ext}"
        return f"products/{unique_id}"

    def generate_presigned_upload_url(
        self, object_key: str, content_type: str = "image/jpeg"
    ) -> dict:
        """
        Generate a presigned URL for uploading an object to S3.

        Args:
            object_key: The S3 object key (path) to upload to.
            content_type: The MIME type of the file being uploaded.

        Returns:
            Dict containing 'presigned_url' and optionally 'fields' for form upload.
        """
        try:
            url = self.client.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": object_key,
                    "ContentType": content_type,
                },
                ExpiresIn=self.presigned_expire,
                HttpMethod="PUT",
            )
            logger.info(
                "Generated presigned PUT URL for key=%s, expires=%ds",
                object_key,
                self.presigned_expire,
            )
            return {"presigned_url": url}
        except ClientError as e:
            logger.exception("Failed to generate presigned upload URL: %s", e)
            raise

    def generate_presigned_get_url(self, object_key: str) -> str:
        """
        Generate a presigned URL for viewing/downloading an object from S3.

        Args:
            object_key: The S3 object key (path) to retrieve.

        Returns:
            Presigned GET URL string.
        """
        try:
            url = self.client.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": object_key,
                },
                ExpiresIn=3600,  # 1 hour for viewing
                HttpMethod="GET",
            )
            logger.info("Generated presigned GET URL for key=%s", object_key)
            return url
        except ClientError as e:
            logger.exception("Failed to generate presigned GET URL: %s", e)
            raise

    def get_public_url(self, object_key: str) -> str:
        """
        Construct a public URL for an object in S3.
        Works only if the bucket allows public read access.

        Args:
            object_key: The S3 object key.

        Returns:
            Public URL string.
        """
        return f"{self.public_url_base}/{object_key}"

    def delete_object(self, object_key: str) -> bool:
        """
        Delete an object from S3.

        Args:
            object_key: The S3 object key to delete.

        Returns:
            True if deleted successfully, False if object doesn't exist.
        """
        if not object_key:
            return False
        try:
            self.client.delete_object(Bucket=self.bucket, Key=object_key)
            logger.info("Deleted S3 object: key=%s", object_key)
            return True
        except ClientError as e:
            # If the object doesn't exist, treat as success
            if e.response["Error"]["Code"] == "NoSuchKey":
                logger.warning("S3 object not found for deletion: key=%s", object_key)
                return True
            logger.exception("Failed to delete S3 object: key=%s", object_key)
            raise

    def delete_objects(self, object_keys: list[str]) -> bool:
        """
        Delete multiple objects from S3 in a single request.

        Args:
            object_keys: List of S3 object keys to delete.

        Returns:
            True if all deleted successfully.
        """
        if not object_keys:
            return True
        try:
            objects = [{"Key": key} for key in object_keys if key]
            if not objects:
                return True
            self.client.delete_objects(
                Bucket=self.bucket,
                Delete={"Objects": objects, "Quiet": True},
            )
            logger.info("Deleted S3 objects: keys=%s", object_keys)
            return True
        except ClientError as e:
            logger.exception("Failed to delete S3 objects: %s", e)
            raise
