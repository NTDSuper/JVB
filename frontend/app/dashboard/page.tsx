"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/api";
import { Product } from "@/types/dto";
import ProtectedRoute from "@/components/ProtectedRouter";
import SummaryCard from "./components/SummaryCard";
import Chart from "./components/Chart";
import Table from "./components/Table";
import ProductForm from "./components/ProductForm";
import DeleteModal from "./components/DeleteModal";

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

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<Product>>(emptyProduct);
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["dashboard-products"],
    queryFn: async () => {
      const response = await api.get<Product[]>("/products/all?skip=0&limit=20");
      return response.data;
    },
    staleTime: 1000 * 60 * 1,
  });

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

  const totalStock = products.reduce((sum, item) => sum + item.stock, 0);
  const activeProducts = products.filter((item) => item.status === "active").length;
  const lowStock = products.filter((item) => item.stock > 0 && item.stock <= 10).length;

  return (
    <ProtectedRoute roles = {["admin", "manager"]}>
      <div className="page-container">
        <div className="section-header">
          <div>
            <h1 className="page-title">Product Manager</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>
              Create products, monitor inventory, and keep the catalog tidy.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={() => queryClient.invalidateQueries({ queryKey: ["dashboard-products"] })} disabled={isLoading || saving}>
            Refresh
          </button>
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
          <SummaryCard title="Products" value={isLoading ? "..." : products.length} hint="Loaded catalog rows" />
          <SummaryCard title="Total Stock" value={isLoading ? "..." : totalStock} hint="Units available" />
          <SummaryCard title="Active Products" value={isLoading ? "..." : activeProducts} hint="Visible to shoppers" />
          <SummaryCard title="Low Stock" value={isLoading ? "..." : lowStock} hint="10 units or fewer" />
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

        <div style={{ marginBottom: 18 }}>
          {isLoading ? (
            <div className="card">
              <div className="skeleton" style={{ height: 320 }} />
            </div>
          ) : (
            <Chart products={products} />
          )}
        </div>

        {isLoading ? (
          <div className="card">
            <div className="skeleton" style={{ height: 56, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 56, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 56 }} />
          </div>
        ) : (
          <Table products={products} onEdit={handleEdit} onDelete={handleDeleteClick} />
        )}

        <DeleteModal
          open={showDelete}
          onClose={() => setShowDelete(false)}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    </ProtectedRoute>
  );
}