"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { withProtection } from "@/components/ProtectedRouter";
import Toast from "@/components/Toast";
import { Order, Payment } from "@/types/dto";
import { useAuthContext } from "@/auth/contexts/AuthContext";
import { Clock, Shield, CreditCard, CheckCircle2, XCircle, AlertTriangle, ArrowLeft } from "lucide-react";

function OrderDetailPage() {
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
  const { user } = useAuthContext();

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
    if (actionLoading) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/payments/${orderId}/pay`);
      if (res.data.success) {
        setToast({ message: "Payment successful! Your order is being processed.", type: "success" });
      } else {
        setToast({ message: res.data.message || "Payment failed.", type: "error" });
      }
      await fetchData();
    } catch (err: any) {
      const detail = err.response?.data?.detail || "An error occurred during payment processing.";
      setToast({ message: detail, type: "error" });
      await fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/payments/${orderId}/retry`, {
        payment_method: payment?.method || "credit_card",
      });
      if (res.data.success) {
        setToast({ message: "New payment created! Please pay before the deadline.", type: "success" });
      } else {
        setToast({ message: res.data.message || "Failed to create new payment.", type: "error" });
      }
      await fetchData();
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Failed to create new payment.";
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
      const paymentRes = await api.get<Payment>(`/payments/${orderId}`);
      setPayment(paymentRes.data);
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Failed to cancel order.";
      setToast({ message: detail, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminConfirm = async () => {
    if (!confirm("Confirm order completion?")) return;
    try {
      setActionLoading(true);
      const res = await api.post<Order>(`/orders/${orderId}/confirm`, {});
      setOrder(res.data);
      setToast({ message: "Order confirmed as completed.", type: "success" });
      await fetchData();
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Failed to confirm order.";
      setToast({ message: detail, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order? Stock will be restored.")) return;
    try {
      setActionLoading(true);
      const res = await api.post<Order>(`/orders/${orderId}/admin-cancel`, {});
      setOrder(res.data);
      setToast({ message: "Order cancelled. Stock has been restored.", type: "info" });
      await fetchData();
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
        return "bg-[#EAF7EE] text-[#1F9D55] dark:bg-[#1A2E22] dark:text-[#34D399]";
      case "pending":
        return "bg-[#FFF7E6] text-[#B9790A] dark:bg-[#2A2010] dark:text-[#FBBF24]";
      case "in_progress":
        return "bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#A5B4FC]";
      case "cancelled":
      case "failed":
      case "refunded":
        return "bg-[#FEE2E2] text-[#DC2626] dark:bg-[#2A1010] dark:text-[#FB7185]";
      default:
        return "bg-[var(--bg-input)] text-[var(--text-secondary)]";
    }
  };

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  const userRoles: string[] = user?.role 
    ? (Array.isArray(user.role) ? user.role : [user.role]) 
    : [];
  const isManager = userRoles.includes("admin") || userRoles.includes("manager");
  const isOrderOwner = order?.user_id === user?.id;

  if (loading) {
    return (
      <div className="relative min-h-screen bg-[var(--bg-main)] px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="skeleton" style={{ height: 40, width: 200, marginBottom: 32 }} />
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            <div className="skeleton" style={{ flex: 2, height: 300 }} />
            <div className="skeleton" style={{ flex: 1, height: 300 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!order || !payment) {
    return (
      <div className="relative min-h-screen bg-[var(--bg-main)] px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-input)] text-[var(--text-muted)]">
              <span className="text-2xl">❌</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">Order details not found</div>
              <p className="text-xs text-[var(--text-muted)]">The order you are looking for does not exist or has been removed.</p>
            </div>
            <button className="btn btn-primary btn-lg mt-4" onClick={() => router.push("/orders")}>
              Back to My Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[var(--bg-main)] px-4 py-8 sm:px-8">
      {/* Signature: Ambient gradient blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-[#FF5A1F]/8 to-transparent blur-3xl transition-opacity duration-500 dark:from-[#FF5A1F]/15" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-gradient-to-tr from-[#6366F1]/8 to-transparent blur-3xl transition-opacity duration-500 dark:from-[#6366F1]/15" />
      </div>

      <div className="mx-auto max-w-7xl">
        {/* Back Button */}
        <button
          className="btn btn-ghost btn-sm mb-6"
          onClick={() => router.push(isManager ? "/orders/manage" : "/orders")}
        >
          <ArrowLeft size={16} />
          Back to {isManager ? "Order Management" : "Orders"}
        </button>

        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1
              className="text-3xl font-bold text-[var(--text-primary)]"
              style={{ fontFamily: "'Baloo 2', sans-serif" }}
            >
              Order #{order.id}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {order.status === "in_progress"
                ? "Your order is being processed."
                : "Thank you for shopping with us!"}
            </p>
          </div>
          <span className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-bold uppercase tracking-wider ${getStatusBadgeClass(order.status)}`}>
            {order.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items Ordered */}
          <div className="lg:col-span-2 rounded-2xl bg-[var(--bg-card)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF4EC] text-[#E14E17] transition-all duration-300 dark:bg-[#2A1A10] dark:text-[#FB923C]">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
                    Items Ordered
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-[#FF5A1F]/40 via-[var(--border)] to-[#6366F1]/40 mb-6" />

              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Product</th>
                      <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Price</th>
                      <th className="text-center px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Quantity</th>
                      <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id} className="border-t border-[var(--border)]">
                        <td className="px-4 py-3">
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.product_name}</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>SKU: {item.product_sku}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)]">{formatPrice(item.price)}</td>
                        <td className="px-4 py-3 text-center text-sm text-[var(--text-secondary)]">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-[var(--accent)]">{formatPrice(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 16 }}>
                <div style={{ width: 240 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
                    <span style={{ color: "var(--text-secondary)" }}>Subtotal:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{formatPrice(order.total_amount)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
                    <span style={{ color: "var(--text-secondary)" }}>Shipping:</span>
                    <span className="font-semibold text-[var(--success)]">Free</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                    <span className="text-[var(--text-primary)]">Total Amount:</span>
                    <span style={{ color: "var(--accent)" }}>{formatPrice(order.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="rounded-2xl bg-[var(--bg-card)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F46E5] transition-all duration-300 dark:bg-[#1E1B4B] dark:text-[#A5B4FC]">
                  <Shield size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
                    Payment Info
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Method & status
                  </p>
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-[#6366F1]/40 via-[var(--border)] to-[#FF5A1F]/40 mb-6" />

              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Payment Method:</span>
                  <span className="font-semibold text-[var(--text-primary)]">{payment.method.toUpperCase()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Payment Status:</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(payment.status)}`}>
                    {payment.status}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Amount:</span>
                  <span className="font-semibold text-[var(--accent)]">{formatPrice(payment.amount)}</span>
                </div>
                {payment.paid_at && (payment.status === "completed" || payment.status === "refunded") && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                    <span style={{ color: "var(--text-secondary)" }}>Paid At:</span>
                    <span className="text-[var(--text-primary)]">{new Date(payment.paid_at).toLocaleString()}</span>
                  </div>
                )}
                {payment.refund_at && payment.status === "refunded" && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                    <span style={{ color: "var(--text-secondary)" }}>Refunded At:</span>
                    <span className="text-[var(--text-primary)]">{new Date(payment.refund_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Countdown timer - only for order owner */}
              {isOrderOwner && order.status === "pending" && payment.status === "pending" && timeLeft && (
                <div style={{ background: "var(--warning-bg)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: 12, padding: 16, textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: "var(--warning)", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Clock size={14} />
                    Payment expires in
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--warning)", letterSpacing: "-0.02em" }}>{timeLeft}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Please complete payment before timer reaches 0.</div>
                </div>
              )}

              {/* Pay Now & Cancel - only for order owner */}
              {isOrderOwner && order.status === "pending" && payment.status === "pending" && timeLeft !== "Expired" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <button className="btn btn-success btn-lg" style={{ width: "100%" }} onClick={handlePay} disabled={actionLoading}>
                    {actionLoading ? "Processing Payment..." : "Pay Now"}
                  </button>
                  <button className="btn btn-ghost" style={{ width: "100%", color: "var(--danger)", borderColor: "rgba(244, 63, 94, 0.2)" }} onClick={handleCancel} disabled={actionLoading}>
                    {actionLoading ? "Processing..." : "Cancel Order"}
                  </button>
                </div>
              )}

              {/* Retry payment - only for order owner */}
              {isOrderOwner && (payment.status === "failed" || payment.status === "cancelled" || timeLeft === "Expired") && order.status !== "completed" && order.status !== "in_progress" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <button className="btn btn-warning btn-lg" style={{ width: "100%", backgroundColor: "#f59e0b", borderColor: "#d97706", color: "#000" }} onClick={handleRetry} disabled={actionLoading}>
                    {actionLoading ? "Creating Payment..." : "Try Pay Again"}
                  </button>
                </div>
              )}

              {/* Manager actions - only when IN_PROGRESS */}
              {isManager && order.status === "in_progress" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                  <button className="btn btn-success btn-lg" style={{ width: "100%" }} onClick={handleAdminConfirm} disabled={actionLoading}>
                    {actionLoading ? "Processing..." : "Confirm Order"}
                  </button>
                  <button className="btn btn-danger btn-lg" style={{ width: "100%" }} onClick={handleAdminCancel} disabled={actionLoading}>
                    {actionLoading ? "Processing..." : "Cancel Order"}
                  </button>
                </div>
              )}

              {/* Status alert boxes */}
              {payment.status === "completed" && order.status === "in_progress" && (
                <div style={{ background: "var(--info-bg)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: 12, padding: 16, color: "var(--info)", fontSize: 14, display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
                  <span><Clock size={18} /></span>
                  <span>Payment successful! Your order is being processed. Please wait for manager confirmation.</span>
                </div>
              )}

              {order.status === "completed" && (
                <div style={{ background: "var(--success-bg)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 12, padding: 16, color: "var(--success)", fontSize: 14, display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
                  <span><CheckCircle2 size={18} /></span>
                  <span>This order has been completed.</span>
                </div>
              )}

              {(order.status === "cancelled" || payment.status === "failed" || payment.status === "refunded") && (
                <div style={{ background: "var(--danger-bg)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 12, padding: 16, color: "var(--danger)", fontSize: 14, display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
                  <span><XCircle size={18} /></span>
                  <span>This order has been cancelled or payment failed.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default withProtection(OrderDetailPage);