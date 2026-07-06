"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRouter";
import Toast from "@/components/Toast";
import { Order, Payment } from "@/types/dto";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderIdStr = params.id as string;
  const orderId = parseInt(orderIdStr);

  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [orderRes, paymentRes] = await Promise.all([
        api.get<Order>(`/orders/${orderId}`),
        api.get<Payment>(`/payments/${orderId}`),
      ]);
      setOrder(orderRes.data);
      setPayment(paymentRes.data);
    } catch (err: any) {
      console.error(err);
      setToast({ message: "Failed to load order details.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle countdown timer for pending payment
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (order?.status === "pending" && payment?.status === "pending" && payment?.expires_at) {
      const expiryTime = new Date(payment.expires_at).getTime();

      const updateTimer = async () => {
        const now = new Date().getTime();
        const diff = expiryTime - now;
        if (diff <= 0) {
          setTimeLeft("Expired");
          if (timerRef.current) clearInterval(timerRef.current);
          // Refresh data since order status will be changed to cancelled in DB
          await fetchData();
        } else {
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft(`${minutes}m ${seconds}s`);
        }
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      setTimeLeft("");
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [order?.status, payment?.status, payment?.expires_at]);

  const handlePay = async () => {
    if (actionLoading) return; // Prevent double-click
    try {
      setActionLoading(true);
      const res = await api.post(`/payments/${orderId}/pay`);
      if (res.data.success) {
        setToast({ message: res.data.message || "Payment completed successfully!", type: "success" });
      } else {
        setToast({ message: res.data.message || "Payment failed.", type: "error" });
      }
      // Refresh order and payment details
      await fetchData();
    } catch (err: any) {
      const detail = err.response?.data?.detail || "An error occurred during payment processing.";
      setToast({ message: detail, type: "error" });
      await fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  // Retry: tao payment moi (co thoi han) + tru stock
  const handleRetry = async () => {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/payments/${orderId}/retry`, {
        payment_method: payment?.method || "credit_card",
      });
      if (res.data.success) {
        setToast({ message: "Da tao thanh toan moi! Vui long thanh toan truoc khi het han.", type: "success" });
      } else {
        setToast({ message: res.data.message || "Khong the tao thanh toan moi.", type: "error" });
      }
      await fetchData();
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Loi tao thanh toan.";
      setToast({ message: detail, type: "error" });
      await fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    try {
      setActionLoading(true);
      const res = await api.post<Order>(`/orders/${orderId}/cancel`, {});
      setOrder(res.data);
      setToast({ message: "Order cancelled successfully.", type: "info" });
      // Refresh payment as well
      const paymentRes = await api.get<Payment>(`/payments/${orderId}`);
      setPayment(paymentRes.data);
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Failed to cancel order.";
      setToast({ message: detail, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "badge-success";
      case "pending":
        return "badge-warning";
      case "cancelled":
      case "failed":
        return "badge-danger";
      default:
        return "badge-neutral";
    }
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="page-container">
          <div className="skeleton" style={{ height: 40, width: "30%", marginBottom: 24 }} />
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div className="skeleton" style={{ flex: 2, height: 300 }} />
            <div className="skeleton" style={{ flex: 1, height: 300 }} />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!order || !payment) {
    return (
      <ProtectedRoute>
        <div className="page-container">
          <div className="empty-state">
            <div className="empty-state-icon">❌</div>
            <div className="empty-state-title">Order details not found</div>
            <button className="btn btn-primary" onClick={() => router.push("/orders")}>
              Back to My Orders
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="page-container animate-fade-in">
        {/* Back */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => router.push("/orders")}
          style={{ marginBottom: 24 }}
        >
          ← Back to Orders
        </button>

        <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: 32, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Order #{order.id}</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "4px 0 0 0" }}>
              Thank you for shopping with us!
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <span className={`badge ${getStatusBadgeClass(order.status)}`} style={{ fontSize: 14, padding: "8px 16px" }}>
              Status: {order.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* Items & details */}
          <div style={{ flex: 2, minWidth: 300, display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="card">
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
                Items Ordered
              </h2>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style={{ textAlign: "right" }}>Price</th>
                      <th style={{ textAlign: "center" }}>Quantity</th>
                      <th style={{ textAlign: "right" }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.product_name}</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>SKU: {item.product_sku}</div>
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>{formatPrice(item.price)}</td>
                        <td style={{ textAlign: "center" }}>{item.quantity}</td>
                        <td style={{ textAlign: "right", fontWeight: 600, color: "var(--accent)" }}>
                          {formatPrice(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  borderTop: "1px solid var(--border)",
                  paddingTop: 16,
                  marginTop: 16,
                }}
              >
                <div style={{ width: 240 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
                    <span style={{ color: "var(--text-secondary)" }}>Subtotal:</span>
                    <span>{formatPrice(order.total_amount)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
                    <span style={{ color: "var(--text-secondary)" }}>Shipping:</span>
                    <span style={{ color: "var(--success)" }}>Free</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                    <span>Total Amount:</span>
                    <span style={{ color: "var(--accent)" }}>{formatPrice(order.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment panel */}
          <div style={{ flex: 1, minWidth: 300, display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="card">
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
                Payment Information
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Payment Method:</span>
                  <span style={{ fontWeight: 600 }}>{payment.method.toUpperCase()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Payment Status:</span>
                  <span className={`badge ${getStatusBadgeClass(payment.status)}`}>{payment.status}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Amount:</span>
                  <span style={{ fontWeight: 600, color: "var(--accent)" }}>{formatPrice(payment.amount)}</span>
                </div>
                {payment.paid_at && payment.status === "completed" && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                    <span style={{ color: "var(--text-secondary)" }}>Paid At:</span>
                    <span>{new Date(payment.paid_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Countdown Timer */}
              {order.status === "pending" && payment.status === "pending" && timeLeft && (
                <div
                  style={{
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.2)",
                    borderRadius: 12,
                    padding: 16,
                    textAlign: "center",
                    marginBottom: 20,
                  }}
                >
                  <div style={{ fontSize: 13, color: "var(--warning)", marginBottom: 4 }}>
                    ⏰ Payment expires in
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#f59e0b" }}>{timeLeft}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    Please complete the payment before this timer reaches 0.
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {(order.status === "pending" && payment.status === "pending" && timeLeft !== "Expired") && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <button
                    className="btn btn-success btn-lg"
                    style={{ width: "100%" }}
                    onClick={handlePay}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing Payment..." : "Pay Now"}
                  </button>

                  <button
                    className="btn btn-ghost"
                    style={{ width: "100%", color: "var(--danger)", borderColor: "rgba(239, 68, 68, 0.2)" }}
                    onClick={handleCancel}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing..." : "Cancel Order"}
                  </button>
                </div>
              )}

              {/* Retry payment button when expired or failed */}
              {(payment.status === "failed" || payment.status === "cancelled" || timeLeft === "Expired") && order.status !== "completed" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <button
                    className="btn btn-warning btn-lg"
                    style={{ width: "100%", backgroundColor: "#f59e0b", borderColor: "#d97706", color: "#000" }}
                    onClick={handleRetry}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Creating Payment..." : "Try Pay Again"}
                  </button>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
                    Your previous payment has expired. Click to create a new payment with a fresh deadline.
                  </div>
                </div>
              )}

              {/* Post-payment information alerts */}
              {payment.status === "completed" && (
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    borderRadius: 12,
                    padding: 16,
                    color: "#34d399",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span>✅</span>
                  <span>This order has been fully paid and processed.</span>
                </div>
              )}

              {(order.status === "cancelled" || payment.status === "failed") && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: 12,
                    padding: 16,
                    color: "#f87171",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span>❌</span>
                  <span>This order has been cancelled or payment failed.</span>
                </div>
              )}
            </div>
          </div>
        </div>
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
