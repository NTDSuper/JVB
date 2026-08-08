"use client";

import { Product, Category } from "@/types/dto";
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Archive,
  Package,
  ImageOff,
  Calendar,
  Building2,
  Ruler,
  Barcode,
  Tag,
  DollarSign,
  Boxes,
} from "lucide-react";

interface ProductDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  categories: Category[];
}

export default function ProductDialog({
  open,
  onClose,
  product,
  categories,
}: ProductDialogProps) {
  if (!open || !product) return null;

  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return "-";
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || "-";
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return "-";
    return `$${value.toFixed(2)}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { class: string; label: string; icon: React.ReactNode }> = {
      active: {
        class: "bg-[var(--success-bg)] text-[var(--success)]",
        label: "Active",
        icon: <CheckCircle2 size={12} />,
      },
      inactive: {
        class: "bg-[var(--bg-tag)] text-[var(--text-secondary)]",
        label: "Inactive",
        icon: <XCircle size={12} />,
      },
      out_of_stock: {
        class: "bg-[var(--danger-bg)] text-[var(--danger)]",
        label: "Out of Stock",
        icon: <AlertTriangle size={12} />,
      },
      expired: {
        class: "bg-[var(--danger-bg)] text-[var(--danger)]",
        label: "Expired",
        icon: <Clock size={12} />,
      },
      archived: {
        class: "bg-[var(--bg-tag)] text-[var(--text-secondary)]",
        label: "Archived",
        icon: <Archive size={12} />,
      },
    };
    const config = statusMap[status] || {
      class: "bg-[var(--bg-tag)] text-[var(--text-secondary)]",
      label: status,
      icon: <Package size={12} />,
    };
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.class}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const infoCard = (icon: React.ReactNode, label: string, value: React.ReactNode, highlight?: boolean) => (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-3.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {icon}
        {label}
      </div>
      <div className={`text-sm font-semibold ${highlight ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
        {value}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[var(--bg-overlay)] p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card-solid)] p-6 shadow-[var(--shadow-xl)] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
              Product Details
            </h2>
            <p className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
              SKU: {product.sku}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Product summary */}
        <div className="mb-6 flex gap-4">
          <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-input)]">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageOff size={28} className="text-[var(--text-muted)]" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="mb-2 text-lg font-bold text-[var(--text-primary)]">
              {product.name}
            </h3>
            <div className="mb-2">{getStatusBadge(product.status)}</div>
            {product.description && (
              <p className="line-clamp-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {product.description}
              </p>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {infoCard(<Tag size={12} />, "Category", getCategoryName(product.category_id))}
          {infoCard(<DollarSign size={12} />, "Selling Price", formatCurrency(product.price), true)}
          {product.cost_price !== undefined &&
            infoCard(<DollarSign size={12} />, "Cost Price", formatCurrency(product.cost_price))}
          {infoCard(<Boxes size={12} />, "Stock", product.stock)}
          {product.barcode &&
            infoCard(<Barcode size={12} />, "Barcode", <span className="font-mono">{product.barcode}</span>)}
          {product.brand &&
            infoCard(<Building2 size={12} />, "Brand", product.brand)}
          {product.unit &&
            infoCard(<Ruler size={12} />, "Unit", product.unit)}
          {product.expiry_date &&
            infoCard(<Calendar size={12} />, "Expiry Date", formatDate(product.expiry_date))}
          {infoCard(<Calendar size={12} />, "Created At", formatDate(product.created_at))}
        </div>

        {/* Attributes */}
        {product.attributes && product.attributes.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-3 text-sm font-bold text-[var(--text-secondary)]">
              Product Attributes
            </h4>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {product.attributes.map((attr) => (
                <div
                  key={attr.attribute_id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-3"
                >
                  <div className="mb-1 text-xs capitalize text-[var(--text-muted)]">
                    {attr.attribute_name}
                  </div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    {attr.value || "-"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end border-t border-[var(--border)] pt-4">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-primary)] transition-all hover:bg-[var(--primary-dark)] hover:shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}