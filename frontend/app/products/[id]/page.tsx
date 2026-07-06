"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRouter";
import Toast from "@/components/Toast";
import { Product } from "@/types/dto";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get<Product>(`/products/${params.id}`);
        setProduct(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [params.id]);

  const addToCart = async () => {
    if (!product) return;
    try {
      setAdding(true);
      await api.post("/cart/add", {
        product_id: product.id,
        quantity,
      });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setToast({
        message: `Added ${quantity}x "${product.name}" to cart`,
        type: "success",
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setToast({
        message: axiosErr.response?.data?.detail || "Failed to add to cart",
        type: "error",
      });
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="page-container">
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            <div className="skeleton" style={{ width: 400, height: 400, borderRadius: 16 }} />
            <div style={{ flex: 1, minWidth: 300 }}>
              <div className="skeleton" style={{ height: 32, width: "70%", marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 40, width: "30%", marginBottom: 24 }} />
              <div className="skeleton" style={{ height: 100, marginBottom: 16 }} />
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!product) {
    return (
      <ProtectedRoute>
        <div className="page-container">
          <div className="empty-state">
            <div className="empty-state-icon">❌</div>
            <div className="empty-state-title">Product not found</div>
            <button className="btn btn-primary" onClick={() => router.push("/products")}>
              Back to Products
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
          onClick={() => router.push("/products")}
          style={{ marginBottom: 24 }}
        >
          ← Back to Products
        </button>

        <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
          {/* Image */}
          <div style={{ flex: "0 0 auto", width: 400, maxWidth: "100%" }}>
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                style={{
                  width: "100%",
                  height: 400,
                  objectFit: "cover",
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: 400,
                  borderRadius: 16,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 80,
                }}
              >
                📦
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 300 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <span className={`badge ${product.status === "active" ? "badge-success" : "badge-danger"}`}>
                {product.status}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                SKU: {product.sku}
              </span>
            </div>

            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                marginBottom: 12,
                color: "var(--text-primary)",
              }}
            >
              {product.name}
            </h1>

            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: "#06b6d4",
                marginBottom: 20,
              }}
            >
              ${product.price.toFixed(2)}
            </div>

            {product.description && (
              <div className="card" style={{ marginBottom: 20 }}>
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: 8,
                  }}
                >
                  Description
                </h3>
                <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>
                  {product.description}
                </p>
              </div>
            )}

            {/* Attributes */}
            {product.attributes && product.attributes.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: 12,
                  }}
                >
                  Attributes
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {product.attributes.map((attr) => (
                    <div
                      key={attr.attribute_id}
                      style={{
                        background: "rgba(99, 102, 241, 0.1)",
                        border: "1px solid rgba(99, 102, 241, 0.2)",
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>
                        {attr.attribute_name}:
                      </span>{" "}
                      <span style={{ fontWeight: 600 }}>{attr.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stock info */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                <strong style={{ color: product.stock > 0 ? "#10b981" : "#ef4444" }}>
                  {product.stock}
                </strong>{" "}
                in stock
              </div>
              {product.category_id && (
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Category ID: {product.category_id}
                </div>
              )}
            </div>

            {/* Add to cart */}
            {product.status === "active" && product.stock > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="qty-stepper">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1))
                      )
                    }
                    aria-label="Quantity"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  >
                    +
                  </button>
                </div>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={addToCart}
                  disabled={adding}
                  style={{ flex: 1 }}
                >
                  {adding ? "Adding..." : "Add to Cart"}
                </button>
              </div>
            )}
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
