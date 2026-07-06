"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthContext } from "@/auth/contexts/AuthContext";

export default function LoginForm() {
  const { login } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      await login({ email, password });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invalid email or password";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      {error && <div className="auth-error">{error}</div>}

      <div className="auth-field">
        <label className="form-label">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-input"
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary btn-lg"
        style={{ width: "100%", marginBottom: 16 }}
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>

      <p className="auth-footer">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="auth-link">
          Register
        </Link>
      </p>
    </form>
  );
}
