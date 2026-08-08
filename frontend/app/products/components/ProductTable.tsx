"use client";

import { useState } from "react";
import { Product, Category } from "@/types/dto";
import {
  Pencil,
  Trash2,
  Eye,
  ImageOff,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Package,
  Power,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Archive,
  Clock,
  Trash,
  Check,
  X,
} from "lucide-react";

interface ProductTableProps {
  products: Product[];
  loading: boolean;
  categories: Category[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onView: (product: Product) => void;
  onBulkDelete: (ids: number[]) => void;
  onBulkStatusChange: (ids: number[], status: string) => void;
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onSort: (column: string) => void;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
}

type SortableColumn = "sku" | "name" | "category_name" | "price" | "cost_price" | "stock" | "status";

export default function ProductTable({
  products,
  loading,
  categories,
  onEdit,
  onDelete,
  onView,
  onBulkDelete,
  onBulkStatusChange,
  page,
  totalPages,
  totalItems,
  onPageChange,
  onSort,
  sortColumn,
  sortDirection,
}: ProductTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const isAllSelected = products.length > 0 && selectedIds.size === products.length;
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return "-";
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || "-";
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return "-";
    return `$${value.toFixed(2)}`;
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

  const handleSort = (column: SortableColumn) => {
    onSort(column);
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id!).filter(Boolean)));
    }
  };

  const handleSelectOne = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} selected products?`)) {
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBulkStatusChange = (status: string) => {
    if (selectedIds.size === 0) return;
    onBulkStatusChange(Array.from(selectedIds), status);
    setSelectedIds(new Set());
  };

  const renderSortIcon = (column: SortableColumn) => {
    if (sortColumn !== column)
      return <ChevronsUpDown size={13} className="ml-1 opacity-30" />;
    return sortDirection === "asc" ? (
      <ChevronUp size={13} className="ml-1 text-[var(--primary)]" />
    ) : (
      <ChevronDown size={13} className="ml-1 text-[var(--primary)]" />
    );
  };

  const columns: { key: SortableColumn; label: string; width?: number }[] = [
    { key: "sku", label: "SKU", width: 130 },
    { key: "name", label: "Product Name", width: 260 },
    { key: "category_name", label: "Category", width: 150 },
    { key: "price", label: "Price", width: 110 },
    { key: "cost_price", label: "Cost Price", width: 120 },
    { key: "stock", label: "Stock", width: 100 },
    { key: "status", label: "Status", width: 140 },
  ];

  // Pagination
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

  const thClass = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]";
  const tdClass = "px-4 py-3.5 text-sm text-[var(--text-primary)]";

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)]">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[rgba(148,163,184,0.06)]">
                <th className={`${thClass} w-10 text-center`}>#</th>
                {columns.map((col) => (
                  <th key={col.key} className={thClass} style={{ width: col.width }}>
                    {col.label}
                  </th>
                ))}
                <th className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0">
                  <td className={`${tdClass} text-center`}>
                    <div className="skeleton mx-auto h-4 w-4" />
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} className={tdClass}>
                      <div className="skeleton h-5 w-4/5" />
                    </td>
                  ))}
                  <td className={tdClass}>
                    <div className="skeleton ml-auto h-8 w-28" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-16 text-center shadow-[var(--shadow-sm)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-hover)]">
          <Package size={32} className="text-[var(--text-muted)]" />
        </div>
        <h3 className="mb-1 text-lg font-bold text-[var(--text-primary)]">
          No products found
        </h3>
        <p className="text-sm text-[var(--text-muted)]">
          Try adjusting your filters or add a new product
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)]">
      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-hover)] px-4 py-3 animate-slide-down">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {selectedIds.size} selected
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--danger)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--danger-dark)]"
              onClick={handleBulkDelete}
            >
              <Trash size={13} />
              Delete
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--success)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
              onClick={() => handleBulkStatusChange("active")}
            >
              <Check size={13} />
              Set Active
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--warning)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
              onClick={() => handleBulkStatusChange("inactive")}
            >
              <X size={13} />
              Set Inactive
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card)]"
              onClick={() => setSelectedIds(new Set())}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[rgba(148,163,184,0.06)]">
              <th className={`${thClass} w-10 text-center`}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={handleSelectAll}
                  className="h-4 w-4 cursor-pointer rounded border-[var(--border-strong)] accent-[var(--primary)]"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${thClass} cursor-pointer select-none`}
                  style={{ width: col.width }}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    {renderSortIcon(col.key)}
                  </span>
                </th>
              ))}
              <th className={`${thClass} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--bg-hover)]"
              >
                <td className={`${tdClass} text-center`}>
                  <input
                    type="checkbox"
                    checked={product.id ? selectedIds.has(product.id) : false}
                    onChange={() => product.id && handleSelectOne(product.id)}
                    className="h-4 w-4 cursor-pointer rounded border-[var(--border-strong)] accent-[var(--primary)]"
                  />
                </td>
                <td className={tdClass}>
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-input)]">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageOff size={16} className="text-[var(--text-muted)]" />
                        </div>
                      )}
                    </div>
                    <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                      {product.sku}
                    </span>
                  </div>
                </td>
                <td className={tdClass}>
                  <div className="max-w-[260px]">
                    <div className="truncate font-semibold text-[var(--text-primary)]">
                      {product.name}
                    </div>
                  </div>
                </td>
                <td className={`${tdClass} text-[var(--text-secondary)]`}>
                  {getCategoryName(product.category_id)}
                </td>
                <td className={`${tdClass} font-bold text-[var(--accent)]`}>
                  {formatCurrency(product.price)}
                </td>
                <td className={`${tdClass} text-[var(--text-muted)]`}>
                  {formatCurrency(product.cost_price)}
                </td>
                <td className={tdClass}>
                  <span
                    className={`font-bold ${
                      product.stock === 0
                        ? "text-[var(--danger)]"
                        : product.stock <= 10
                        ? "text-[var(--warning)]"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {product.stock}
                  </span>
                </td>
                <td className={tdClass}>{getStatusBadge(product.status)}</td>
                <td className={`${tdClass} text-right`}>
                  <div className="inline-flex items-center gap-1">
                    {/* Primary action: Edit */}
                    <button
                      onClick={() => onEdit(product)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white shadow-[var(--shadow-primary)] transition-all hover:bg-[var(--primary-dark)] hover:shadow-lg"
                      title="Edit product"
                    >
                      <Pencil size={14} />
                    </button>
                    {/* Secondary: View */}
                    <button
                      onClick={() => onView(product)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                      title="View details"
                    >
                      <Eye size={14} />
                    </button>
                    {/* Status toggle */}
                    <button
                      onClick={() => onBulkStatusChange([product.id!], product.status === "active" ? "inactive" : "active")}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                        product.status === "active"
                          ? "border-[var(--border)] text-[var(--warning)] hover:bg-[var(--warning-bg)]"
                          : "border-[var(--border)] text-[var(--success)] hover:bg-[var(--success-bg)]"
                      }`}
                      title={product.status === "active" ? "Set inactive" : "Set active"}
                    >
                      <Power size={14} />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => onDelete(product)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--danger)] transition-colors hover:bg-[var(--danger-bg)]"
                      title="Delete product"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-4">
          <div className="text-xs text-[var(--text-muted)]">
            Showing {(page * 20) + 1} to {Math.min((page + 1) * 20, totalItems)} of{" "}
            {totalItems} products
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
            </button>

            {getPageNumbers().map((p, idx) =>
              p === "..." ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-[var(--text-muted)]">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors ${
                    p === page
                      ? "bg-[var(--primary)] text-white shadow-[var(--shadow-primary)]"
                      : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  {p + 1}
                </button>
              )
            )}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}