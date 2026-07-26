"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
    <>
      <div className="page-container">
        <div className="section-header">
          <div>
            <h1 className="page-title">Shopping Cart</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>
              Review items, adjust quantities, and place an order.
            </p>
          </div>
          {!!cart?.items.length && (
            <button
              className="btn btn-ghost"
              onClick={clearCart}
              style={{ color: "var(--danger)", borderColor: "rgba(239, 68, 68, 0.25)" }}
            >
              Clear Cart
            </button>
          )}
        </div>

        {isLoading ? (
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div className="card" style={{ flex: "2 1 420px" }}>
              <div className="skeleton" style={{ height: 66, marginBottom: 14 }} />
              <div className="skeleton" style={{ height: 66, marginBottom: 14 }} />
              <div className="skeleton" style={{ height: 66 }} />
            </div>
            <div className="card" style={{ flex: "1 1 280px" }}>
              <div className="skeleton" style={{ height: 210 }} />
            </div>
          </div>
        ) : !cart || cart.items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">Empty</div>
            <div className="empty-state-title">Your cart is empty</div>
            <p className="empty-state-text" style={{ marginBottom: 24 }}>
              Add products to your cart before checkout.
            </p>
            <button className="btn btn-primary" onClick={() => router.push("/products")}>
              Browse Products
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div className="card table-card" style={{ flex: "2 1 520px" }}>
              <div className="table-card-header">
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>Cart Items</h2>
                  <p className="muted" style={{ fontSize: 13 }}>
                    {cart.items.length} item{cart.items.length === 1 ? "" : "s"} selected
                  </p>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th style={{ textAlign: "center" }}>Quantity</th>
                      <th style={{ textAlign: "right" }}>Subtotal</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {item.product_image_url ? (
                              <img
                                src={item.product_image_url}
                                alt={item.product_name}
                                style={{
                                  width: 52,
                                  height: 52,
                                  objectFit: "cover",
                                  borderRadius: 8,
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 52,
                                  height: 52,
                                  borderRadius: 8,
                                  background: "var(--bg-input)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "var(--text-muted)",
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                Item
                              </div>
                            )}
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
                                }}
                              >
                                {item.product_name}
                              </button>
                              <div className="muted" style={{ fontSize: 12 }}>
                                SKU: {item.product_sku}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{formatPrice(item.product_price)}</td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                            }}
                          >
                            <button className="btn btn-ghost btn-sm" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                              -
                            </button>
                            <span style={{ minWidth: 28, textAlign: "center", fontWeight: 800 }}>
                              {item.quantity}
                            </span>
                            <button className="btn btn-ghost btn-sm" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                              +
                            </button>
                          </div>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "var(--accent)" }}>
                          {formatPrice(item.subtotal)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => removeItem(item.id)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card" style={{ alignSelf: "start", flex: "1 1 300px" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
                Order Summary
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">Subtotal</span>
                  <strong>{formatPrice(cart.total_amount)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">Shipping</span>
                  <strong style={{ color: "var(--success)" }}>Free</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: "1px solid var(--border)",
                    paddingTop: 14,
                    fontSize: 18,
                    fontWeight: 800,
                  }}
                >
                  <span>Total</span>
                  <span style={{ color: "var(--accent)" }}>{formatPrice(cart.total_amount)}</span>
                </div>
              </div>

              <form onSubmit={handleCheckout}>
                <label style={{ display: "block", marginBottom: 18 }}>
                  <span className="form-label">Payment Method</span>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="form-input"
                  >
                    <option value="transfer">Bank Transfer</option>
                  </select>
                </label>

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
    </>
  );
}

export default withProtection(CartPage, ["user"]);