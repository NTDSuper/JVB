"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <div
      className="page-container animate-fade-in"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "65vh",
        textAlign: "center",
        padding: "40px 20px",
      }}
    >
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
  );
}
