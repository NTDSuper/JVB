"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { withProtection } from "@/components/ProtectedRouter";
import Toast from "@/components/Toast";
import { OrderList, OrderListPaginatedResponse } from "@/types/dto";
import { Package, Filter, ChevronLeft, ChevronRight, DollarSign, ShoppingCart } from "lucide-react";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const AMOUNT_RANGES = [
  { value: "", label: "All Amounts" },
  { value: "0-50", label: "Under $50" },
  { value: "50-100", label: "$50 - $100" },
  { value: "100-200", label: "$100 - $200" },
  { value: "200-500", label: "$200 - $500" },
  { value: "500-999999", label: "Over $500" },
];

const ITEM_RANGES = [
  { value: "", label: "All Items" },
  { value: "1-1", label: "1 item" },
  { value: "2-3", label: "2-3 items" },
  { value: "4-5", label: "4-5 items" },
  { value: "6-999", label: "6+ items" },
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
  const [filterAmount, setFilterAmount] = useState("");
  const [filterItems, setFilterItems] = useState("");
  const [totalPages, setTotalPages] = useState(0);

  const fetchAllOrders = useCallback(async (page: number, status: string, amount: string, items: string) => {
    try {
      setLoading(true);
      const skip = page * PAGE_SIZE;
      let url = `/orders/all?skip=${skip}&limit=${PAGE_SIZE}`;
      if (status) {
        url += `&status=${status}`;
      }
      if (amount) {
        const [minAmt, maxAmt] = amount.split("-");
        url += `&min_amount=${minAmt}`;
        if (maxAmt) url += `&max_amount=${maxAmt}`;
      }
      if (items) {
        const [minIt, maxIt] = items.split("-");
        url += `&min_items=${minIt}`;
        if (maxIt) url += `&max_items=${maxIt}`;
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
    fetchAllOrders(currentPage, filterStatus, filterAmount, filterItems);
  }, [currentPage, filterStatus, filterAmount, filterItems, fetchAllOrders]);

  const handleConfirmOrder = async (orderId: number) => {
    if (!confirm("Confirm order completion?")) return;
    try {
      setActionLoading(orderId);
      await api.post(`/orders/${orderId}/confirm`, {});
      setToast({ message: `Order #${orderId} confirmed as completed.`, type: "success" });
      await fetchAllOrders(currentPage, filterStatus, filterAmount, filterItems);
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
      await fetchAllOrders(currentPage, filterStatus, filterAmount, filterItems);
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Failed to cancel order.";
      setToast({ message: detail, type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value);
    setCurrentPage(0);
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
        return "bg-[#EAF7EE] text-[#1F9D55] dark:bg-[#1A2E22] dark:text-[#34D399]";
      case "pending":
        return "bg-[#FFF7E6] text-[#B9790A] dark:bg-[#2A2010] dark:text-[#FBBF24]";
      case "in_progress":
        return "bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#A5B4FC]";
      case "cancelled":
      case "failed":
      case "refund":
        return "bg-[#FEE2E2] text-[#DC2626] dark:bg-[#2A1010] dark:text-[#FB7185]";
      default:
        return "bg-[var(--bg-input)] text-[var(--text-secondary)]";
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-main)] px-4 py-8 sm:px-8">
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
              Order Management
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Review and manage all orders. Orders in <strong>IN_PROGRESS</strong> status need your confirmation.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-2xl bg-[var(--bg-card)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F46E5] transition-all duration-300 dark:bg-[#1E1B4B] dark:text-[#A5B4FC]">
                <Filter size={18} />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Filter by status</label>
                <div className="relative mt-1">
                  <select
                    value={filterStatus}
                    onChange={handleStatusFilterChange}
                    className="form-input"
                    style={{ width: 180, padding: "8px 36px 8px 12px", appearance: "none", cursor: "pointer" }}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronRight size={16} style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%) rotate(-90deg)",
                    pointerEvents: "none", color: "var(--text-muted)"
                  }} />
                </div>
              </div>
            </div>

            {/* Amount Filter */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1">
                <DollarSign size={12} />
                Amount
              </label>
              <div className="relative mt-1">
                <select
                  value={filterAmount}
                  onChange={(e) => { setFilterAmount(e.target.value); setCurrentPage(0); }}
                  className="form-input"
                  style={{ width: 160, padding: "8px 36px 8px 12px", appearance: "none", cursor: "pointer" }}
                >
                  {AMOUNT_RANGES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronRight size={16} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%) rotate(-90deg)",
                  pointerEvents: "none", color: "var(--text-muted)"
                }} />
              </div>
            </div>

            {/* Items Filter */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1">
                <ShoppingCart size={12} />
                Items
              </label>
              <div className="relative mt-1">
                <select
                  value={filterItems}
                  onChange={(e) => { setFilterItems(e.target.value); setCurrentPage(0); }}
                  className="form-input"
                  style={{ width: 150, padding: "8px 36px 8px 12px", appearance: "none", cursor: "pointer" }}
                >
                  {ITEM_RANGES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronRight size={16} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%) rotate(-90deg)",
                  pointerEvents: "none", color: "var(--text-muted)"
                }} />
              </div>
            </div>

            <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
              Total: <strong style={{ color: "var(--text-primary)" }}>{totalItems}</strong> orders
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-[var(--bg-card)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
            <div className="skeleton" style={{ height: 50, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 50, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 50 }} />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-input)] text-[var(--text-muted)]">
              <Package size={32} strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">No orders found</div>
              {filterStatus && (
                <p className="text-xs text-[var(--text-muted)]">
                  No orders with status &ldquo;{filterStatus}&rdquo;. Try a different filter.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-[var(--bg-card)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="p-6">
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Order ID</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">User ID</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Items</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Total</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Status</th>
                      <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, idx) => (
                      <tr
                        key={order.id}
                        className="border-t border-[var(--border)] transition hover:bg-[var(--bg-hover)]"
                        style={{
                          animationDelay: `${idx * 60}ms`,
                          background: order.status === "in_progress" ? "var(--info-bg)" : undefined,
                        }}
                      >
                        <td className="px-4 py-3 text-sm font-bold text-[var(--text-primary)]">
                          #{order.id}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                          #{order.user_id}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                          {order.item_count} {order.item_count === 1 ? "item" : "items"}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[var(--accent)]">
                          ${order.total_amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => router.push(`/orders/${order.id}`)}
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
                                    borderColor: "rgba(239, 68, 94, 0.3)",
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
                <div className="mt-6 pt-6 border-t border-[var(--border)]">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 0 || loading}
                      className="px-4 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:border-[var(--primary)] hover:text-[var(--text-primary)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 500 }}>
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages - 1 || loading}
                      className="px-4 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:border-[var(--primary)] hover:text-[var(--text-primary)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
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

export default withProtection(OrderManagementPage, ["admin", "manager"]);