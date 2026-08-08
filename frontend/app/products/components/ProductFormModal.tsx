"use client";

import { X } from "lucide-react";
import ProductForm from "./ProductForm";
import { Product } from "@/types/dto";

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  formData: Partial<Product>;
  editing: boolean;
  busy?: boolean;
  onChange: (field: keyof Product, value: any) => void;
  onCancelEdit: () => void;
  onSubmit: () => void;
}

export default function ProductFormModal({
  open,
  onClose,
  formData,
  editing,
  busy,
  onChange,
  onCancelEdit,
  onSubmit,
}: ProductFormModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[var(--bg-overlay)] p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card-solid)] shadow-[var(--shadow-xl)] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
              {editing ? "Edit Product" : "Add New Product"}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {editing ? "Update the product details below" : "Fill in the details to create a new product"}
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <ProductForm
            formData={formData}
            editing={editing}
            busy={busy}
            onChange={onChange}
            onCancelEdit={onCancelEdit}
            onSubmit={onSubmit}
          />
        </div>
      </div>
    </div>
  );
}