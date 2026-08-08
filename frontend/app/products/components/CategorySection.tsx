"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { Category } from "@/types/dto";
import SectionHeader from "./SectionHeader";
import { getCategoryGradient, getCategoryIcon } from "../lib/marketplace-tokens";

interface CategorySectionProps {
  categories: Category[];
  activeCategoryId: string;
  onSelect: (id: string) => void;
}

export default function CategorySection({ categories, activeCategoryId, onSelect }: CategorySectionProps) {
  const router = useRouter();

  const handleSelect = (id: string) => {
    onSelect(id);
    router.push("/products");
  };

  return (
    <section
      aria-label="Product categories"
      className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] px-4 py-4 sm:px-5 sm:py-5 shadow-[var(--shadow-xs)]"
    >
      <SectionHeader
        icon={LayoutGrid}
        title="Categories"
        subtitle="Browse by collection"
        action={
          <button
            onClick={() => handleSelect("")}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-transparent"
          >
            View All
            <ChevronRight size={13} />
          </button>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin lg:grid lg:grid-cols-[repeat(auto-fill,minmax(76px,1fr))] lg:overflow-visible lg:pb-0 lg:snap-none">
        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id.toString();
          const grad = getCategoryGradient(cat.id);
          const Icon = getCategoryIcon(cat.name);
          return (
            <button
              key={cat.id}
              onClick={() => handleSelect(cat.id.toString())}
              aria-pressed={isActive}
              className={`group flex min-w-[76px] flex-col items-center gap-2.5 rounded-xl p-2 transition-all duration-300 hover:-translate-y-0.5 snap-start ${
                isActive ? "bg-[rgba(var(--primary-rgb),0.08)]" : "hover:bg-[var(--bg-hover)]"
              }`}
            >
              <span
                className={`relative flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-hover:-rotate-3 ${grad} ${
                  isActive ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg-card)]" : ""
                }`}
              >
                <Icon size={24} strokeWidth={1.8} />
                <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" aria-hidden="true" />
              </span>
              <span
                className={`text-[11px] font-medium leading-tight text-center line-clamp-2 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors ${
                  isActive ? "text-[var(--primary)] font-semibold" : ""
                }`}
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}