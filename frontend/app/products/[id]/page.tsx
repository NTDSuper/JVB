"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShoppingBag, Package, Tag, TrendingUp, Info, Shield } from "lucide-react";
import api from "@/lib/api";
import Toast from "@/components/Toast";
import { Product } from "@/types/dto";
import { getS3PublicUrl } from "@/lib/s3-url";
import { useAuthContext } from "@/auth/contexts/AuthContext";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthContext();
  const userRoles = user ? (Array.isArray(user.role) ? user.role : [user.role]) : [];
  const isBuyer = userRoles.includes("user");
  const showAddToCartSection = isAuthenticated ? isBuyer : true;

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
    if (!isAuthenticated) {
      setToast({
        message: "Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.",
        type: "info",
      });
      const currentPath = typeof window !== "undefined" ? window.location.pathname : `/products/${params.id}`;
      setTimeout(() => {
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      }, 600);
      return;
    }
    const userRoles = Array.isArray(user?.role) ? user.role : user?.role ? [user.role] : [];
    if (userRoles.length > 0 && !userRoles.includes("user")) {
      setToast({
        message: "Chỉ tài khoản khách hàng (user) mới có thể thêm sản phẩm vào giỏ hàng.",
        type: "error",
      });
      return;
    }
    try {
      setAdding(true);
      await api.post("/cart/add", { product_id: product.id, quantity });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setToast({ message: `Added ${quantity}x "${product.name}" to cart`, type: "success" });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setToast({ message: axiosErr.response?.data?.detail || "Failed to add to cart", type: "error" });
    } finally {
      setAdding(false);
    }
  };

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  if (loading) {
    return (
      <div className="relative min-h-screen bg-[var(--bg-main)] px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="skeleton" style={{ height: 40, width: 200, marginBottom: 32 }} />
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            <div className="skeleton" style={{ width: 400, height: 400, borderRadius: 16 }} />
            <div style={{ flex: 1, minWidth: 300 }}>
              <div className="skeleton" style={{ height: 32, width: "70%", marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 40, width: "30%", marginBottom: 24 }} />
              <div className="skeleton" style={{ height: 100, marginBottom: 16 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="relative min-h-screen bg-[var(--bg-main)] px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-input)] text-[var(--text-muted)]">
              <span className="text-2xl">❌</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">Product not found</div>
              <p className="text-xs text-[var(--text-muted)]">The product you are looking for does not exist or has been removed.</p>
            </div>
            <button className="btn btn-primary btn-lg mt-4" onClick={() => router.push("/products")}>
              Back to Products
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
          onClick={() => router.push("/products")}
        >
          <ArrowLeft size={16} />
          Back to Products
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Image */}
          <div className="rounded-2xl bg-[var(--bg-card)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] overflow-hidden transition-all duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.5)]">
            {/* Decorative top-edge gradient stripe */}
            
            
            <div style={{ position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
              {product.image_url ? (
                <img
                  src={getS3PublicUrl(product.image_url) || ""}
                  alt={product.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: 420,
                    objectFit: "cover",
                    display: "block",
                    transition: "transform 0.5s ease",
                  }}
                  className="group-hover:scale-105"
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    minHeight: 420,
                    borderRadius: "var(--radius-lg)",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Package size={80} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />
                </div>
              )}
              {/* Status badge on image */}
              <div style={{ position: "absolute", top: 16, left: 16 }}>
                <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                  product.status === "active"
                    ? "bg-[#EAF7EE] text-[#1F9D55]"
                    : "bg-[#FEE2E2] text-[#DC2626]"
                }`}>
                  {product.status}
                </span>
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Header */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
                  <Tag size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                  SKU: {product.sku}
                </span>
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", marginBottom: 12, letterSpacing: "-0.02em", lineHeight: 1.2, fontFamily: "'Baloo 2', sans-serif" }}>
                {product.name}
              </h1>
              <div style={{ fontSize: 40, fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.02em", fontFamily: "'Baloo 2', sans-serif" }}>
                {formatPrice(product.price)}
              </div>
            </div>

            {/* Stock & Status */}
            <div className="rounded-2xl bg-[var(--bg-card)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.5)]">
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-secondary)" }}>
                  <TrendingUp size={18} style={{ color: product.stock > 0 ? "var(--success)" : "var(--danger)" }} />
                  <strong style={{ color: product.stock > 0 ? "var(--success)" : "var(--danger)", fontSize: 18 }}>
                    {product.stock}
                  </strong>
                  <span>in stock</span>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
                  <Shield size={14} />
                  <span>Secure checkout</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="rounded-2xl bg-[var(--bg-card)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.5)]">
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Description
                </h3>
                <p style={{ fontSize: 15, color: "var(--text-primary)", lineHeight: 1.7 }}>
                  {product.description}
                </p>
              </div>
            )}

            {/* Attributes */}
            {product.attributes && product.attributes.length > 0 && (
              <div className="rounded-2xl bg-[var(--bg-card)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.5)]">
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Specifications
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {product.attributes.map((attr) => (
                    <div
                      key={attr.attribute_id}
                      style={{
                        background: "var(--bg-hover)",
                        border: "1px solid rgba(var(--primary-rgb), 0.15)",
                        borderRadius: "var(--radius-sm)",
                        padding: "8px 14px",
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Info size={12} style={{ color: "var(--text-muted)" }} />
                      <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>{attr.attribute_name}:</span>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{attr.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add to cart - hidden for Manager/Admin */}
            {showAddToCartSection && product.status === "active" && product.stock > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                <div className="qty-stepper">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))
                    }
                    aria-label="Quantity"
                  />
                  <button type="button" onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}>+</button>
                </div>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={addToCart}
                  disabled={adding}
                  style={{ flex: 1 }}
                >
                  <ShoppingBag size={18} />
                  {adding ? "Adding..." : "Add to Cart"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}