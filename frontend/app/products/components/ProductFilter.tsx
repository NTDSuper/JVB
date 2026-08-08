"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Category } from "@/types/dto";
import { useState } from "react";
import { Search, X, RotateCcw, Boxes, Package } from "lucide-react";

export interface FilterOptions {
  search: string;
  category_id: string;
  status: string;
}

interface ProductFilterProps {
  onFilterChange: (filters: FilterOptions) => void;
  onReset: () => void;
  activeFilters: FilterOptions;
}

export default function ProductFilter({ onFilterChange, onReset, activeFilters }: ProductFilterProps) {
  const [localSearch, setLocalSearch] = useState(activeFilters.search);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get<Category[]>("/products/categories/all");
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const handleSearch = () => {
    onFilterChange({ ...activeFilters, search: localSearch });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleChange = (field: keyof FilterOptions, value: string) => {
    onFilterChange({ ...activeFilters, [field]: value });
  };

  const handleReset = () => {
    setLocalSearch("");
    onReset();
  };

  const hasActiveFilters = activeFilters.search || activeFilters.category_id || activeFilters.status;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name or SKU..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2.5 pl-10 pr-10 text-sm text-[var(--text-primary)] transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-[rgba(var(--primary-rgb),0.15)]"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch("");
                onFilterChange({ ...activeFilters, search: "" });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-primary)] transition-all hover:bg-[var(--primary-dark)] hover:shadow-lg"
        >
          <Search size={15} />
          Search
        </button>

        {/* Category */}
        <div className="relative lg:w-56">
          <Boxes size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <select
            value={activeFilters.category_id}
            onChange={(e) => handleChange("category_id", e.target.value)}
            className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2.5 pl-10 pr-8 text-sm text-[var(--text-primary)] transition-all focus:border-[var(--border-focus)] focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-[rgba(var(--primary-rgb),0.15)]"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="relative lg:w-44">
          <Package size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <select
            value={activeFilters.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2.5 pl-10 pr-8 text-sm text-[var(--text-primary)] transition-all focus:border-[var(--border-focus)] focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-[rgba(var(--primary-rgb),0.15)]"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            {/* <option value="out_of_stock">Out of Stock</option>
            <option value="expired">Expired</option>
            <option value="archived">Archived</option> */}
          </select>
        </div>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            <RotateCcw size={15} />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}