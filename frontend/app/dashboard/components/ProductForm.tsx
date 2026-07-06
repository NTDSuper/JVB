"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Product, Category, Attribute } from "@/types/dto";

interface ProductFormProps {
  formData: Partial<Product>;
  editing: boolean;
  busy?: boolean;
  onChange: (field: keyof Product, value: any) => void;
  onCancelEdit: () => void;
  onSubmit: () => void;
}

export default function ProductForm({
  formData,
  editing,
  busy,
  onChange,
  onCancelEdit,
  onSubmit,
}: ProductFormProps) {
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get<Category[]>("/products/categories/all");
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: categoryAttributes = [] } = useQuery({
    queryKey: ["attributes", formData.category_id],
    queryFn: async () => {
      if (!formData.category_id) return [];
      const response = await api.get<Attribute[]>(`/attributes/by-category/${formData.category_id}`);
      return response.data;
    },
    enabled: !!formData.category_id,
  });

  const handleAttributeChange = (attrId: number, attrName: string, dataType: string, value: string) => {
    const currentAttrs = formData.attributes || [];
    const index = currentAttrs.findIndex((a) => a.attribute_name === attrName);
    
    let newAttrs = [...currentAttrs];
    if (index >= 0) {
      newAttrs[index] = { ...newAttrs[index], value };
    } else {
      newAttrs.push({
        attribute_id: attrId,
        attribute_name: attrName,
        data_type: dataType,
        value,
      });
    }
    onChange("attributes", newAttrs);
  };

  const getAttributeValue = (attrName: string) => {
    return formData.attributes?.find((a) => a.attribute_name === attrName)?.value || "";
  };

  return (
    <div className="card">
      <div className="section-header" style={{ marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>
            {editing ? "Update Product" : "Create Product"}
          </h2>
          <p className="muted" style={{ fontSize: 13 }}>
            Keep catalog data compact and consistent with checkout behavior.
          </p>
        </div>
        {editing && (
          <button className="btn btn-ghost btn-sm" onClick={onCancelEdit} type="button">
            Cancel
          </button>
        )}
      </div>

      <div className="form-grid">
        <label>
          <span className="form-label">SKU</span>
          <input
            value={formData.sku || ""}
            onChange={(e) => onChange("sku", e.target.value)}
            className="form-input"
            placeholder="BEV-001"
          />
        </label>

        <label>
          <span className="form-label">Name</span>
          <input
            value={formData.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
            className="form-input"
            placeholder="Fresh Milk 1L"
          />
        </label>

        <label>
          <span className="form-label">Category</span>
          <select
            value={formData.category_id || ""}
            onChange={(e) =>
              onChange("category_id", e.target.value ? Number(e.target.value) : undefined)
            }
            className="form-input"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>

        {/* <label>
          <span className="form-label">Status</span>
          <select
            value={formData.status || "active"}
            onChange={(e) => onChange("status", e.target.value)}
            className="form-input"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </label> */}

        <label>
          <span className="form-label">Price</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={formData.price ?? ""}
            onChange={(e) => onChange("price", Number(e.target.value))}
            className="form-input"
            placeholder="3.50"
          />
        </label>

        <label>
          <span className="form-label">Cost Price</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={formData.cost_price ?? ""}
            onChange={(e) =>
              onChange("cost_price", e.target.value ? Number(e.target.value) : undefined)
            }
            className="form-input"
            placeholder="2.70"
          />
        </label>

        <label>
          <span className="form-label">Stock</span>
          <input
            type="number"
            min={0}
            value={formData.stock ?? ""}
            onChange={(e) => onChange("stock", Number(e.target.value))}
            className="form-input"
            placeholder="100"
          />
        </label>

        <label>
          <span className="form-label">Image URL</span>
          <input
            value={formData.image_url || ""}
            onChange={(e) => onChange("image_url", e.target.value)}
            className="form-input"
            placeholder="https://..."
          />
        </label>

        {categoryAttributes.map((attr) => (
          <label key={attr.id}>
            <span className="form-label">
              {attr.name} {attr.required && <span style={{ color: "red" }}>*</span>}
            </span>
            <input
              type={attr.data_type === "number" || attr.data_type === "float" ? "number" : "text"}
              value={getAttributeValue(attr.name)}
              onChange={(e) => handleAttributeChange(attr.id, attr.name, attr.data_type, e.target.value)}
              className="form-input"
              placeholder={`Enter ${attr.name}`}
            />
          </label>
        ))}
      </div>

      <label style={{ display: "block", marginTop: 14 }}>
        <span className="form-label">Description</span>
        <textarea
          value={formData.description || ""}
          onChange={(e) => onChange("description", e.target.value)}
          className="form-input"
          style={{ minHeight: 96, resize: "vertical" }}
          placeholder="Short product description"
        />
      </label>

      <div className="toolbar" style={{ marginTop: 18 }}>
        <button onClick={onSubmit} className="btn btn-primary" disabled={busy}>
          {busy ? "Saving..." : editing ? "Update Product" : "Create Product"}
        </button>
      </div>
    </div>
  );
}
