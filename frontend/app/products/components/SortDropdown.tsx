"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Grid3X3, List } from "lucide-react";
import { FilterOptions } from "./filter-types";

interface SortDropdownProps {
  sortBy: FilterOptions["sort_by"];
  onSortChange: (sortBy: FilterOptions["sort_by"]) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

const SORT_OPTIONS: { value: FilterOptions["sort_by"]; label: string }[] = [
  { value: "popularity", label: "Sort: Popularity" },
  { value: "price_asc", label: "Sort: Price (Low to High)" },
  { value: "price_desc", label: "Sort: Price (High to Low)" },
  { value: "newest", label: "Sort: Newest" },
  { value: "name_asc", label: "Sort: Name (A-Z)" },
];

export default function SortDropdown({ sortBy, onSortChange, viewMode, onViewModeChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel = SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label || "Sort: Popularity";

  return (
    <div className="flex items-center gap-2">
      {/* View Toggle */}
      {/* <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-1">
        <button
          onClick={() => onViewModeChange("grid")}
          className={`flex items-center justify-center rounded-md p-2 transition-all duration-200 ${
            viewMode === "grid"
              ? "bg-[var(--primary)] text-white shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
          aria-label="Grid view"
        >
          <Grid3X3 size={16} />
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className={`flex items-center justify-center rounded-md p-2 transition-all duration-200 ${
            viewMode === "list"
              ? "bg-[var(--primary)] text-white shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
          aria-label="List view"
        >
          <List size={16} />
        </button>
      </div> */}

      {/* Sort Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:border-[var(--primary)] transition-all duration-200"
        >
          <span>{selectedLabel}</span>
          <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 top-full mt-2 z-20 min-w-[220px] rounded-xl border border-[var(--border)] bg-[var(--bg-card-solid)] shadow-[var(--shadow-xl)] p-2 animate-scale-in">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSortChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    sortBy === option.value
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}