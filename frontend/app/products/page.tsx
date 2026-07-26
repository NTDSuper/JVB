"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import Toast from "@/components/Toast";
import { Product } from "@/types/dto";
import { getS3PublicUrl } from "@/lib/s3-url";
import { useAuthContext } from "@/auth/contexts/AuthContext";

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthContext();
  const userRoles = user ? (Array.isArray(user.role) ? user.role : [user.role]) : [];
  const isManagerOrAdmin = userRoles.some((r) => r === "manager" || r === "admin");
  const isBuyer = userRoles.includes("user");
  const canAddToCart = !isAuthenticated || isBuyer; // Guest gets redirect, User can add, Manager/Admin hidden
  const showAddToCartButton = isAuthenticated ? isBuyer : true; // Guest sees button (redirects on click), Manager/Admin don't see button
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedKeyword, setSearchedKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["products", searchedKeyword, page],
    queryFn: async () => {
      if (searchedKeyword) {
        const res = await api.get<Product[]>(
          `/products/search?keyword=${encodeURIComponent(searchedKeyword)}`
        );
        return { items: res.data, total: res.data.length, skip: 0, limit: res.data.length };
      }
      const skip = page * PAGE_SIZE;
      const res = await api.get<{ items: Product[]; total: number; skip: number; limit: number }>(
        `/products/all?skip=${skip}&limit=${PAGE_SIZE}`
      );
      return res.data;
    },
    staleTime: 1000 * 60 * 1,
  });

  const products = data?.items ?? [];
  const totalProducts = data?.total ?? 0;
  const totalPages = Math.ceil(totalProducts / PAGE_SIZE);

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      setSearchedKeyword(searchQuery.trim());
      setPage(0);
    }
  }, [searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchedKeyword("");
    setPage(0);
  }, []);

  const handlePreviousPage = () => {
    setPage((prev) => Math.max(0, prev - 1));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleNextPage = () => {
    setPage((prev) => Math.min(totalPages - 1, prev + 1));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const addToCart = async (product: Product) => {
    if (!isAuthenticated) {
      setToast({
        message: "Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.",
        type: "info",
      });
      const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/products";
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
      await api.post("/cart/add", {
        product_id: product.id,
        quantity: 1,
      });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setToast({ message: `Added "${product.name}" to cart`, type: "success" });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setToast({
        message: axiosErr.response?.data?.detail || "Failed to add to cart",
        type: "error",
      });
    }
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  // Generate page number buttons (show max 5 pages around current)
  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      let start = Math.max(1, page - 2);
      let end = Math.min(totalPages - 2, page + 2);
      if (page <= 2) {
        start = 1;
        end = 4;
      } else if (page >= totalPages - 3) {
        start = totalPages - 5;
        end = totalPages - 2;
      }
      if (start > 1) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 2) pages.push("...");
      pages.push(totalPages - 1);
    }
    return pages;
  };

  return (
    <>
      <div className="page-container">
        <div style={{ marginBottom: 32 }}>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">
            Browse our wide range of supermarket products
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28, maxWidth: 600, alignItems: "center" }}>
          <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
            <span className="search-icon" aria-hidden="true">&#128269;</span>
            <input
              suppressHydrationWarning
              type="text"
              placeholder="Search products by name, SKU, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={isLoading}
            style={{ height: 44, whiteSpace: "nowrap" }}
          >
            Search
          </button>
        </div>

        {/* Show searched keyword indicator */}
        {searchedKeyword && (
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            Showing results for: <strong>{searchedKeyword}</strong>
            {" "}(<a href="#" onClick={(e) => { e.preventDefault(); clearSearch(); }} style={{ color: "var(--primary)" }}>Clear</a>)
          </div>
        )}

        {/* Products count info */}
        {!isLoading && totalProducts > 0 && (
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            {searchedKeyword
              ? `Found ${totalProducts} product${totalProducts !== 1 ? "s" : ""}`
              : `Showing page ${page + 1} of ${totalPages} `
            }
          </div>
        )}

        {/* Products Grid */}
        {isLoading ? (
          <div className="product-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card" style={{ padding: 0 }}>
                <div className="skeleton" style={{ height: 180 }} />
                <div style={{ padding: 16 }}>
                  <div
                    className="skeleton"
                    style={{ height: 18, marginBottom: 8 }}
                  />
                  <div className="skeleton" style={{ height: 24, width: "50%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">No results</div>
            <div className="empty-state-title">No products found</div>
            <div className="empty-state-text">
              {searchedKeyword
                ? `No results for "${searchedKeyword}". Try a different keyword.`
                : "No products available at the moment."}
            </div>
          </div>
        ) : (
          <>
            <div className="product-grid">
              {products.map((product) => (
                <div key={product.id} className="product-card animate-fade-in">
                  <div
                    onClick={() => router.push(`/products/${product.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    {product.image_url ? (
                      <img
                        src={getS3PublicUrl(product.image_url) || ""}
                        alt={product.name}
                        style={{
                          width: "100%",
                          height: 180,
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div className="product-card-image">No image</div>
                    )}
                    <div className="product-card-body">
                      <div className="product-card-name">{product.name}</div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          marginBottom: 8,
                        }}
                      >
                        SKU: {product.sku}
                      </div>
                      <div className="product-card-price">
                        {formatPrice(product.price)}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          className={`badge ${
                            product.status === "active"
                              ? "badge-success"
                              : product.status === "archived"
                              ? "badge-neutral"
                              : "badge-danger"
                          }`}
                        >
                          {product.status}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                          }}
                        >
                          Stock: {product.stock}
                        </span>
                      </div>
                    </div>
                  </div>
                  {showAddToCartButton && (
                    <div className="product-card-footer">
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ width: "100%" }}
                        disabled={
                          product.status !== "active" || product.stock <= 0
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                      >
                        {product.stock <= 0 ? "Out of Stock" : "Add to Cart"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {!searchedKeyword && totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={handlePreviousPage}
                  disabled={page === 0}
                >
                  &laquo; Previous
                </button>

                <div className="pagination-pages">
                  {getPageNumbers().map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                        ...
                      </span>
                    ) : (
                      <button
                        key={p}
                        className={`pagination-page-btn ${p === page ? "active" : ""}`}
                        onClick={() => {
                          setPage(p);

                          window.scrollTo({
                            top: 0,
                            behavior: "smooth",
                          });
                        }}
                      >
                        {p + 1}
                      </button>
                    )
                  )}
                </div>

                <button
                  className="pagination-btn"
                  onClick={handleNextPage}
                  disabled={page >= totalPages - 1}
                >
                  Next &raquo;
                </button>
              </div>
            )}
          </>
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