"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ArrowRight, Star, ShoppingBag } from "lucide-react";
import { Product } from "@/types/dto";
import { getS3PublicUrl } from "@/lib/s3-url";
import SectionHeader from "./SectionHeader";
import {
  getRating,
  getSold,
  getDiscountPct,
  getOriginalPrice,
  getSaleProgress,
} from "@/app/products/lib/marketplace";

const TARGET = Date.now() + 1000 * 60 * 60 * 8 + 1000 * 60 * 42 + 1000 * 17; // ~8h42m17s

const getTimeLeft = () => {
  const diff = Math.max(0, TARGET - Date.now());
  return {
    h: Math.floor(diff / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
    s: Math.floor((diff % 60_000) / 1000),
  };
};

const pad = (n: number) => n.toString().padStart(2, "0");

export default function FlashSale({ products, onAddToCart }: { products: Product[]; onAddToCart?: (p: Product, q: number) => void }) {
  const router = useRouter();
  const [time, setTime] = useState(getTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 0);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  const scroll = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 260, behavior: "smooth" });
  };

  // Take up to 12 items, deterministic by id for stability
  const deals = [...products].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)).slice(0, 12);

  return (
    <section
      aria-label="Flash sale"
      className="overflow-hidden rounded-2xl border border-[var(--accent)]/30 bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5] px-4 py-4 sm:px-5 sm:py-5 shadow-[var(--shadow-accent)]"
    >
      <SectionHeader
        icon={ShoppingBag}
        title="Flash Sale"
        subtitle="Up to 50% off · Limited stock"
        accent="deal"
        action={
          <button
            onClick={() => router.push("/products")}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#DC2626]/30 bg-white px-4 py-2 text-xs font-semibold text-[#DC2626] transition-all duration-200 hover:border-[#DC2626] hover:bg-[#DC2626] hover:text-white"
          >
            View All
            <ArrowRight size={13} />
          </button>
        }
      />

      {/* Countdown — sits between header and slider */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] font-medium tracking-wide text-[var(--accent-dark)] uppercase">
          Ends in
        </span>
        <div className="flex items-center gap-1">
          {[time.h, time.m, time.s].map((v, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#EA580C] to-[#DC2626] text-xs font-bold tabular-nums text-white shadow-[0_2px_8px_rgba(234,88,12,0.35)]">
                {pad(v)}
              </span>
              {i < 2 && <span className="text-xs font-bold text-[var(--accent)]">:</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        {canLeft && (
          <button
            onClick={() => scroll(-1)}
            aria-label="Scroll deals left"
            className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-card-solid)] border border-[var(--border)] shadow-md text-[var(--text-secondary)] transition-all hover:text-[var(--accent)] hover:border-[var(--accent)]/40"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {canRight && (
          <button
            onClick={() => scroll(1)}
            aria-label="Scroll deals right"
            className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-card-solid)] border border-[var(--border)] shadow-md text-[var(--text-secondary)] transition-all hover:text-[var(--accent)] hover:border-[var(--accent)]/40"
          >
            <ChevronRight size={18} />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto scrollbar-none snap-x"
        >
          {deals.map((product) => {
            const imageUrl = product.image_url ? getS3PublicUrl(product.image_url) : null;
            const rating = getRating(product);
            const sold = getSold(product);
            const discount = getDiscountPct(product);
            const original = getOriginalPrice(product);
            const progress = getSaleProgress(product);

            return (
              <article
                key={product.id}
                onClick={() => router.push(`/products/${product.id}`)}
                className="group relative flex w-[164px] sm:w-[180px] shrink-0 snap-start cursor-pointer flex-col overflow-hidden rounded-xl border-2 border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)] hover:border-[var(--accent)]/40"
              >
                {/* Discount badge */}
                <span className="absolute left-0 top-0 z-20 rounded-br-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] px-2.5 py-1.5 text-sm font-extrabold leading-none text-white shadow-[0_3px_10px_rgba(234,88,12,0.45)]">
                  -{discount}%
                </span>

                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-[var(--bg-input)]">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                      <ShoppingBag size={32} strokeWidth={1.5} />
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-[var(--text-primary)]">
                    {product.name}
                  </h3>

                  {/* Rating + sold */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                      <Star size={10} fill="currentColor" className="text-[#F59E0B]" />
                      {rating.toFixed(1)}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)]">{sold} sold</span>
                  </div>

                  {/* Prices */}
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="text-base font-extrabold tracking-tight text-[var(--accent)]"
                      style={{ fontFamily: "'Baloo 2', sans-serif" }}
                    >
                      ${product.price.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-medium text-[var(--text-muted)] line-through">
                      ${original.toFixed(2)}
                    </span>
                  </div>

                  {/* Sale progress */}
                  <div className="mt-0.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-medium text-[var(--text-muted)]">Sold</span>
                      <span className="text-[9px] font-bold text-[var(--accent)]">{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-input)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#F97316] to-[#F59E0B]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* CTA — accent orange to match sale theme */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart?.(product, 1);
                    }}
                    disabled={product.stock <= 0 || product.status !== "active"}
                    className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-[#F97316] to-[#EA580C] px-2 py-1.5 text-[11px] font-bold text-white shadow-[0_2px_6px_rgba(234,88,12,0.25)] transition-all duration-200 hover:from-[#EA580C] hover:to-[#C2410C] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ShoppingBag size={11} />
                    {product.stock <= 0 ? "Sold out" : "Mua ngay"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}