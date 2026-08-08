"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, SearchX, RotateCcw, FolderOpen } from "lucide-react";
import api from "@/lib/api";
import Toast from "@/components/Toast";
import { Product, Category } from "@/types/dto";
import { useAuthContext } from "@/auth/contexts/AuthContext";
import ProductCard from "./components/ProductCard";
import ProductCardSkeleton from "./components/ProductCardSkeleton";
import FilterBar from "./components/FilterBar";
import { FilterOptions } from "./components/filter-types";
import SortDropdown from "./components/SortDropdown";
import HeroCarousel from "./components/HeroCarousel";
import QuickActions from "./components/QuickActions";
import CategorySection from "./components/CategorySection";
import SectionHeader from "./components/SectionHeader";

const PAGE_SIZE = 25;

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthContext();
  const userRoles = user ? (Array.isArray(user.role) ? user.role : [user.role]) : [];
  const isManagerOrAdmin = userRoles.some((r) => r === "manager" || r === "admin");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchedKeyword, setSearchedKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    category_id: "",
    sort_by: "popularity",
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get<Category[]>("/products/categories/all");
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["products", searchedKeyword, page, filters.category_id, filters.min_price, filters.max_price, filters.in_stock, filters.sort_by],
    queryFn: async () => {
      if (searchedKeyword) {
        const skip = page * PAGE_SIZE;
        const res = await api.get<{ items: Product[]; total: number; skip: number; limit: number }>(
          `/products/search?keyword=${encodeURIComponent(searchedKeyword)}&skip=${skip}&limit=${PAGE_SIZE}`
        );
        return res.data;
      }
      // When client-side filters are active, fetch all products to get accurate total count
      const hasClientSideFilters = filters.min_price !== undefined || filters.max_price !== undefined || filters.in_stock !== undefined;

      if (hasClientSideFilters) {
        let url = `/products/all?skip=0&limit=1000`;
        if (filters.category_id) {
          url += `&category_id=${filters.category_id}`;
        }
        const res = await api.get<{ items: Product[]; total: number; skip: number; limit: number }>(url);
        let items = res.data.items;

        // Apply filters client-side
        if (filters.min_price !== undefined) {
          items = items.filter(p => p.price >= filters.min_price!);
        }
        if (filters.max_price !== undefined) {
          items = items.filter(p => p.price <= filters.max_price!);
        }
        if (filters.in_stock === true) {
          items = items.filter(p => p.stock > 0);
        } else if (filters.in_stock === false) {
          items = items.filter(p => p.stock <= 0);
        }

        // Apply sorting client-side
        const sorted = [...items];
        switch (filters.sort_by) {
          case "price_asc":
            sorted.sort((a, b) => a.price - b.price);
            break;
          case "price_desc":
            sorted.sort((a, b) => b.price - a.price);
            break;
          case "name_asc":
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
          case "newest":
            sorted.sort((a, b) => (b.id || 0) - (a.id || 0));
            break;
          default:
            break;
        }

        // Apply pagination client-side
        const start = page * PAGE_SIZE;
        const paginatedItems = sorted.slice(start, start + PAGE_SIZE);
        return { items: paginatedItems, total: sorted.length, skip: start, limit: PAGE_SIZE };
      }

      // No client-side filters, use server-side pagination
      const skip = page * PAGE_SIZE;
      let url = `/products/all?skip=${skip}&limit=${PAGE_SIZE}`;
      if (filters.category_id) {
        url += `&category_id=${filters.category_id}`;
      }
      const res = await api.get<{ items: Product[]; total: number; skip: number; limit: number }>(url);
      let items = res.data.items;

      // Apply sorting client-side
      const sorted = [...items];
      switch (filters.sort_by) {
        case "price_asc":
          sorted.sort((a, b) => a.price - b.price);
          break;
        case "price_desc":
          sorted.sort((a, b) => b.price - a.price);
          break;
        case "name_asc":
          sorted.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "newest":
          sorted.sort((a, b) => (b.id || 0) - (a.id || 0));
          break;
        default:
          break;
      }

      return { items: sorted, total: res.data.total, skip, limit: PAGE_SIZE };
    },
    staleTime: 1000 * 60 * 1,
  });

  const products = data?.items ?? [];
  const totalProducts = data?.total ?? 0;
  const totalPages = Math.ceil(totalProducts / PAGE_SIZE);

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      setSearchedKeyword(searchQuery.trim());
      setPage(0);
    }
  }, [searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchedKeyword("");
    setPage(0);
    setFilters((prev) => ({ ...prev, search: "" }));
  }, []);

  const handleFilterChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
    setPage(0);
    if (newFilters.search !== filters.search) {
      setSearchedKeyword(newFilters.search);
    }
  }, [filters.search]);

  const handleCategorySelect = useCallback((categoryId: string) => {
    setFilters((prev) => {
      // Toggle filter: clicking the same active category deselects it
      const newCategoryId = prev.category_id === categoryId ? "" : categoryId;
      return { ...prev, category_id: newCategoryId };
    });
    setPage(0);
  }, []);

  const handleReset = useCallback(() => {
    setSearchQuery("");
    setSearchedKeyword("");
    setPage(0);
    setFilters({
      search: "",
      category_id: "",
      sort_by: "popularity",
    });
  }, []);

  const handlePreviousPage = () => {
    setPage((prev: number) => Math.max(0, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextPage = () => {
    setPage((prev: number) => Math.min(totalPages - 1, prev + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addToCart = async (product: Product, quantity: number) => {
    if (!isAuthenticated) {
      setToast({
        message: "Please log in to add products to your cart.",
        type: "info",
      });
      const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/products";
      setTimeout(() => {
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      }, 600);
      return;
    }

    const userRoles = Array.isArray(user?.role) ? user.role : user?.role ? [user.role] : [];
    if (userRoles.length > 0 && !userRoles.includes("user")) {
      setToast({
        message: "Only customer accounts (user) can add products to the cart.",
        type: "error",
      });
      return;
    }

    try {
      await api.post("/cart/add", {
        product_id: product.id,
        quantity,
      });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setToast({ message: `Added "${product.name}" to cart`, type: "success" });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setToast({
        message: axiosErr.response?.data?.detail || "Failed to add to cart",
        type: "error",
      });
    }
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  // Generate page number buttons (show max 5 pages around current)
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

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-[1920px] space-y-8 sm:space-y-10 lg:space-y-12">
        {/* ── Hero banner carousel ── */}
        <HeroCarousel />

        {/* ── Quick actions ── */}
        <QuickActions />

        {/* ── Categories ── */}
        <CategorySection
          categories={categories}
          activeCategoryId={filters.category_id}
          onSelect={handleCategorySelect}
        />

        {/* ── Search & Filter Bar — below categories ── */}
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
        />

        {/* ── Product Grid ── */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)]">
            <div className="p-4 sm:p-6">
              <SectionHeader
                icon={FolderOpen}
                title="All Products"
                subtitle={isLoading ? "Loading..." : `${totalProducts} item${totalProducts !== 1 ? "s" : ""} available`}
                action={
                  <SortDropdown
                    sortBy={filters.sort_by}
                    onSortChange={(sortBy) => setFilters((prev: FilterOptions) => ({ ...prev, sort_by: sortBy }))}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                  />
                }
              />

              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center animate-fade-in">
                  <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--bg-hover)] text-[var(--primary)]">
                      <SearchX size={36} strokeWidth={1.5} />
                    </div>
                    <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF1EC] text-[#EA580C] dark:bg-[#2A1A10] dark:text-[#FB923C]">
                      <Package size={14} />
                    </div>
                  </div>
                  <div>
                    <div className="text-base font-semibold text-[var(--text-primary)] mb-1">
                      No products found
                    </div>
                    <p className="text-sm text-[var(--text-muted)] max-w-sm">
                      {searchedKeyword
                        ? `No results for "${searchedKeyword}". Try a different keyword or clear your filters.`
                        : "No products available at the moment. Try adjusting your filters."}
                    </p>
                  </div>
                  {(searchedKeyword || filters.category_id || filters.min_price !== undefined || filters.max_price !== undefined || filters.in_stock !== undefined) && (
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-primary)] transition-all duration-200 hover:bg-[var(--primary-dark)] hover:shadow-lg active:scale-95"
                    >
                      <RotateCcw size={14} />
                      Reset filters
                    </button>
                  )}
                </div>
              ) : (
                <div
                  key={`${searchedKeyword}-${page}-${filters.category_id}`}
                  className={`grid gap-3 sm:gap-4 animate-fade-in ${viewMode === "grid"
                    ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
                    : "grid-cols-1"
                    }`}
                >
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={addToCart}
                    />
                  ))}
                </div>
              )}

              {/* ── Pagination ── */}
              {totalPages > 1 && (
                <div className="mt-8 pt-6 border-t border-[var(--border-light)]">
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <button
                      onClick={handlePreviousPage}
                      disabled={page === 0}
                      className="px-4 py-2 rounded-full bg-[var(--bg-input)] border border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:border-[var(--primary)] hover:text-[var(--text-primary)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      &laquo; Previous
                    </button>

                    <div className="flex items-center gap-1.5">
                      {getPageNumbers().map((p, idx) =>
                        p === "..." ? (
                          <span key={`ellipsis-${idx}`} className="px-1 text-[var(--text-muted)]">
                            ...
                          </span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => {
                              setPage(p);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            aria-current={p === page ? "page" : undefined}
                            className={`min-w-[40px] h-10 rounded-full text-sm font-semibold transition-all duration-200 ${p === page
                              ? "bg-[var(--primary)] text-white shadow-[var(--shadow-primary)] scale-105"
                              : "bg-transparent border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:border-[var(--primary)] hover:text-[var(--text-primary)]"
                              }`}
                          >
                            {p + 1}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      onClick={handleNextPage}
                      disabled={page >= totalPages - 1}
                      className="px-4 py-2 rounded-full bg-[var(--bg-input)] border border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:border-[var(--primary)] hover:text-[var(--text-primary)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next &raquo;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
