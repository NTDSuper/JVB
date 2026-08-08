"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Product, Category } from "@/types/dto";
import { withProtection } from "@/components/ProtectedRouter";
import ProductFilter from "../components/ProductFilter";
import ProductStats from "../components/ProductStats";
import ProductTable from "../components/ProductTable";
import ProductFormModal from "../components/ProductFormModal";
import ProductDialog from "../components/ProductDialog";
import DeleteModal from "@/app/dashboard/components/DeleteModal";

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
  barcode: "",
  brand: "",
  unit: "",
  expiry_date: "",
};

function ProductManagerPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Form state
  const [formData, setFormData] = useState<Partial<Product>>(emptyProduct);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // UI state
  const [showDelete, setShowDelete] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Filters
  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    category_id: "",
    status: "",
  });

  interface FilterOptions {
    search: string;
    category_id: string;
    status: string;
  }

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get<Category[]>("/products/categories/all");
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch all products once and filter client-side (search, category, status)
  const { data, isLoading: tableLoading } = useQuery({
    queryKey: ["products-all"],
    queryFn: async () => {
      const response = await api.get<{ items: Product[]; total: number }>(
        "/products/all?skip=0&limit=1000"
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 1,
  });

  const allFetchedProducts = data?.items ?? [];

  // Client-side filtering
  const filteredProducts = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase();
    return allFetchedProducts.filter((p) => {
      if (filters.category_id && String(p.category_id) !== filters.category_id) return false;
      if (filters.status) {
        if (filters.status === "out_of_stock") {
          if (p.stock > 0) return false;
        } else if (p.status !== filters.status) {
          return false;
        }
      }
      if (keyword) {
        const haystack = `${p.name} ${p.sku} ${p.description ?? ""}`.toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    });
  }, [allFetchedProducts, filters]);

  const totalProducts = filteredProducts.length;
  const totalPages = Math.ceil(totalProducts / PAGE_SIZE);
  const products = filteredProducts.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  // Stats (reuse the same fetched products)
  const allProducts = allFetchedProducts;
  const stats = useMemo(() => {
    const items = allProducts;
    const totalStock = items.reduce((sum, item) => sum + item.stock, 0);
    const totalActive = items.filter((item) => item.status === "active").length;
    const totalLowStock = items.filter((item) => item.stock > 0 && item.stock <= 10).length;
    const totalValue = items.reduce((sum, item) => sum + (item.cost_price || item.price) * item.stock, 0);
    const avgPrice = items.length > 0 ? items.reduce((sum, item) => sum + item.price, 0) / items.length : 0;
    return {
      totalProducts: items.length,
      totalStock,
      totalActive,
      totalLowStock,
      totalValue,
      avgPrice,
    };
  }, [allProducts]);

  const isLoading = tableLoading;

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    setPage(0);
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      category_id: "",
      status: "",
    });
    setPage(0);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleChange = (field: keyof Product, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.sku?.trim()) return "SKU is required";
    if (!formData.name?.trim()) return "Product name is required";
    if (formData.price === undefined || formData.price < 0) return "Price must be 0 or greater";
    if (formData.stock === undefined || Number(formData.stock) < 0) return "Stock must be 0 or greater";
    return "";
  };

  const resetForm = () => {
    setEditing(false);
    setFormData(emptyProduct);
    setError("");
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
      const payload: any = {
        sku: formData.sku,
        name: formData.name,
        description: formData.description || null,
        price: formData.price,
        cost_price: formData.cost_price ?? null,
        category_id: formData.category_id ?? null,
        stock: formData.stock,
        image_url: formData.image_url || null,
        status: formData.status || "active",
        barcode: formData.barcode || null,
        brand: formData.brand || null,
        unit: formData.unit || null,
        expiry_date: formData.expiry_date || null,
      };

      const attrs = formData.attributes?.filter((a) => a.value) || [];
      if (attrs.length > 0) {
        payload.attributes = attrs.map((a) => ({
          name: a.attribute_name,
          value: a.value || "",
        }));
      }

      await api.post("/products/new", payload);
      resetForm();
      setShowForm(false);
      queryClient.invalidateQueries();
      showToast("success", "Product created successfully");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Unable to create product.");
      showToast("error", "Failed to create product");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditing(true);
    setError("");
    setFormData(product);
    setShowForm(true);
  };

  const getImageKey = (imageUrl?: string): string | null => {
    if (!imageUrl) return null;

    try {
      // Nếu là URL S3 thì lấy phần path
      return new URL(imageUrl).pathname.slice(1);
    } catch {
      // Nếu đã là "products/xxx.jpg" thì giữ nguyên
      return imageUrl;
    }
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
      const payload: any = {
        sku: formData.sku,
        name: formData.name,
        description: formData.description || null,
        price: formData.price,
        cost_price: formData.cost_price ?? null,
        category_id: formData.category_id ?? null,
        stock: formData.stock,
        image_url: getImageKey(formData.image_url) || null,
        status: formData.status || "active",
        barcode: formData.barcode || null,
        brand: formData.brand || null,
        unit: formData.unit || null,
        expiry_date: formData.expiry_date || null,
      };

      const attrs = formData.attributes?.filter((a) => a.value) || [];
      if (attrs.length > 0) {
        payload.attributes = attrs.map((a) => ({
          name: a.attribute_name,
          value: a.value || "",
        }));
      }

      await api.patch(`/products/update/${formData.id}`, payload);
      resetForm();
      queryClient.invalidateQueries();
      showToast("success", "Product updated successfully");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Unable to update product.");
      showToast("error", "Failed to update product");
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
      queryClient.invalidateQueries();
      showToast("success", "Product deleted successfully");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Unable to delete product.");
      showToast("error", "Failed to delete product");
    } finally {
      setSaving(false);
    }
  };

  const handleView = (product: Product) => {
    setViewProduct(product);
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      setSaving(true);
      await Promise.all(ids.map((id) => api.delete(`/products/${id}`)));
      queryClient.invalidateQueries();
      showToast("success", `Deleted ${ids.length} products`);
    } catch {
      showToast("error", "Failed to delete some products");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkStatusChange = async (ids: number[], status: string) => {
    try {
      setSaving(true);
      await Promise.all(
        ids.map((id) => api.patch(`/products/status/${id}`, { status }))
      );
      queryClient.invalidateQueries();
      showToast("success", `Updated ${ids.length} products to ${status}`);
    } catch {
      showToast("error", "Failed to update products");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-main)] px-4 py-8 sm:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-[#FF5A1F]/8 to-transparent blur-3xl transition-opacity duration-500 dark:from-[#FF5A1F]/15" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-gradient-to-tr from-[#6366F1]/8 to-transparent blur-3xl transition-opacity duration-500 dark:from-[#6366F1]/15" />
      </div>

      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
              Product Manager
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Manage your product catalog, inventory, and pricing
            </p>
          </div>
        <div className="flex gap-2 flex-wrap">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditing(false);
                setFormData(emptyProduct);
                setError("");
                setShowForm(true);
              }}
            >
              + Add Product
            </button>
          </div>
        </div>

        {/* Error Banner */}
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

        {/* Toast */}
        {toast && (
          <div
            className={`toast-container visible fixed top-4 right-4 z-50 animate-slide-in-right`}
            style={{ maxWidth: 420 }}
          >
            <div className={`toast-inner ${toast.type}`}>
              <span className="toast-icon">
                {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}
              </span>
              <span>{toast.message}</span>
              <button className="toast-close" onClick={() => setToast(null)}>
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        {/* <div className="mb-6">
          <ProductStats stats={stats} isLoading={isLoading} />
        </div> */}

        {/* Filter */}
        <div className="mb-6">
          <ProductFilter
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            activeFilters={filters}
          />
        </div>

        {/* Form Modal */}
        <ProductFormModal
          open={showForm}
          onClose={() => {
            setShowForm(false);
            resetForm();
          }}
          formData={formData}
          editing={editing}
          busy={saving}
          onChange={handleChange}
          onCancelEdit={() => {
            setShowForm(false);
            resetForm();
          }}
          onSubmit={editing ? handleUpdate : handleCreate}
        />

        {/* Table */}
        <ProductTable
          products={products}
          loading={isLoading}
          categories={categories}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onView={handleView}
          onBulkDelete={handleBulkDelete}
          onBulkStatusChange={handleBulkStatusChange}
          page={page}
          totalPages={totalPages}
          totalItems={totalProducts}
          onPageChange={setPage}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
        />

        {/* View Dialog */}
        <ProductDialog
          open={!!viewProduct}
          onClose={() => setViewProduct(null)}
          product={viewProduct || {} as Product}
          categories={categories}
        />

        {/* Delete Modal */}
        <DeleteModal
          open={showDelete}
          onClose={() => setShowDelete(false)}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    </div>
  );
}

export default withProtection(ProductManagerPage, ["admin", "manager"]);