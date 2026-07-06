"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import Toast from "@/components/Toast";
import { Product } from "@/types/dto";

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedKeyword, setSearchedKeyword] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", searchedKeyword],
    queryFn: async () => {
      if (searchedKeyword) {
        const res = await api.get<Product[]>(
          `/products/search?keyword=${encodeURIComponent(searchedKeyword)}`
        );
        return res.data;
      }
      const res = await api.get<Product[]>("/products/all?skip=0&limit=20");
      return res.data;
    },
    staleTime: 1000 * 60 * 1,
  });

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      setSearchedKeyword(searchQuery.trim());
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
  }, []);

  const addToCart = async (product: Product) => {
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
          <div className="product-grid">
            {products.map((product) => (
              <div key={product.id} className="product-card animate-fade-in">
                <div
                  onClick={() => router.push(`/products/${product.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
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
              </div>
            ))}
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