"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRouter";
import Toast from "@/components/Toast";
import { User, UserAdminUpdate } from "@/types/dto";

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
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
  });

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

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

  useEffect(() => {
    fetchUsers();
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
      const detail = err.response?.data?.detail || "Failed to add user.";
      setToast({ message: detail, type: "error" });
    }
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditUserForm({
      username: user.username,
      email: user.email,
      full_name: user.full_name || "",
      is_active: user.is_active,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await api.patch(`/users/${selectedUser.id}`, editUserForm);
      setToast({ message: "User updated successfully.", type: "success" });
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Failed to update user.";
      setToast({ message: detail, type: "error" });
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      const res = await api.delete(`/users/${userId}`);
      setToast({ message: res.data.message || "User deleted successfully.", type: "success" });
      fetchUsers();
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Failed to delete user.";
      setToast({ message: detail, type: "error" });
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
      const detail = err.response?.data?.detail || "Failed to change status.";
      setToast({ message: detail, type: "error" });
    }
  };

  if (loading) {
    return (
      <ProtectedRoute roles = {["admin"]}>
        <div className="page-container">
          <div className="skeleton" style={{ height: 40, width: "30%", marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 300 }} />
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute roles = {["admin"]}>
        <div className="page-container">
          <div className="empty-state">
            <div className="empty-state-icon">🔒</div>
            <div className="empty-state-title">{error}</div>
            <p className="empty-state-text">
              Please contact your administrator if you believe this is a mistake.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute roles = {["admin"]}>
      <div className="page-container animate-fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>User Management</h1>
            <p className="page-subtitle" style={{ margin: "4px 0 0 0" }}>
              Admin panel to manage users accounts, permissions, and status
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Add User
          </button>
        </div>

        <div className="card animate-slide-up" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr style={{ background: "rgba(51, 65, 85, 0.3)" }}>
                  <th style={{ padding: "16px 24px" }}>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right", paddingRight: 24 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px 24px", color: "var(--text-muted)", fontSize: 13 }}>
                      #{user.id}
                    </td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      <button
                        onClick={() => toggleUserStatus(user)}
                        className={`badge ${user.is_active ? "badge-success" : "badge-danger"}`}
                        style={{ border: "none", cursor: "pointer" }}
                        title="Click to toggle status"
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td style={{ textAlign: "right", paddingRight: 24 }}>
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
    </ProtectedRoute>
  );
}
