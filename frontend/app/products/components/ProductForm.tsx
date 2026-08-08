"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import ImageUpload from "@/components/ImageUpload";
import { Product, Category, Attribute } from "@/types/dto";
import { useState, useEffect, useMemo } from "react";
import {
  AlertCircle,
  Boxes,
  Calendar,
  Image as ImageIcon,
  Info,
  Package,
  Tag,
  Type,
  DollarSign,
  Hash,
  Building2,
  Ruler,
  Barcode,
  Save,
  X,
} from "lucide-react";

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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get<Category[]>("/products/categories/all");
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: categoryAttributes = [] } = useQuery<Attribute[]>({
    queryKey: ["attributes", formData.category_id],
    queryFn: async () => {
      if (!formData.category_id) return [];
      const response = await api.get<Attribute[]>(`/attributes/by-category/${formData.category_id}`);
      return response.data;
    },
    enabled: !!formData.category_id,
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.sku?.trim()) newErrors.sku = "SKU is required";
    if (!formData.name?.trim()) newErrors.name = "Product name is required";
    if (formData.price === undefined || formData.price < 0)
      newErrors.price = "Price must be 0 or greater";
    if (formData.stock === undefined || Number(formData.stock) < 0)
      newErrors.stock = "Stock must be 0 or greater";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (busy) return;
    validate();
  }, [formData.sku, formData.name, formData.price, formData.stock]);

  const isFormValid = useMemo(() => {
    return (
      formData.sku?.trim() !== "" &&
      formData.name?.trim() !== "" &&
      formData.price !== undefined &&
      formData.price >= 0 &&
      formData.stock !== undefined &&
      Number(formData.stock) >= 0
    );
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit();
  };

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

  const inputClass = (field?: string) =>
    `w-full rounded-lg border bg-[var(--bg-input)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-[rgba(var(--primary-rgb),0.15)] ${field && errors[field] ? "border-[var(--danger)]" : "border-[var(--border)]"
    }`;

  const labelClass = "mb-1.5 block text-xs font-medium text-[var(--text-secondary)]";

  const errorMsg = (field: string) =>
    errors[field] ? (
      <span className="mt-1.5 flex items-center gap-1 text-xs text-[var(--danger)]">
        <AlertCircle size={13} />
        {errors[field]}
      </span>
    ) : null;

  const sectionTitle = (icon: React.ReactNode, title: string, subtitle?: string) => (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-hover)] text-[var(--primary)]">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
        {subtitle && <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>}
      </div>
    </div>
  );

  const divider = <div className="my-6 h-px bg-[var(--border)]" />;

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Section 1: Basic Info ── */}
      {sectionTitle(<Info size={18} />, "Basic Information", "SKU, product name, and category")}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>SKU *</label>
          <div className="relative">
            <Tag size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={formData.sku || ""}
              onChange={(e) => onChange("sku", e.target.value)}
              className={`${inputClass("sku")} pl-9`}
              placeholder="BEV-001"
              disabled={busy}
            />
          </div>
          {errorMsg("sku")}
        </div>

        <div>
          <label className={labelClass}>Product Name *</label>
          <div className="relative">
            <Type size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={formData.name || ""}
              onChange={(e) => onChange("name", e.target.value)}
              className={`${inputClass("name")} pl-9`}
              placeholder="Fresh Milk 1L"
              disabled={busy}
            />
          </div>
          {errorMsg("name")}
        </div>

        <div>
          <label className={labelClass}>Category</label>
          <div className="relative">
            <Boxes size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <select
              value={formData.category_id || ""}
              onChange={(e) =>
                onChange("category_id", e.target.value ? Number(e.target.value) : undefined)
              }
              className={`${inputClass()} pl-9 appearance-none`}
              disabled={busy}
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <div className="relative">
            <Package size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <select
              value={formData.status || "active"}
              onChange={(e) => onChange("status", e.target.value)}
              className={`${inputClass()} pl-9 appearance-none`}
              disabled={busy}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {divider}

      {/* ── Section 2: Price & Inventory ── */}
      {sectionTitle(<DollarSign size={18} />, "Price & Inventory", "Pricing, stock, and packaging information")}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Price *</label>
          <div className="relative">
            <DollarSign size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="number"
              min={0}
              step="0.01"
              value={formData.price ?? ""}
              onChange={(e) => onChange("price", Number(e.target.value))}
              className={`${inputClass("price")} pl-9`}
              placeholder="3.50"
              disabled={busy}
            />
          </div>
          {errorMsg("price")}
        </div>

        <div>
          <label className={labelClass}>Cost Price</label>
          <div className="relative">
            <DollarSign size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="number"
              min={0}
              step="0.01"
              value={formData.cost_price ?? ""}
              onChange={(e) =>
                onChange("cost_price", e.target.value ? Number(e.target.value) : undefined)
              }
              className={`${inputClass()} pl-9`}
              placeholder="2.70"
              disabled={busy}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Stock *</label>
          <div className="relative">
            <Hash size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="number"
              min={0}
              value={formData.stock ?? ""}
              onChange={(e) => onChange("stock", Number(e.target.value))}
              className={`${inputClass("stock")} pl-9`}
              placeholder="100"
              disabled={busy}
            />
          </div>
          {errorMsg("stock")}
        </div>

        <div>
          <label className={labelClass}>Barcode</label>
          <div className="relative">
            <Barcode size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={formData.barcode || ""}
              onChange={(e) => onChange("barcode", e.target.value)}
              className={`${inputClass()} pl-9`}
              placeholder="123456789"
              disabled={busy}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Brand</label>
          <div className="relative">
            <Building2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={formData.brand || ""}
              onChange={(e) => onChange("brand", e.target.value)}
              className={`${inputClass()} pl-9`}
              placeholder="Brand name"
              disabled={busy}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Unit</label>
          <div className="relative">
            <Ruler size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={formData.unit || ""}
              onChange={(e) => onChange("unit", e.target.value)}
              className={`${inputClass()} pl-9`}
              placeholder="pcs, box, kg..."
              disabled={busy}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Expiry Date</label>
          <div className="relative">
            <Calendar size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="date"
              value={formData.expiry_date || ""}
              onChange={(e) => onChange("expiry_date", e.target.value)}
              className={`${inputClass()} pl-9`}
              disabled={busy}
            />
          </div>
        </div>
      </div>

      {divider}

      {/* ── Section 3: Image & Description ── */}
      {sectionTitle(<ImageIcon size={18} />, "Image & Description", "Product image and detailed description")}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Thumbnail</label>
          <ImageUpload
            currentImage={formData.image_url}
            isObjectKey={true}
            onUploadSuccess={(objectKey) => onChange("image_url", objectKey)}
            onUploadError={(error) => console.error("Image upload error:", error)}
            disabled={busy}
          />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={formData.description || ""}
            onChange={(e) => onChange("description", e.target.value)}
            className={`${inputClass()} min-h-[200px] resize-y`}
            placeholder="Short product description"
            disabled={busy}
          />
        </div>
      </div>

      {/* ── Section 4: Attributes (if any) ── */}
      {categoryAttributes.length > 0 && (
        <>
          {divider}
          {sectionTitle(<Tag size={18} />, "Product Attributes", "Category-specific attributes")}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {categoryAttributes.map((attr) => (
              <div key={attr.id}>
                <label className={labelClass}>
                  {attr.name} {attr.required && <span className="text-[var(--danger)]">*</span>}
                </label>
                <input
                  type={attr.data_type === "number" || attr.data_type === "float" ? "number" : "text"}
                  value={getAttributeValue(attr.name)}
                  onChange={(e) => handleAttributeChange(attr.id, attr.name, attr.data_type, e.target.value)}
                  className={inputClass()}
                  placeholder={`Enter ${attr.name}`}
                  disabled={busy}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Footer actions */}
      <div className="mt-8 flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
        {editing && (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            onClick={onCancelEdit}
            disabled={busy}
          >
            <X size={16} />
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-primary)] transition-all hover:bg-[var(--primary-dark)] hover:shadow-lg disabled:opacity-50"
          disabled={busy || !isFormValid}
        >
          <Save size={16} />
          {busy ? "Saving..." : editing ? "Update Product" : "Create Product"}
        </button>
      </div>
    </form>
  );
}