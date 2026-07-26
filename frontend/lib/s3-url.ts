/**
 * S3 URL Helper
 * 
 * Constructs public URLs for S3 object keys.
 * The bucket is configured as public-read, so we can construct URLs directly.
 */

const S3_BUCKET = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || "supermarket-images-ntd";
const S3_REGION = process.env.NEXT_PUBLIC_AWS_REGION || "ap-southeast-2";
const S3_PUBLIC_URL = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`;

/**
 * Check if a string looks like an S3 object key (not a full URL).
 * S3 object keys start with "products/" or similar prefixes.
 */
export function isS3ObjectKey(path: string | null | undefined): boolean {
  if (!path) return false;
  // Object keys don't start with http:// or https://
  return !path.startsWith("http://") && !path.startsWith("https://");
}

/**
 * Convert an S3 object key to a public URL.
 * If the input is already a full URL, return it as-is.
 */
export function getS3PublicUrl(objectKey: string | null | undefined): string | null {
  if (!objectKey) return null;
  
  // If it's already a full URL, return as-is
  if (objectKey.startsWith("http://") || objectKey.startsWith("https://")) {
    return objectKey;
  }
  console.log(`${S3_PUBLIC_URL}/${objectKey}`)
  // Construct public URL from object key
  return `${S3_PUBLIC_URL}/${objectKey}`;
}

/**
 * Get the S3 public URL base.
 */
export function getS3BaseUrl(): string {
  return S3_PUBLIC_URL;
}