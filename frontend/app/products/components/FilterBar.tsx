"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, RotateCcw, SlidersHorizontal, Check } from "lucide-react";

export interface FilterOptions {
  search: string;
  category_id: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  sort_by: "popularity" | "price_asc" | "price_desc" | "newest" | "name_asc";
}

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  onReset: () => void;
}

export default function FilterBar({
  filters,
  onFilterChange,
  onReset,
}: FilterBarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [localMinPrice, setLocalMinPrice] = useState(filters.min_price?.toString() || "");
  const [localMaxPrice, setLocalMaxPrice] = useState(filters.max_price?.toString() || "");
  const [priceOpen, setPriceOpen] = useState(false);
  const priceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  // Close price popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (priceRef.current && !priceRef.current.contains(e.target as Node)) {
        setPriceOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = () => {
    onFilterChange({ ...filters, search: localSearch });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handlePriceApply = () => {
    onFilterChange({
      ...filters,
      min_price: localMinPrice ? Number(localMinPrice) : undefined,
      max_price: localMaxPrice ? Number(localMaxPrice) : undefined,
    });
    setPriceOpen(false);
  };

  const priceInvalid = Boolean(localMinPrice && localMaxPrice && Number(localMinPrice) > Number(localMaxPrice));

  const hasActiveFilters =
    filters.search ||
    filters.category_id ||
    filters.min_price !== undefined ||
    filters.max_price !== undefined ||
    filters.sort_by !== "popularity";

  const hasPriceFilter = filters.min_price !== undefined || filters.max_price !== undefined;

  return (
    <section
      aria-label="Search and filters"
      className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] px-4 py-4 sm:px-5 shadow-[var(--shadow-xs)]"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="relative w-full sm:w-auto sm:min-w-[240px] sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
          <input
            suppressHydrationWarning
            type="text"
            placeholder="Search products..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] py-2.5 pl-10 pr-20 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[rgba(var(--primary-rgb),0.12)]"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch("");
                onFilterChange({ ...filters, search: "" });
              }}
              aria-label="Clear search"
              className="absolute right-14 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              <X size={13} />
            </button>
          )}
          {/* Search button */}
          <button
            onClick={handleSearch}
            aria-label="Search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white shadow-[0_2px_8px_rgba(234,88,12,0.2)] transition-all hover:from-[#EA580C] hover:to-[#C2410C] active:scale-95"
          >
            <Search size={15} />
          </button>
        </div>

        {/* Price filter icon */}
        <div className="relative" ref={priceRef}>
          <button
            onClick={() => setPriceOpen((prev) => !prev)}
            aria-label="Filter by price"
            aria-expanded={priceOpen}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all active:scale-95 ${
              hasPriceFilter
                ? "border-[var(--primary)] bg-[rgba(var(--primary-rgb),0.1)] text-[var(--primary)]"
                : "border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <SlidersHorizontal size={14} />
            Filter
            {hasPriceFilter && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                <Check size={10} />
              </span>
            )}
          </button>

          {/* Price popup */}
          {priceOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-lg)] animate-fade-in">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-primary)]">Filter by price</span>
                <button
                  onClick={() => setPriceOpen(false)}
                  aria-label="Close price filter"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={localMinPrice}
                  onChange={(e) => setLocalMinPrice(e.target.value)}
                  aria-label="Minimum price"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[rgba(var(--primary-rgb),0.12)]"
                />
                <span className="text-[var(--text-muted)]">–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={localMaxPrice}
                  onChange={(e) => setLocalMaxPrice(e.target.value)}
                  aria-label="Maximum price"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[rgba(var(--primary-rgb),0.12)]"
                />
              </div>

              {priceInvalid && (
                <p className="mt-2 text-xs font-medium text-[#DC2626]">
                  Min cannot be greater than max.
                </p>
              )}

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handlePriceApply}
                  disabled={priceInvalid}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_2px_8px_rgba(234,88,12,0.2)] transition-all hover:from-[#EA580C] hover:to-[#C2410C] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Apply
                </button>
                {hasPriceFilter && (
                  <button
                    onClick={() => {
                      setLocalMinPrice("");
                      setLocalMaxPrice("");
                      onFilterChange({
                        ...filters,
                        min_price: undefined,
                        max_price: undefined,
                      });
                    }}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:border-[#F43F5E]/50 hover:text-[#F43F5E]"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:border-[#F43F5E]/50 hover:text-[#F43F5E]"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        )}
      </div>
    </section>
  );
}