"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { withProtection } from "@/components/ProtectedRouter";
import Toast from "@/components/Toast";
import { User, UserAdminUpdate, Role } from "@/types/dto";

function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [addUserForm, setAddUserForm] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
  });

  const [editUserForm, setEditUserForm] = useState<UserAdminUpdate>({
    username: "",
    email: "",
    full_name: "",
    is_active: true,
    role: "",
  });

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const getErrorMessage = (err: any, fallback: string): string => {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ");
    }
    if (typeof detail === "object" && detail !== null) {
      return detail.msg || JSON.stringify(detail);
    }
    return fallback;
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get<User[]>("/users/all");
      setUsers(res.data);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 403) {
        setError("Access Denied: Only Admin can access this page.");
      } else {
        setError("Failed to fetch user list.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get<Role[]>("/roles");
      setRoles(res.data);
    } catch (err: any) {
      console.error("Failed to load roles", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/register", addUserForm);
      setToast({ message: "User added successfully.", type: "success" });
      setShowAddModal(false);
      setAddUserForm({ username: "", email: "", password: "", full_name: "" });
      fetchUsers();
    } catch (err: any) {
      setToast({ message: getErrorMessage(err, "Failed to add user."), type: "error" });
    }
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditUserForm({
      username: user.username,
      email: user.email,
      full_name: user.full_name || "",
      is_active: user.is_active,
      role: Array.isArray(user.role) ? user.role[0] ?? "" : user.role ?? "",
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const payload = {
        ...editUserForm,
        role: editUserForm.role ? [editUserForm.role] : [],
      };
      await api.patch(`/users/${selectedUser.id}`, payload);
      setToast({ message: "User updated successfully.", type: "success" });
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      setToast({ message: getErrorMessage(err, "Failed to update user."), type: "error" });
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      const res = await api.delete(`/users/${userId}`);
      setToast({ message: res.data.message || "User deleted successfully.", type: "success" });
      fetchUsers();
    } catch (err: any) {
      setToast({ message: getErrorMessage(err, "Failed to delete user."), type: "error" });
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      await api.patch(`/users/${user.id}`, {
        is_active: !user.is_active,
      });
      setToast({
        message: `User status changed to ${!user.is_active ? "Active" : "Inactive"}.`,
        type: "info",
      });
      fetchUsers();
    } catch (err: any) {
      setToast({ message: getErrorMessage(err, "Failed to change status."), type: "error" });
    }
  };

  const handleRoleToggle = (roleName: string) => {
    setEditUserForm((prev) => ({
      ...prev,
      role: roleName,
    }));
  };

  if (loading) {
    return (
      <div className="relative min-h-screen bg-[var(--bg-main)] px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="skeleton" style={{ height: 40, width: "30%", marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 300 }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen bg-[var(--bg-main)] px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-input)] text-[var(--text-muted)]">
              <span className="text-2xl">🔒</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">{error}</div>
              <p className="text-xs text-[var(--text-muted)]">
                Please contact your administrator if you believe this is a mistake.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto min-h-screen px-4 py-8">
      {/* Signature: Ambient gradient blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-[#FF5A1F]/8 to-transparent blur-3xl transition-opacity duration-500 dark:from-[#FF5A1F]/15" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-gradient-to-tr from-[#6366F1]/8 to-transparent blur-3xl transition-opacity duration-500 dark:from-[#6366F1]/15" />
      </div>

      <div className="mx-auto max-w-7xl">
        {/* ── Page Header ── */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1
              className="text-3xl font-bold text-[var(--text-primary)]"
              style={{ fontFamily: "'Baloo 2', sans-serif" }}
            >
              User Management
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Admin panel to manage users accounts, permissions, and status
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Add User
          </button>
        </div>

        {/* Users Table Card */}
        <div className="rounded-2xl bg-[var(--bg-card)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] overflow-hidden transition-all duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.5)]">
          {/* Decorative top-edge gradient stripe */}
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#FF5A1F] via-[#6366F1] to-[#1F9D55] opacity-80 transition-opacity duration-300 dark:opacity-100" />
          
          <div className="p-6">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF4EC] text-[#E14E17] transition-all duration-300 dark:bg-[#2A1A10] dark:text-[#FB923C]">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
                  All Users
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {users.length} registered account{users.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="h-px bg-gradient-to-r from-[#FF5A1F]/40 via-[var(--border)] to-[#6366F1]/40 mb-6" />

            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">ID</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Username</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Email</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Roles</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Status</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-[var(--border)] transition hover:bg-[var(--bg-hover)]">
                      <td className="px-4 py-3 text-sm text-[var(--text-muted)] font-mono">
                        #{user.id}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">
                        {user.username}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {(user.role ?? []).map((r) => (
                            <span key={r} className="inline-flex items-center rounded-full bg-[#EEF2FF] px-2.5 py-1 text-[10px] font-bold text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#A5B4FC]">
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleUserStatus(user)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                            user.is_active
                              ? "bg-[#EAF7EE] text-[#1F9D55]"
                              : "bg-[#F5F5F3] text-[#6B7280]"
                          }`}
                          style={{ border: "none", cursor: "pointer" }}
                          title="Click to toggle status"
                        >
                          <div className={`h-1.5 w-1.5 rounded-full ${user.is_active ? "bg-[#1F9D55]" : "bg-[#6B7280]"}`} />
                          {user.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 8 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleEditClick(user)}
                            style={{ borderColor: "rgba(245, 158, 11, 0.3)", color: "var(--warning)" }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDelete(user.id)}
                            style={{ borderColor: "rgba(239, 68, 68, 0.3)", color: "var(--danger)" }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add User Modal */}
        {showAddModal && (
          <div className="modal-overlay">
            <div className="modal-content animate-slide-up">
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Add New User</h2>
              <form onSubmit={handleAddSubmit}>
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    value={addUserForm.full_name}
                    onChange={(e) => setAddUserForm({ ...addUserForm, full_name: e.target.value })}
                    className="form-input"
                    placeholder="Enter full name"
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    required
                    value={addUserForm.username}
                    onChange={(e) => setAddUserForm({ ...addUserForm, username: e.target.value })}
                    className="form-input"
                    placeholder="Enter username"
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    required
                    value={addUserForm.email}
                    onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                    className="form-input"
                    placeholder="Enter email"
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    required
                    value={addUserForm.password}
                    onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
                    className="form-input"
                    placeholder="Enter temporary password"
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <div className="modal-overlay">
            <div className="modal-content animate-slide-up">
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Edit User Profile</h2>
              <form onSubmit={handleEditSubmit}>
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    value={editUserForm.full_name || ""}
                    onChange={(e) => setEditUserForm({ ...editUserForm, full_name: e.target.value })}
                    className="form-input"
                    placeholder="Enter full name"
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    required
                    value={editUserForm.username || ""}
                    onChange={(e) => setEditUserForm({ ...editUserForm, username: e.target.value })}
                    className="form-input"
                    placeholder="Enter username"
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editUserForm.email || ""}
                    onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    className="form-input"
                    placeholder="Enter email"
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Roles</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: `2px solid ${(editUserForm.role ?? "") === role.name ? "var(--primary)" : "var(--border)"}`,
                          background: (editUserForm.role ?? "") === role.name ? "var(--bg-hover)" : "transparent",
                          cursor: "pointer",
                          userSelect: "none",
                          fontSize: 13,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <input
                          type="radio"
                          name="role"
                          checked={(editUserForm.role ?? "") === role.name}
                          onChange={() => handleRoleToggle(role.name)}
                          style={{ accentColor: "var(--primary)" }}
                        />
                        {role.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label className="form-label">Account Status</label>
                  <select
                    value={editUserForm.is_active ? "active" : "inactive"}
                    onChange={(e) => setEditUserForm({ ...editUserForm, is_active: e.target.value === "active" })}
                    className="form-input"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default withProtection(AdminPage, ["admin"]);