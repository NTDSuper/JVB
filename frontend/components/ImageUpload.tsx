"use client";

import { useState, useRef, useCallback } from "react";
import { uploadImage, validateImageFile, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/lib/s3";
import { getS3PublicUrl } from "@/lib/s3-url";

interface ImageUploadProps {
  /** Current image URL/object key (for editing) */
  currentImage?: string | null;
  /** Whether this is an S3 object key or a regular URL */
  isObjectKey?: boolean;
  /** Callback when upload succeeds - receives the S3 object key */
  onUploadSuccess: (objectKey: string) => void;
  /** Callback when upload fails */
  onUploadError?: (error: string) => void;
  /** Callback when upload starts */
  onUploadStart?: () => void;
  /** Whether the upload is disabled */
  disabled?: boolean;
}

export default function ImageUpload({
  currentImage,
  isObjectKey = true,
  onUploadSuccess,
  onUploadError,
  onUploadStart,
  disabled = false,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Determine the display image source - resolve S3 object keys to public URLs
  const displaySrc = preview || getS3PublicUrl(currentImage) || null;

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setError(null);
    setPreview(null);

    // Validate file
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      onUploadError?.(validationError);
      return;
    }

    // Show local preview
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    // Upload to S3
    try {
      setUploading(true);
      onUploadStart?.();

      const result = await uploadImage(file);

      setUploading(false);
      onUploadSuccess(result.object_key);

      // Clean up local preview object URL after a short delay
      setTimeout(() => URL.revokeObjectURL(localPreview), 1000);
    } catch (err: unknown) {
      setUploading(false);
      setPreview(null);
      URL.revokeObjectURL(localPreview);

      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to upload image. Please try again.";

      setError(errorMessage);
      onUploadError?.(errorMessage);
    }
  }, [onUploadSuccess, onUploadError, onUploadStart]);

  const handleRemove = useCallback(() => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Notify parent to clear the image
    onUploadSuccess("");
  }, [onUploadSuccess]);

  const handleClick = useCallback(() => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, uploading]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        onChange={handleFileSelect}
        style={{ display: "none" }}
        disabled={disabled || uploading}
      />

      {/* Upload area */}
      <div
        onClick={handleClick}
        style={{
          width: "100%",
          maxWidth: 400,
          minHeight: 200,
          border: `2px dashed ${error ? "var(--danger, #ef4444)" : "var(--border, #334155)"}`,
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled || uploading ? "not-allowed" : "pointer",
          background: displaySrc
            ? "transparent"
            : "rgba(51, 65, 85, 0.3)",
          overflow: "hidden",
          position: "relative",
          transition: "border-color 0.2s",
          opacity: disabled ? 0.5 : 1,
        }}
        onDragOver={(e) => {
          if (!disabled && !uploading) {
            e.preventDefault();
            e.currentTarget.style.borderColor = "var(--primary, #6366f1)";
          }
        }}
        onDragLeave={(e) => {
          if (!disabled && !uploading) {
            e.currentTarget.style.borderColor = "var(--border, #334155)";
          }
        }}
        onDrop={(e) => {
          if (!disabled && !uploading) {
            e.preventDefault();
            e.currentTarget.style.borderColor = "var(--border, #334155)";
            const droppedFile = e.dataTransfer.files?.[0];
            if (droppedFile && fileInputRef.current) {
              // Programmatically set the file using DataTransfer
              const dt = new DataTransfer();
              dt.items.add(droppedFile);
              fileInputRef.current.files = dt.files;
              // Trigger change event
              const event = new Event("change", { bubbles: true });
              fileInputRef.current.dispatchEvent(event);
            }
          }
        }}
      >
        {uploading ? (
          <div style={{ textAlign: "center", padding: 20 }}>
            <div
              style={{
                width: 40,
                height: 40,
                border: "3px solid var(--border, #334155)",
                borderTopColor: "var(--primary, #6366f1)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 12px",
              }}
            />
            <div style={{ fontSize: 14, color: "var(--text-muted, #94a3b8)" }}>
              Uploading to S3...
            </div>
          </div>
        ) : displaySrc ? (
          <>
            <img
              src={displaySrc}
              alt="Preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                position: "absolute",
                top: 0,
                left: 0,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                display: "flex",
                gap: 4,
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
                style={{
                  padding: "4px 12px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "none",
                  background: "rgba(99, 102, 241, 0.9)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Change
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                style={{
                  padding: "4px 12px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "none",
                  background: "rgba(239, 68, 68, 0.9)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
            <div style={{ fontSize: 14, color: "var(--text-muted, #94a3b8)" }}>
              Click or drag & drop to upload
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted, #64748b)",
                marginTop: 4,
              }}
            >
              JPEG, PNG, GIF, WebP, SVG (max 5MB)
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            fontSize: 13,
            color: "var(--danger, #ef4444)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span>⚠</span> {error}
        </div>
      )}

      {/* CSS for spinner animation */}
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}