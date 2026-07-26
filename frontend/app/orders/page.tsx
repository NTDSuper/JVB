"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import Toast from "@/components/Toast";
import { OrderList } from "@/types/dto";
import { useState } from "react";
import { withProtection } from "@/components/ProtectedRouter";

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
        return "badge-success";
      case "pending":
        return "badge-warning";
      case "in_progress":
        return "badge-info";
      case "cancelled":
      case "failed":
        return "badge-danger";
      default:
        return "badge-neutral";
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title">My Orders</h1>
        <p className="page-subtitle">Track and manage your order history and payments</p>
      </div>

      {isLoading ? (
        <div className="card">
          <div className="skeleton" style={{ height: 40, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 50, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 50, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 50 }} />
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <div className="empty-state-title">No orders found</div>
          <p className="empty-state-text" style={{ marginBottom: 24 }}>
            You haven't placed any orders yet.
          </p>
          <button className="btn btn-primary" onClick={() => router.push("/products")}>
            Browse Products
          </button>
        </div>
      ) : (
        <div className="card animate-slide-up" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Order History</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr style={{ background: "rgba(51, 65, 85, 0.3)" }}>
                  <th style={{ padding: "16px 24px" }}>Order ID</th>
                  <th>Items Count</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right", paddingRight: 24 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px 24px", fontWeight: 700, color: "var(--text-primary)" }}>
                      #{order.id}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
