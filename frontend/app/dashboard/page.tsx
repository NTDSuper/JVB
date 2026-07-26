"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/api";
import { Product } from "@/types/dto";
import { withProtection } from "@/components/ProtectedRouter";
import SummaryCard from "./components/SummaryCard";
import Chart from "./components/Chart";
import Table from "./components/Table";
import ProductForm from "./components/ProductForm";
import DeleteModal from "./components/DeleteModal";

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

function buildProductPayload(data: Partial<Product>) {
  const payload: Record<string, any> = {
    sku: data.sku,
    name: data.name,
    description: data.description || null,
    price: data.price,
    cost_price: data.cost_price ?? null,
    category_id: data.category_id ?? null,
    stock: data.stock,
    image_url: data.image_url || null,
    status: data.status || "active",
  };

  // Only include attributes if there are actual values to send
  const attrs = data.attributes?.filter(a => a.value) || [];
  if (attrs.length > 0) {
    payload.attributes = attrs.map(a => ({
      name: a.attribute_name,
      value: a.value || ""
    }));
  }

  return payload;
}

function DashboardPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<Product>>(emptyProduct);
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);

  // Fetch all products for summary stats (entire supermarket)
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

  // Fetch paginated products for the table
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

  // Summary stats across ALL products
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
        <div className="section-header">
          <div>
            <h1 className="page-title">Product Manager</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>
              Create products, monitor inventory, and keep the catalog tidy.
            </p>
          </div>
        </div>

        {error && (
          <div
            className="card"
            style={{
              marginBottom: 18,
              borderColor: "rgba(239, 68, 68, 0.32)",
              color: "#fca5a5",
            }}
          >
            {error}
          </div>
        )}

        <div className="dashboard-grid" style={{ marginBottom: 18 }}>
          <SummaryCard title="Products" value={isLoading ? "..." : totalAllProducts} hint="Total catalog rows" />
          <SummaryCard title="Total Stock" value={isLoading ? "..." : totalAllStock} hint="Units across all products" />
          <SummaryCard title="Active Products" value={isLoading ? "..." : totalActiveProducts} hint="Visible to shoppers" />
          <SummaryCard title="Low Stock" value={isLoading ? "..." : totalLowStock} hint="10 units or fewer" />
        </div>

        <div style={{ marginBottom: 18 }}>
          <Chart />
        </div>

        <div style={{ marginBottom: 18 }}>
          <ProductForm
            formData={formData}
            editing={editing}
            busy={saving}
            onChange={handleChange}
            onCancelEdit={resetForm}
            onSubmit={editing ? handleUpdate : handleCreate}
          />
        </div>

        {isLoading ? (
          <div className="card">
            <div className="skeleton" style={{ height: 56, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 56, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 56 }} />
          </div>
        ) : (
          <>
            <Table products={products} onEdit={handleEdit} onDelete={handleDeleteClick} />

            {/* Pagination */}
            {totalPages > 1 && (
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
                        onClick={() => setPage(p)}
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

            {/* Page info */}
            {totalProducts > 0 && (
              <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>
                Page {page + 1} of {totalPages}
              </div>
            )}
          </>
        )}

        <DeleteModal
          open={showDelete}
          onClose={() => setShowDelete(false)}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    </>
  );
}

export default withProtection(DashboardPage, ["admin", "manager", "staff"]);