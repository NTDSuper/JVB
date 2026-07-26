/**
 * S3 Upload Utility
 * 
 * Handles getting presigned URLs from the backend and uploading files directly to S3.
 * No AWS credentials are exposed on the frontend.
 */

import api from "@/lib/api";

export interface PresignedUrlResponse {
  presigned_url: string;
  object_key: string;
  fields?: Record<string, string>;
}

export interface UploadResult {
  object_key: string;
  success: boolean;
}

/**
 * Get a presigned upload URL from the backend.
 * The backend authenticates the user and generates a short-lived URL.
 */
async function getPresignedUrl(
  file: File,
  fileName?: string
): Promise<PresignedUrlResponse> {
  const res = await api.post<PresignedUrlResponse>("/upload/presigned-url", {
    content_type: file.type || "image/jpeg",
    file_name: fileName || file.name,
  });
  return res.data;
}

/**
 * Upload a file directly to S3 using a presigned URL.
 * This bypasses the backend entirely for the file upload.
 */
async function uploadToS3(
  presignedUrl: string,
  file: File
): Promise<boolean> {
  const res = await fetch(presignedUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type || "image/jpeg",
    },
  });

  if (!res.ok) {
    throw new Error(
      `S3 upload failed with status ${res.status}: ${res.statusText}`
    );
  }

  return true;
}

/**
 * Complete flow: Get presigned URL → Upload to S3 → Return object key.
 * 
 * @param file - The file to upload
 * @returns The S3 object key if successful
 * @throws Error if any step fails
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  // Step 1: Get presigned URL from backend
  const { presigned_url, object_key } = await getPresignedUrl(file);

  // Step 2: Upload directly to S3
  await uploadToS3(presigned_url, file);

  return {
    object_key,
    success: true,
  };
}

/**
 * Get the allowed image file types.
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

/**
 * Maximum file size (5MB).
 */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/**
 * Validate a file before upload.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `Invalid file type: ${file.type}. Allowed: JPEG, PNG, GIF, WebP, SVG.`;
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 5MB.`;
  }

  return null;
}