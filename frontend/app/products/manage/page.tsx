"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/api";
import { Product } from "@/types/dto";
import { withProtection } from "@/components/ProtectedRouter";
import SummaryCard from "../../dashboard/components/SummaryCard";
import Table from "../../dashboard/components/Table";
import ProductForm from "../../dashboard/components/ProductForm";
import DeleteModal from "../../dashboard/components/DeleteModal";

const PAGE_SIZE = 20;

const emptyProduct: Partial<Product> = {
  sku: "",
  name: "",
  description: "",
  price: undefined,
  cost_price: undefined,
  category_id: undefined,
  stock: undefined,
  image_url: "",
  status: "active",
};

const getImageKey = (imageUrl?: string): string => {
    if (!imageUrl) return "";

    try {
      return new URL(imageUrl).pathname.slice(1);
    } catch {
      return imageUrl;
    }
  };

function buildProductPayload(data: Partial<Product>) {
  const payload: Record<string, any> = {
    sku: data.sku,
    name: data.name,
    description: data.description || null,
    price: data.price,
    cost_price: data.cost_price ?? null,
    category_id: data.category_id ?? null,
    stock: data.stock,
    image_url: getImageKey(data.image_url)|| null,
    status: data.status || "active",
  };

  const attrs = data.attributes?.filter(a => a.value) || [];
  if (attrs.length > 0) {
    payload.attributes = attrs.map(a => ({
      name: a.attribute_name,
      value: a.value || ""
    }));
  }

  return payload;
}

function ProductManagePage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<Product>>(emptyProduct);
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const response = await api.get<{ items: Product[]; total: number }>(
        "/products/all?skip=0&limit=1000"
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 1,
  });

  const { data, isLoading: tableLoading } = useQuery({
    queryKey: ["dashboard-products", page],
    queryFn: async () => {
      const skip = page * PAGE_SIZE;
      const response = await api.get<{ items: Product[]; total: number; skip: number; limit: number }>(
        `/products/all?skip=${skip}&limit=${PAGE_SIZE}`
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 1,
  });

  const products = data?.items ?? [];
  const totalProducts = data?.total ?? 0;
  const totalPages = Math.ceil(totalProducts / PAGE_SIZE);

  const allProducts = summaryData?.items ?? [];
  const totalAllProducts = summaryData?.total ?? 0;
  const totalAllStock = allProducts.reduce((sum, item) => sum + item.stock, 0);
  const totalActiveProducts = allProducts.filter((item) => item.status === "active").length;
  const totalLowStock = allProducts.filter((item) => item.stock > 0 && item.stock <= 10).length;

  const isLoading = summaryLoading || tableLoading;

  const handleChange = (field: keyof Product, value: string | number | undefined) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.sku || !formData.name) return "SKU and name are required.";
    if (formData.price === undefined || Number(formData.price) < 0) {
      return "Price must be zero or greater.";
    }
    if (formData.stock === undefined || Number(formData.stock) < 0) {
      return "Stock must be zero or greater.";
    }
    return "";
  };

  const resetForm = () => {
    setEditing(false);
    setFormData(emptyProduct);
  };

  const handleCreate = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      await api.post("/products/new", buildProductPayload(formData));
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["dashboard-products"] });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Unable to create product.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditing(true);
    setError("");
    setFormData(product);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdate = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!formData.id) return;

    try {
      setSaving(true);
      setError("");
      await api.patch(`/products/update/${formData.id}`, buildProductPayload(formData));
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["dashboard-products"] });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Unable to update product.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
    setShowDelete(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProduct) return;

    try {
      setSaving(true);
      setError("");
      await api.delete(`/products/${selectedProduct.id}`);
      setShowDelete(false);
      setSelectedProduct(null);
      queryClient.invalidateQueries({ queryKey: ["dashboard-products"] });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Unable to delete product.");
    } finally {
      setSaving(false);
    }
  };

  const handlePreviousPage = () => {
    setPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

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
    <div className="relative min-h-screen bg-[var(--bg-main)] px-4 py-8 sm:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-[#FF5A1F]/8 to-transparent blur-3xl transition-opacity duration-500 dark:from-[#FF5A1F]/15" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-gradient-to-tr from-[#6366F1]/8 to-transparent blur-3xl transition-opacity duration-500 dark:from-[#6366F1]/15" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <h1
            className="text-3xl font-bold text-[var(--text-primary)]"
            style={{ fontFamily: "'Baloo 2', sans-serif" }}
          >
            Product Manager
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create products, monitor inventory, and keep the catalog tidy
          </p>
        </div>

        {error && (
          <div
            className="mb-6 rounded-2xl border p-4 animate-fade-in"
            style={{
              borderColor: "rgba(239, 68, 68, 0.32)",
              color: "var(--danger)",
              background: "var(--danger-bg)",
            }}
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl bg-[var(--bg-card)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.5)]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Products</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
              {isLoading ? "..." : totalAllProducts}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Total catalog rows</p>
          </div>

          <div className="rounded-2xl bg-[var(--bg-card)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.5)]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Total Stock</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
              {isLoading ? "..." : totalAllStock}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Units across all products</p>
          </div>

          <div className="rounded-2xl bg-[var(--bg-card)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.5)]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Active Products</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
              {isLoading ? "..." : totalActiveProducts}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Visible to shoppers</p>
          </div>

          <div className="rounded-2xl bg-[var(--bg-card)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.5)]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Low Stock</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
              {isLoading ? "..." : totalLowStock}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">10 units or fewer</p>
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--bg-card)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.5)]">
          <div className="p-6">
            <ProductForm
              formData={formData}
              editing={editing}
              busy={saving}
              onChange={handleChange}
              onCancelEdit={resetForm}
              onSubmit={editing ? handleUpdate : handleCreate}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl bg-[var(--bg-card)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
            <div className="skeleton" style={{ height: 56, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 56, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 56 }} />
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-[var(--bg-card)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
              <Table products={products} onEdit={handleEdit} onDelete={handleDeleteClick} />

              {totalPages > 1 && (
                <div className="mt-6 pt-6 border-t border-[var(--border)]">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={handlePreviousPage}
                      disabled={page === 0}
                      className="px-4 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:border-[var(--primary)] hover:text-[var(--text-primary)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      &laquo; Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((p, idx) =>
                        p === "..." ? (
                          <span key={`ellipsis-${idx}`} className="px-2 text-[var(--text-muted)]">
                            ...
                          </span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`min-w-[40px] h-10 rounded-lg text-sm font-semibold transition-all ${
                              p === page
                                ? "bg-[var(--primary)] text-white shadow-[var(--shadow-primary)]"
                                : "bg-transparent border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:border-[var(--primary)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            {p + 1}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      onClick={handleNextPage}
                      disabled={page >= totalPages - 1}
                      className="px-4 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:border-[var(--primary)] hover:text-[var(--text-primary)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next &raquo;
                    </button>
                  </div>
                </div>
              )}

              {totalProducts > 0 && (
                <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>
                  Page {page + 1} of {totalPages}
                </div>
              )}
            </div>
          </>
        )}

        <DeleteModal
          open={showDelete}
          onClose={() => setShowDelete(false)}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    </div>
  );
}

export default withProtection(ProductManagePage, ["admin", "manager", "staff"]);