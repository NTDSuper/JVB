import { useState } from "react";
import api from "@/lib/api";
import { Product } from "@/types/dto";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export default function Table({ products, onEdit, onDelete }: Props) {
  const queryClient = useQueryClient();
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const handleToggleStatus = async (product: Product) => {
    const newStatus = product.status === "active" ? "inactive" : "active";
    try {
      setTogglingId(product.id ?? null);
      await api.patch(`/products/status/${product.id}`, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ["dashboard-products"] });
    } catch {
      // silently fail – the next fetch will revert if needed
    } finally {
      setTogglingId(null);
    }
  };
  return (
    <div className="card table-card">
      <div className="table-card-header">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Product List</h2>
          <p className="muted" style={{ fontSize: 13 }}>
            Manage product catalog, stock, and availability
          </p>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 28 }}>
                  <span className="muted">No products found</span>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id}>
                  <td style={{ fontWeight: 700 }}>{product.sku}</td>
                  <td>{product.name}</td>
                  <td>${Number(product.price).toFixed(2)}</td>
                  <td>{product.stock}</td>
                  <td>
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
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button
                        className={`btn btn-sm ${product.status === "active" ? "btn-warning" : "btn-success"}`}
                        onClick={() => handleToggleStatus(product)}
                        disabled={togglingId === product.id}
                      >
                        {togglingId === product.id
                          ? "..."
                          : product.status === "active"
                          ? "Deactivate"
                          : "Activate"}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => onEdit(product)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => onDelete(product)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
