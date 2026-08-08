"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { User } from "@/types/dto";
import { withProtection } from "@/components/ProtectedRouter";
import {
  Mail,
  User as UserIcon,
  Calendar,
  Shield,
  ChevronRight,
  Crown,
  CheckCircle2,
} from "lucide-react";

function getInitials(name?: string, username?: string): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return (username?.[0] ?? "?").toUpperCase();
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const ROLE_STYLES: Record<
  string,
  { ring: string; chip: string; text: string; icon: React.ReactNode; label: string }
> = {
  admin: {
    ring: "ring-[#FF5A1F]",
    chip: "bg-[#FFF4EC] text-[#E14E17]",
    text: "text-[#E14E17]",
    icon: <Crown size={12} />,
    label: "Administrator",
  },
  manager: {
    ring: "ring-[#1F9D55]",
    chip: "bg-[#EAF7EE] text-[#1F9D55]",
    text: "text-[#1F9D55]",
    icon: <Shield size={12} />,
    label: "Manager",
  },
  user: {
    ring: "ring-[#6366F1]",
    chip: "bg-[#EEF2FF] text-[#4F46E5]",
    text: "text-[#4F46E5]",
    icon: <UserIcon size={12} />,
    label: "Member",
  },
};

function ProfileSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-[var(--bg-input)] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded-full bg-[var(--bg-input)] animate-pulse" />
            <div className="h-4 w-36 rounded-full bg-[var(--bg-input)] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface FieldRowProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "orange" | "indigo" | "emerald";
}

function FieldRow({ label, value, icon, accent = "orange" }: FieldRowProps) {
  const accentClasses = {
    orange: "bg-[#FFF4EC] text-[#E14E17]",
    indigo: "bg-[#EEF2FF] text-[#4F46E5]",
    emerald: "bg-[#EAF7EE] text-[#1F9D55]",
  };

  return (
    <div className="group flex items-center gap-3 rounded-xl p-3 transition duration-200 hover:bg-[var(--bg-hover)]">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${accentClasses[accent]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          {label}
        </p>
        <div className="mt-0.5 text-sm font-semibold text-[var(--text-primary)] break-words">
          {value}
        </div>
      </div>
      <ChevronRight size={14} className="shrink-0 text-[var(--border-strong)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
    </div>
  );
}

function ProfilePage() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await api.get<User>("/users/me");
      return res.data;
    },
  });

  const initials = getInitials(user?.full_name, user?.username);
  const displayName = user?.full_name || user?.username || "—";
  const userRoles = user?.role
    ? Array.isArray(user.role)
      ? user.role
      : [user.role]
    : [];
  const primaryRole = userRoles[0] ?? "user";
  const roleStyle = ROLE_STYLES[primaryRole] ?? ROLE_STYLES.user;

  return (
    <div className="container mx-auto min-h-screen px-4 py-8">
      {/* Signature: Ambient gradient blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-[#FF5A1F]/8 to-transparent blur-3xl transition-opacity duration-500 dark:from-[#FF5A1F]/15" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-gradient-to-tr from-[#6366F1]/8 to-transparent blur-3xl transition-opacity duration-500 dark:from-[#6366F1]/15" />
      </div>

      <div className="mx-auto max-w-5xl">
        {/* ── Page Header ── */}
        <div className="mb-10">
          <h1
            className="text-3xl font-bold text-[var(--text-primary)]"
            style={{ fontFamily: "'Baloo 2', sans-serif" }}
          >
            My Profile
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Your account details at a glance
          </p>
        </div>

        {/* ── Two Equal Column Layout ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ── Left Column: Identity Card ── */}
          <div className="flex flex-col rounded-2xl bg-[var(--bg-card)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] overflow-hidden md:h-full transition-shadow duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.5)]">
            <div className="relative bg-gradient-to-br from-[#171A1C] to-[#374151] px-6 pb-20 pt-6 transition-all duration-500 dark:from-[#0B1120] dark:to-[#1A2540]">
              {/* Dark mode signature: subtle inner glow */}
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 dark:opacity-100" style={{ background: "radial-gradient(circle at 30% 20%, rgba(99,102,241,0.12) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,90,31,0.1) 0%, transparent 50%)" }} />
              
              <div className="relative flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${roleStyle.chip}`}
                >
                  {roleStyle.icon}
                  {roleStyle.label}
                </span>
                {user?.is_active ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-600">
                    <CheckCircle2 size={11} />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-500/10 px-3 py-1.5 text-[11px] font-bold text-gray-600">
                    Inactive
                  </span>
                )}
              </div>
            </div>

            <div className="relative -mt-10 flex justify-center">
              <div className={`relative rounded-full bg-[var(--bg-card)] p-1 ring-4 ${roleStyle.ring} shadow-lg transition-all duration-300 dark:shadow-[0_0_24px_rgba(var(--primary-rgb),0.25)]`}>
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#F1EEE9] to-[#E5E1DA] text-xl font-bold text-[var(--text-primary)] transition-all duration-300 dark:from-[#1A2540] dark:to-[#0B1120] dark:text-[#F1F5F9]"
                  style={{ fontFamily: "'Baloo 2', sans-serif" }}
                >
                  {isLoading ? "…" : initials}
                </div>
                {/* Enhanced pulse for dark mode */}
                <div className={`absolute inset-0 rounded-full ring-4 ${roleStyle.ring} animate-pulse opacity-40 transition-opacity duration-300 dark:opacity-60`} />
              </div>
            </div>

            <div className="flex flex-1 flex-col px-6 pb-6 pt-12 text-center">
              <h2
                className="text-xl font-bold text-[var(--text-primary)]"
                style={{ fontFamily: "'Baloo 2', sans-serif" }}
              >
                {displayName}
              </h2>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{user?.email}</p>
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                Joined {formatDate(user?.created_at)}
              </p>
            </div>
          </div>

          {/* ── Right Column: Account Information ── */}
          <div className="flex flex-col rounded-2xl bg-[var(--bg-card)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] overflow-hidden md:h-full transition-all duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.5)]">
            {/* Decorative top-edge gradient stripe */}
            <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#FF5A1F] via-[#6366F1] to-[#1F9D55] opacity-80 transition-opacity duration-300 dark:opacity-100" />
            
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF4EC] text-[#E14E17] transition-all duration-300 dark:bg-[#2A1A10] dark:text-[#FB923C]">
                <UserIcon size={18} />
              </div>
              <div>
                <h3
                  className="text-base font-bold text-[var(--text-primary)]"
                  style={{ fontFamily: "'Baloo 2', sans-serif" }}
                >
                  Account Information
                </h3>
                <p className="text-xs text-[var(--text-muted)]">Personal details</p>
              </div>
            </div>
            <div className="mt-4 h-px bg-gradient-to-r from-[#FF5A1F]/40 via-[var(--border)] to-[#6366F1]/40" />

            {isLoading ? (
              <div className="mt-4 flex-1">
                <ProfileSkeleton />
              </div>
            ) : error ? (
              <div className="flex flex-1 flex-col items-center gap-2 py-12 text-center">
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  Unable to load profile
                </div>
                <p className="text-sm text-[var(--text-muted)]">Please try again later.</p>
              </div>
            ) : (
              <div className="mt-4 flex-1 space-y-1">
                <FieldRow
                  label="Username"
                  value={user?.username ?? "—"}
                  icon={<UserIcon size={16} />}
                  accent="indigo"
                />
                <FieldRow
                  label="Full Name"
                  value={user?.full_name || "—"}
                  icon={<UserIcon size={16} />}
                  accent="orange"
                />
                <FieldRow
                  label="Email"
                  value={user?.email ?? "—"}
                  icon={<Mail size={16} />}
                  accent="orange"
                />
                <FieldRow
                  label="Joined"
                  value={formatDate(user?.created_at)}
                  icon={<Calendar size={16} />}
                  accent="emerald"
                />
                <FieldRow
                  label="Status"
                  value={
                    user?.is_active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF7EE] px-2.5 py-1 text-xs font-bold text-[#1F9D55] transition-all duration-200 dark:bg-[#1A2E22] dark:text-[#34D399]">
                        <CheckCircle2 size={13} />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-input)] px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)]">
                        Inactive
                      </span>
                    )
                  }
                  icon={<Shield size={16} />}
                  accent="emerald"
                />
                {userRoles.length > 1 && (
                  <FieldRow
                    label="Roles"
                    value={userRoles.map(r => ROLE_STYLES[r]?.label ?? r).join(", ")}
                    icon={<Shield size={16} />}
                    accent="indigo"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default withProtection(ProfilePage);