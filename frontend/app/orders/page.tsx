"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import Toast from "@/components/Toast";
import { OrderList } from "@/types/dto";
import { useState } from "react";
import { withProtection } from "@/components/ProtectedRouter";
import { Package, ChevronRight } from "lucide-react";

function OrdersPage() {
  const router = useRouter();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await api.get<OrderList[]>("/orders");
      return res.data;
    },
    staleTime: 1000 * 60 * 1,
  });

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

      <div className="mx-auto max-w-5xl">
        {/* ── Page Header ── */}
        <div className="mb-10">
          <h1
            className="text-3xl font-bold text-[var(--text-primary)]"
            style={{ fontFamily: "'Baloo 2', sans-serif" }}
          >
            My Orders
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Track and manage your order history and payments
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-2xl bg-[var(--bg-card)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
            <div className="skeleton" style={{ height: 40, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 50, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 50, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 50 }} />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-input)] text-[var(--text-muted)]">
              <Package size={32} strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">No orders found</div>
              <p className="text-xs text-[var(--text-muted)]">
                You haven't placed any orders yet.
              </p>
            </div>
            <button className="btn btn-primary btn-lg mt-4" onClick={() => router.push("/products")}>
              Browse Products
              <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-[var(--bg-card)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF7EE] text-[#1F9D55] transition-all duration-300 dark:bg-[#1A2E22] dark:text-[#34D399]">
                  <Package size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
                    Order History
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    {orders.length} order{orders.length === 1 ? "" : "s"} placed
                  </p>
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-[#1F9D55]/40 via-[var(--border)] to-[#FF5A1F]/40 mb-6" />

              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Order ID</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Items Count</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Total Amount</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Status</th>
                      <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, idx) => (
                      <tr key={order.id} className="border-t border-[var(--border)] transition hover:bg-[var(--bg-hover)]">
                        <td className="px-4 py-3 text-sm font-bold text-[var(--text-primary)]">
                          #{order.id}
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
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => router.push(`/orders/${order.id}`)}
                          >
                            View Details
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

export default withProtection(OrdersPage, ["user"]);