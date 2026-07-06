"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      await register(form);
      router.push("/login");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card-wrap animate-slide-up">
        <div className="card-glass" style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 28 }}>
            <div className="auth-brand auth-brand-accent">SuperMart</div>
            <p className="auth-subtitle">Create a new account</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-field" style={{ marginBottom: 14 }}>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                className="form-input"
                placeholder="John Doe"
              />
            </div>

            <div className="auth-field" style={{ marginBottom: 14 }}>
              <label className="form-label">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => handleChange("username", e.target.value)}
                className="form-input"
                placeholder="johndoe"
                required
                autoComplete="username"
              />
            </div>

            <div className="auth-field" style={{ marginBottom: 14 }}>
              <label className="form-label">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="form-input"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field" style={{ marginBottom: 24 }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className="form-input"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-accent btn-lg"
              style={{ width: "100%", marginBottom: 16 }}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>

            <p className="auth-footer">
              Already have an account?{" "}
              <Link href="/login" className="auth-link">
                Sign In
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
