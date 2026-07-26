"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { withProtection } from "@/components/ProtectedRouter";
import Toast from "@/components/Toast";
import { OrderList, OrderListPaginatedResponse } from "@/types/dto";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function OrderManagementPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<OrderList[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Pagination & filter states
  const [currentPage, setCurrentPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [filterStatus, setFilterStatus] = useState("");
  const [totalPages, setTotalPages] = useState(0);

  const fetchAllOrders = useCallback(async (page: number, status: string) => {
    try {
      setLoading(true);
      const skip = page * PAGE_SIZE;
      let url = `/orders/all?skip=${skip}&limit=${PAGE_SIZE}`;
      if (status) {
        url += `&status=${status}`;
      }
      const res = await api.get<OrderListPaginatedResponse>(url);
      setOrders(res.data.items);
      setTotalItems(res.data.total);
      setTotalPages(Math.ceil(res.data.total / PAGE_SIZE));
    } catch (err: any) {
      console.error("Failed to load orders", err);
      setToast({ message: "Failed to load orders.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllOrders(currentPage, filterStatus);
  }, [currentPage, filterStatus, fetchAllOrders]);

  const handleConfirmOrder = async (orderId: number) => {
    if (!confirm("Confirm order completion?")) return;
    try {
      setActionLoading(orderId);
      await api.post(`/orders/${orderId}/confirm`, {});
      setToast({ message: `Order #${orderId} confirmed as completed.`, type: "success" });
      await fetchAllOrders(currentPage, filterStatus);
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Failed to confirm order.";
      setToast({ message: detail, type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm("Cancel this order? Stock will be restored.")) return;
    try {
      setActionLoading(orderId);
      await api.post(`/orders/${orderId}/admin-cancel`, {});
      setToast({ message: `Order #${orderId} cancelled. Stock restored.`, type: "info" });
      await fetchAllOrders(currentPage, filterStatus);
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Failed to cancel order.";
      setToast({ message: detail, type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value);
    setCurrentPage(0); // Reset to first page
  };

  const handlePrevPage = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "badge-success";
      case "pending":
        return "badge-warning";
      case "in_progress":
        return "badge-info";
      case "cancelled":
      case "failed":
      case "refund":
        return "badge-danger";
      default:
        return "badge-neutral";
    }
  };

  return (
    <>
      <div className="page-container animate-fade-in">
        <div style={{ marginBottom: 24 }}>
          <h1 className="page-title" style={{ margin: 0 }}>Order Management</h1>
          <p className="page-subtitle" style={{ margin: "4px 0 0 0" }}>
            Review and manage all orders. Orders in <strong>IN_PROGRESS</strong> status need your confirmation.
          </p>
        </div>

        {/* Filter bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 500 }}>
              Filter by status:
            </label>
            <select
              value={filterStatus}
              onChange={handleStatusFilterChange}
              className="form-input"
              style={{ width: 180, padding: "8px 12px" }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
            Total: <strong>{totalItems}</strong> orders
          </div>
        </div>

        {loading ? (
          <div className="card">
            <div className="skeleton" style={{ height: 50, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 50, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 50 }} />
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-title">No orders found</div>
            {filterStatus && (
              <p className="empty-state-text">
                No orders with status &ldquo;{filterStatus}&rdquo;. Try a different filter.
              </p>
            )}
          </div>
        ) : (
          <div className="card animate-slide-up" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr style={{ background: "rgba(51, 65, 85, 0.3)" }}>
                    <th style={{ padding: "16px 24px" }}>Order ID</th>
                    <th>User ID</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right", paddingRight: 24 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        background: order.status === "in_progress" ? "rgba(96, 165, 250, 0.05)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "16px 24px", fontWeight: 700, color: "var(--text-primary)" }}>
                        #{order.id}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        #{order.user_id}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {order.item_count} {order.item_count === 1 ? "item" : "items"}
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--accent)" }}>
                        ${order.total_amount.toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", paddingRight: 24 }}>
                        <div style={{ display: "inline-flex", gap: 8 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => router.push(`/orders/${order.id}`)}
                            style={{
                              borderColor: "rgba(99, 102, 241, 0.3)",
                              color: "var(--primary-light)",
                            }}
                          >
                            View Details
                          </button>
                          {order.status === "in_progress" && (
                            <>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleConfirmOrder(order.id)}
                                disabled={actionLoading === order.id}
                                style={{
                                  borderColor: "rgba(16, 185, 129, 0.3)",
                                  color: "var(--success)",
                                }}
                              >
                                {actionLoading === order.id ? "..." : "Complete"}
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleCancelOrder(order.id)}
                                disabled={actionLoading === order.id}
                                style={{
                                  borderColor: "rgba(239, 68, 68, 0.3)",
                                  color: "var(--danger)",
                                }}
                              >
                                {actionLoading === order.id ? "..." : "Cancel"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 24px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 0 || loading}
                  style={{
                    borderColor: "rgba(99, 102, 241, 0.3)",
                    color: currentPage === 0 ? "var(--text-muted)" : "var(--primary-light)",
                  }}
                >
                  ← Previous
                </button>
                <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages - 1 || loading}
                  style={{
                    borderColor: "rgba(99, 102, 241, 0.3)",
                    color: currentPage >= totalPages - 1 ? "var(--text-muted)" : "var(--primary-light)",
                  }}
                >
                  Next →
                </button>
              </div>
            )}
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
    </>
  );
}

export default withProtection(OrderManagementPage, ["admin", "manager"]);