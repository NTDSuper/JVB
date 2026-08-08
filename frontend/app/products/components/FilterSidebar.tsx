"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  X,
  ChevronDown,
  Layers,
  RotateCcw,
  SlidersHorizontal,
  Package,
} from "lucide-react";
import { Category } from "@/types/dto";
import { FilterOptions } from "./filter-types";

interface FilterSidebarProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  onReset: () => void;
  categories: Category[];
  totalProducts: number;
  isLoading?: boolean;
  open?: boolean;
  onClose?: () => void;
  maxBound?: number;
}

interface AccordionSection {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const SECTIONS: AccordionSection[] = [
  { id: "category", label: "Category", icon: <Layers size={14} /> },
  { id: "price", label: "Price range", icon: <SlidersHorizontal size={14} /> },
  { id: "stock", label: "Availability", icon: <Package size={14} /> },
];

export default function FilterSidebar({
  filters,
  onFilterChange,
  onReset,
  categories,
  totalProducts,
  isLoading,
  open = false,
  onClose,
  maxBound = 1000,
}: FilterSidebarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [expanded, setExpanded] = useState<string[]>(["category", "price", "stock"]);
  const [dragMin, setDragMin] = useState(filters.min_price ?? 0);
  const [dragMax, setDragMax] = useState(filters.max_price ?? maxBound);
  const [localMin, setLocalMin] = useState(filters.min_price?.toString() ?? "");
  const [localMax, setLocalMax] = useState(filters.max_price?.toString() ?? "");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  const toggleSection = (id: string) => {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleSearch = () => {
    onFilterChange({ ...filters, search: localSearch });
    onClose?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleCategoryToggle = (categoryId: number) => {
    const newCategoryId = filters.category_id === categoryId.toString() ? "" : categoryId.toString();
    onFilterChange({ ...filters, category_id: newCategoryId });
  };

  const handleStockToggle = (inStock: boolean) => {
    const next = filters.in_stock === inStock ? undefined : inStock;
    onFilterChange({ ...filters, in_stock: next });
  };

  const onRangeMin = (val: number) => {
    const v = Math.min(val, dragMax - 1);
    setDragMin(v);
  };
  const onRangeMax = (val: number) => {
    const v = Math.max(val, dragMin + 1);
    setDragMax(v);
  };

  const applyDragRange = () => {
    onFilterChange({ ...filters, min_price: dragMin > 0 ? dragMin : undefined, max_price: dragMax < maxBound ? dragMax : undefined });
  };

  const applyTypedRange = () => {
    onFilterChange({
      ...filters,
      min_price: localMin ? Number(localMin) : undefined,
      max_price: localMax ? Number(localMax) : undefined,
    });
  };

  const priceInvalid = Boolean(localMin && localMax && Number(localMin) > Number(localMax));
  const selectedCategory = categories.find((c) => c.id.toString() === filters.category_id);

  const activeChips = useMemo(() => {
    const chips: { id: string; label: string; clear: () => void }[] = [];
    if (filters.search) chips.push({ id: "search", label: `"${filters.search}"`, clear: () => onFilterChange({ ...filters, search: "" }) });
    if (selectedCategory) chips.push({ id: "cat", label: selectedCategory.name, clear: () => onFilterChange({ ...filters, category_id: "" }) });
    if (filters.min_price !== undefined || filters.max_price !== undefined) {
      const min = filters.min_price ?? 0;
      const max = filters.max_price ?? "∞";
      chips.push({ id: "price", label: `$${min}–$${max}`, clear: () => onFilterChange({ ...filters, min_price: undefined, max_price: undefined }) });
    }
    if (filters.in_stock !== undefined) chips.push({ id: "stock", label: filters.in_stock ? "In stock" : "Out of stock", clear: () => onFilterChange({ ...filters, in_stock: undefined }) });
    return chips;
  }, [filters, selectedCategory, onFilterChange]);

  const hasActiveFilters = activeChips.length > 0 || filters.sort_by !== "popularity";

  const content = (
    <div className="flex flex-col" ref={bodyRef}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(var(--primary-rgb),0.1)] text-[var(--primary)]">
            <SlidersHorizontal size={17} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
              Filters
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">Narrow your search</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close filters" className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] lg:hidden">
          <X size={16} />
        </button>
      </div>

      {activeChips.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {activeChips.map((chip) => (
            <button
              key={chip.id}
              onClick={chip.clear}
              className="inline-flex items-center gap-1 rounded-full bg-[rgba(var(--primary-rgb),0.1)] px-2.5 py-1 text-[11px] font-semibold text-[var(--primary)] transition-all hover:bg-[rgba(var(--primary-rgb),0.18)]"
            >
              {chip.label}
              <X size={11} />
            </button>
          ))}
        </div>
      )}

      <div className="mb-3">
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Search
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
            <input
              suppressHydrationWarning
              type="text"
              placeholder="Search products..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] py-2.5 pl-9 pr-8 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[rgba(var(--primary-rgb),0.12)]"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="btn-ripple shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-primary)] transition-all hover:bg-[var(--primary-dark)] active:scale-[0.98] disabled:opacity-40"
          >
            <Search size={14} />
            Search
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {SECTIONS.map((section) => {
          const isOpen = expanded.includes(section.id);
          return (
            <div key={section.id} className="overflow-hidden rounded-xl border border-[var(--border-light)] bg-[var(--bg-input)]/50">
              <button
                onClick={() => toggleSection(section.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between px-3.5 py-3 text-left"
              >
                <span className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
                  {section.icon}
                  {section.label}
                </span>
                <ChevronDown size={15} className={`text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>
              <div
                className={`transition-all duration-300 ${isOpen ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"}`}
              >
                <div className="px-3.5 pb-3.5 pt-0.5">
                  {section.id === "category" && (
                    <div className="space-y-1">
                      <button
                        onClick={() => onFilterChange({ ...filters, category_id: "" })}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] font-medium transition-colors ${
                          !filters.category_id ? "bg-[rgba(var(--primary-rgb),0.1)] text-[var(--primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded transition-all ${!filters.category_id ? "bg-[var(--primary)] text-white" : "border border-[var(--border-strong)]"}`}
                        >
                          {!filters.category_id && <X size={10} />}
                        </span>
                        All categories
                      </button>
                      {categories.map((cat) => {
                        const active = filters.category_id === cat.id.toString();
                        return (
                          <button
                            key={cat.id}
                            onClick={() => handleCategoryToggle(cat.id)}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] font-medium transition-colors ${
                              active ? "bg-[rgba(var(--primary-rgb),0.1)] text-[var(--primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded transition-all ${active ? "bg-[var(--primary)] text-white" : "border border-[var(--border-strong)]"}`}
                            >
                              {active && <X size={10} />}
                            </span>
                            <span className="truncate">{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {section.id === "price" && (
                    <div>
                      <div className="range-slider mb-1">
                        <div className="range-track" style={{ left: `${(dragMin / maxBound) * 100}%`, right: `${100 - (dragMax / maxBound) * 100}%`, background: "var(--primary)" }} />
                        <input
                          type="range"
                          min={0}
                          max={maxBound}
                          value={dragMin}
                          aria-label="Minimum price slider"
                          onChange={(e) => onRangeMin(Number(e.target.value))}
                          onMouseUp={applyDragRange}
                          onTouchEnd={applyDragRange}
                          className="z-10"
                          style={{ zIndex: 2 }}
                        />
                        <input
                          type="range"
                          min={0}
                          max={maxBound}
                          value={dragMax}
                          aria-label="Maximum price slider"
                          onChange={(e) => onRangeMax(Number(e.target.value))}
                          onMouseUp={applyDragRange}
                          onTouchEnd={applyDragRange}
                          style={{ zIndex: 3 }}
                        />
                      </div>
                      <div className="mb-2 flex justify-between text-[10px] font-medium text-[var(--text-muted)]">
                        <span>${dragMin}</span>
                        <span>${dragMax}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={localMin}
                          onChange={(e) => setLocalMin(e.target.value)}
                          aria-label="Minimum price"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[rgba(var(--primary-rgb),0.12)]"
                        />
                        <span className="text-[var(--text-muted)]">–</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={localMax}
                          onChange={(e) => setLocalMax(e.target.value)}
                          aria-label="Maximum price"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[rgba(var(--primary-rgb),0.12)]"
                        />
                        <button
                          onClick={applyTypedRange}
                          disabled={priceInvalid}
                          className="btn-ripple shrink-0 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-[var(--primary-dark)] active:scale-95 disabled:opacity-40"
                        >
                          OK
                        </button>
                      </div>
                      {priceInvalid && (
                        <p className="mt-1.5 text-[11px] font-medium text-[#DC2626]">Min cannot exceed max.</p>
                      )}
                    </div>
                  )}

                  {section.id === "stock" && (
                    <div className="space-y-1">
                      <button
                        onClick={() => handleStockToggle(true)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] font-medium transition-colors ${
                          filters.in_stock === true ? "bg-[rgba(var(--primary-rgb),0.1)] text-[var(--primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <span className={`flex h-4 w-4 items-center justify-center rounded transition-all ${filters.in_stock === true ? "bg-[var(--primary)] text-white" : "border border-[var(--border-strong)]"}`}>
                          {filters.in_stock === true && <X size={10} />}
                        </span>
                        In stock
                      </button>
                      <button
                        onClick={() => handleStockToggle(false)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] font-medium transition-colors ${
                          filters.in_stock === false ? "bg-[#F43F5E]/10 text-[#F43F5E]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <span className={`flex h-4 w-4 items-center justify-center rounded transition-all ${filters.in_stock === false ? "bg-[#F43F5E] text-white" : "border border-[var(--border-strong)]"}`}>
                          {filters.in_stock === false && <X size={10} />}
                        </span>
                        Out of stock
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-[var(--border-light)] bg-[var(--bg-input)]/60 p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            {isLoading ? "Loading..." : `${totalProducts} product${totalProducts !== 1 ? "s" : ""}`}
          </span>
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#F43F5E] transition-colors hover:bg-[#F43F5E]/10"
            >
              <RotateCcw size={11} />
              Reset all
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden lg:block">
        <div className="sticky top-4 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]">
          {content}
        </div>
      </div>

      <div
        className={`fixed inset-0 z-[80] transition-opacity duration-300 lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden={!open}
      >
        <div className="absolute inset-0 bg-[var(--bg-overlay)]" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Product filters"
          className={`absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-[var(--border)] bg-[var(--bg-card-solid)] p-5 shadow-[var(--shadow-xl)] transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}
        >
          {content}
        </div>
      </div>
    </>
  );
}