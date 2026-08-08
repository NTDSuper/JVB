"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, ShoppingBag, Tag, Percent, Truck, Shield, ChevronRight, CreditCard } from "lucide-react";
import api from "@/lib/api";
import Toast from "@/components/Toast";
import { Cart } from "@/types/dto";
import { withProtection } from "@/components/ProtectedRouter";

function CartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const { data: cart, isLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const res = await api.get<Cart>("/cart");
      return res.data;
    },
    staleTime: 1000 * 30,
  });

  const updateQuantity = async (itemId: number, newQty: number) => {
    if (newQty <= 0) {
      removeItem(itemId);
      return;
    }

    try {
      await api.patch<Cart>(`/cart/items/${itemId}`, { quantity: newQty });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setToast({ message: "Quantity updated.", type: "success" });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setToast({
        message: axiosErr.response?.data?.detail || "Failed to update quantity.",
        type: "error",
      });
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      await api.delete<Cart>(`/cart/items/${itemId}`);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setToast({ message: "Item removed from cart.", type: "success" });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setToast({
        message: axiosErr.response?.data?.detail || "Failed to remove item.",
        type: "error",
      });
    }
  };

  const clearCart = async () => {
    if (!confirm("Clear all items from your cart?")) return;

    try {
      await api.delete<Cart>("/cart");
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setToast({ message: "Cart cleared.", type: "success" });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setToast({
        message: axiosErr.response?.data?.detail || "Failed to clear cart.",
        type: "error",
      });
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || cart.items.length === 0) return;

    try {
      setCheckoutLoading(true);
      const res = await api.post("/orders/checkout", {
        payment_method: paymentMethod,
      });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setToast({ message: "Checkout successful. Redirecting to payment...", type: "success" });
      setTimeout(() => router.push(`/orders/${res.data.id}`), 900);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setToast({
        message: axiosErr.response?.data?.detail || "Checkout failed.",
        type: "error",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

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
              Shopping Cart
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Review items, adjust quantities, and place an order
            </p>
          </div>
          {!!cart?.items.length && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={clearCart}
              style={{ color: "var(--danger)", borderColor: "rgba(244, 63, 94, 0.25)" }}
            >
              <Trash2 size={14} />
              Clear Cart
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl bg-[var(--bg-card)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
              <div className="skeleton" style={{ height: 66, marginBottom: 14 }} />
              <div className="skeleton" style={{ height: 66, marginBottom: 14 }} />
              <div className="skeleton" style={{ height: 66 }} />
            </div>
            <div className="rounded-2xl bg-[var(--bg-card)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
              <div className="skeleton" style={{ height: 210 }} />
            </div>
          </div>
        ) : !cart || cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-input)] text-[var(--text-muted)]">
              <ShoppingBag size={32} strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">Your cart is empty</div>
              <p className="text-xs text-[var(--text-muted)]">
                Add products to your cart before checkout.
              </p>
            </div>
            <button className="btn btn-primary btn-lg mt-4" onClick={() => router.push("/products")}>
              Browse Products
              <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 rounded-2xl bg-[var(--bg-card)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF4EC] text-[#E14E17] transition-all duration-300 dark:bg-[#2A1A10] dark:text-[#FB923C]">
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
                      Cart Items
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      {cart.items.length} item{cart.items.length !== 1 ? "s" : ""} in your cart
                    </p>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-[#FF5A1F]/40 via-[var(--border)] to-[#6366F1]/40 mb-6" />

                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Product</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Price</th>
                        <th className="text-center px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Quantity</th>
                        <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Subtotal</th>
                        <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.items.map((item, idx) => (
                        <tr key={item.id} className="border-t border-[var(--border)] transition hover:bg-[var(--bg-hover)]">
                          <td className="px-4 py-3">
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                              <div
                                style={{
                                  width: 56,
                                  height: 56,
                                  borderRadius: "var(--radius-md)",
                                  overflow: "hidden",
                                  border: "1px solid var(--border)",
                                  background: "var(--bg-input)",
                                  flexShrink: 0,
                                }}
                              >
                                {item.product_image_url ? (
                                  <img
                                    src={item.product_image_url}
                                    alt={item.product_name}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                      display: "block",
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    <Tag size={20} />
                                  </div>
                                )}
                              </div>
                              <div>
                                <button
                                  onClick={() => router.push(`/products/${item.product_id}`)}
                                  style={{
                                    background: "transparent",
                                    border: 0,
                                    color: "var(--text-primary)",
                                    fontWeight: 700,
                                    padding: 0,
                                    textAlign: "left",
                                    fontSize: 14,
                                    lineHeight: 1.3,
                                    cursor: "pointer",
                                    transition: "color 200ms ease",
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                                >
                                  {item.product_name}
                                </button>
                                <div className="text-xs text-[var(--text-muted)]" style={{ marginTop: 2 }}>
                                  SKU: {item.product_sku}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">{formatPrice(item.product_price)}</td>
                          <td className="px-4 py-3">
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <div className="qty-stepper">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  aria-label="Decrease quantity"
                                >
                                  −
                                </button>
                                <input
                                  type="text"
                                  value={item.quantity}
                                  readOnly
                                  aria-label="Quantity"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  aria-label="Increase quantity"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-base font-bold text-[var(--accent)]">{formatPrice(item.subtotal)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => removeItem(item.id)}
                              style={{ color: "var(--danger)", borderColor: "rgba(244, 63, 94, 0.2)" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="rounded-2xl bg-[var(--bg-card)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] p-6 sticky top-24">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF7EE] text-[#1F9D55] transition-all duration-300 dark:bg-[#1A2E22] dark:text-[#34D399]">
                  <Percent size={18} />
                </div>
                <h2 className="text-base font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
                  Order Summary
                </h2>
              </div>
              <div className="h-px bg-gradient-to-r from-[#1F9D55]/40 via-[var(--border)] to-[#FF5A1F]/40 mb-6" />

              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="text-sm text-[var(--text-secondary)]">Subtotal</span>
                  <strong className="text-sm font-bold text-[var(--text-primary)]">{formatPrice(cart.total_amount)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="text-sm text-[var(--text-secondary)]" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Truck size={14} style={{ color: "var(--success)" }} />
                    Shipping
                  </span>
                  <strong className="text-sm font-bold text-[var(--success)]">Free</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: "1px solid var(--border)",
                    paddingTop: 16,
                    marginTop: 4,
                    fontSize: 20,
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                  }}
                >
                  <span className="text-[var(--text-primary)]">Total</span>
                  <span style={{ color: "var(--accent)" }}>{formatPrice(cart.total_amount)}</span>
                </div>
              </div>

              <form onSubmit={handleCheckout}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", marginBottom: 8 }}>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CreditCard size={14} />
                      Payment Method
                    </span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="form-input"
                      style={{ paddingRight: 36, appearance: "none", cursor: "pointer" }}
                    >
                      <option value="transfer">Bank Transfer</option>
                    </select>
                    <ChevronRight
                      size={16}
                      style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%) rotate(-90deg)",
                        pointerEvents: "none",
                        color: "var(--text-muted)",
                      }}
                    />
                  </div>
                </div>

                <div style={{ background: "var(--bg-hover)", borderRadius: "var(--radius-sm)", padding: "12px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text-secondary)" }}>
                  <Shield size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
                  <span>Secure checkout powered by our encrypted payment gateway.</span>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: "100%" }}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? "Processing Order..." : "Place Order"}
                </button>
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

export default withProtection(CartPage, ["user"]);