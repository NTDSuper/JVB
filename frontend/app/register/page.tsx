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
    <div className="relative min-h-screen bg-[var(--bg-main)] px-4 py-8 sm:px-8">
      {/* Signature: Ambient gradient blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-[#FF5A1F]/8 to-transparent blur-3xl transition-opacity duration-500 dark:from-[#FF5A1F]/15" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-gradient-to-tr from-[#6366F1]/8 to-transparent blur-3xl transition-opacity duration-500 dark:from-[#6366F1]/15" />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-64px)] items-center justify-center">
        <div className="w-full max-w-md animate-fade-in">
          {/* Auth Card */}
          <div className="rounded-2xl bg-[var(--bg-card)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] overflow-hidden transition-all duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.5)]">
            {/* Decorative top-edge gradient stripe */}
            <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#FF5A1F] via-[#6366F1] to-[#1F9D55] opacity-80 transition-opacity duration-300 dark:opacity-100" />
            
            {/* Header */}
            <div className="relative bg-gradient-to-br from-[#171A1C] to-[#374151] px-6 pb-16 pt-6 transition-all duration-500 dark:from-[#0B1120] dark:to-[#1A2540]">
              {/* Dark mode signature: subtle inner glow */}
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 dark:opacity-100" style={{ background: "radial-gradient(circle at 30% 20%, rgba(99,102,241,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,90,31,0.12) 0%, transparent 50%)" }} />
              
              <div className="relative text-center">
                <div className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
                  SuperMart
                </div>
                <p className="text-sm text-gray-300">
                  Create a new account
                </p>
              </div>
            </div>

            {/* Avatar */}
            <div className="relative -mt-8 flex justify-center">
              <div className="relative rounded-full bg-[var(--bg-card)] p-1 ring-4 ring-[#1F9D55] shadow-lg transition-all duration-300 dark:shadow-[0_0_24px_rgba(var(--primary-rgb),0.25)]">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#F1EEE9] to-[#E5E1DA] text-lg font-bold text-[var(--text-primary)] transition-all duration-300 dark:from-[#1A2540] dark:to-[#0B1120] dark:text-[#F1F5F9]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
                  +
                </div>
                <div className="absolute inset-0 rounded-full ring-4 ring-[#1F9D55] animate-pulse opacity-40 transition-opacity duration-300 dark:opacity-60" />
              </div>
            </div>

            {/* Form */}
            <div className="px-6 pb-6 pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-xs font-semibold text-[#DC2626] animate-fade-in">
                    {error}
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[rgba(var(--primary-rgb),0.12)] transition-all"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
                    Username
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => handleChange("username", e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[rgba(var(--primary-rgb),0.12)] transition-all"
                    placeholder="johndoe"
                    required
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[rgba(var(--primary-rgb),0.12)] transition-all"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
                    Password
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[rgba(var(--primary-rgb),0.12)] transition-all"
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn btn-accent btn-lg"
                  style={{ marginTop: 8 }}
                >
                  {loading ? "Creating account..." : "Create Account"}
                </button>

                <p className="text-center text-sm text-[var(--text-muted)]">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors">
                    Sign In
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}