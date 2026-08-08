"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export const dynamic = 'force-dynamic';

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-[var(--bg-main)] px-4 py-8 sm:px-8 flex items-center justify-center">
      {/* Signature: Ambient gradient blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-[#FF5A1F]/8 to-transparent blur-3xl transition-opacity duration-500 dark:from-[#FF5A1F]/15" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-gradient-to-tr from-[#6366F1]/8 to-transparent blur-3xl transition-opacity duration-500 dark:from-[#6366F1]/15" />
      </div>

      <div className="max-w-5xl mx-auto w-full">
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              background: "linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1,
              marginBottom: 16,
            }}
          >
            403
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 12,
            }}
          >
            Access Denied / Unauthorized
          </h1>
          <p
            style={{
              maxWidth: 480,
              color: "var(--text-secondary)",
              fontSize: 15,
              lineHeight: 1.6,
              marginBottom: 32,
            }}
          >
            You do not have permission to access this page. If you believe this is a
            mistake, please contact your administrator or return to the main products page.
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={() => router.back()}
              className="btn btn-ghost"
              style={{ padding: "12px 24px" }}
            >
              ← Go Back
            </button>
            <Link
              href="/products"
              className="btn btn-primary"
              style={{ padding: "12px 24px", textDecoration: "none" }}
            >
              Return to Products
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}