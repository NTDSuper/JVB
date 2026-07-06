"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { User } from "@/types/dto";
import ProtectedRoute from "@/components/ProtectedRouter";

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

function ProfileSkeleton() {
  return (
    <div className="profile-body">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="profile-row">
          <div className="skeleton" style={{ height: 14, width: 80 }} />
          <div className="skeleton" style={{ height: 14, width: 120 }} />
        </div>
      ))}
    </div>
  );
}

interface FieldRowProps {
  label: string;
  value: React.ReactNode;
}

function FieldRow({ label, value }: FieldRowProps) {
  return (
    <div className="profile-row">
      <span className="profile-label">{label}</span>
      <span className="profile-value">{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await api.get<User>("/users/me");
      return res.data;
    },
  });

  const initials = getInitials(user?.full_name, user?.username);

  return (
    <ProtectedRoute>
      <div className="page-container animate-fade-in">
        <div style={{ marginBottom: 28 }}>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Your account information and membership details
          </p>
        </div>

        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar" aria-hidden="true">
                {isLoading ? "?" : initials}
              </div>
              <div>
                {isLoading ? (
                  <>
                    <div className="skeleton" style={{ height: 22, width: 160, marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 16, width: 200 }} />
                  </>
                ) : error ? null : (
                  <>
                    <p className="profile-name">
                      {user?.full_name || user?.username || "—"}
                    </p>
                    <p className="profile-email">{user?.email}</p>
                  </>
                )}
              </div>
            </div>

            {isLoading ? (
              <ProfileSkeleton />
            ) : error ? (
              <div className="empty-state" style={{ padding: "40px 20px" }}>
                <div className="empty-state-title">Could not load profile</div>
                <p className="empty-state-text">Please try again later.</p>
              </div>
            ) : (
              <div className="profile-body">
                <FieldRow label="Username" value={user?.username ?? "—"} />
                <FieldRow label="Email" value={user?.email ?? "—"} />
                <FieldRow label="Member since" value={formatDate(user?.created_at)} />
                <FieldRow
                  label="Status"
                  value={
                    user?.is_active ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-neutral">Inactive</span>
                    )
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
