"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, ShoppingBag, Loader2, Minus, Plus } from "lucide-react";
import { Product } from "@/types/dto";
import { getS3PublicUrl } from "@/lib/s3-url";
import { useAuthContext } from "@/auth/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  getSold,
  getDiscountPct,
  getOriginalPrice,
} from "@/app/products/lib/marketplace";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product, quantity: number) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const [isAdding, setIsAdding] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const userRoles = user ? (Array.isArray(user.role) ? user.role : [user.role]) : [];
  const isManagerOrAdmin = userRoles.some((r) => r === "manager" || r === "admin");
  const isBuyer = userRoles.includes("user");
  const canAddToCart = !user || isBuyer;
  const showAddToCartButton = !user || isBuyer;
  const isOutOfStock = product.stock <= 0 || product.status !== "active";

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canAddToCart || isOutOfStock) return;

    setIsAdding(true);
    try {
      await onAddToCart?.(product, quantity);
    } catch (err) {
      console.error("Failed to add to cart:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuantity((prev) => Math.min(product.stock, prev + 1));
  };

  const imageUrl = product.image_url ? getS3PublicUrl(product.image_url) : null;
  const sold = getSold(product);
  const discount = getDiscountPct(product);
  const original = getOriginalPrice(product);

  return (
    <div
      onClick={() => router.push(`/products/${product.id}`)}
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-[var(--shadow-xl)]"
    >
      {/* ── Image (1:1, object-cover) ── */}
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
            <ShoppingBag size={36} strokeWidth={1.5} />
          </div>
        )}

        {/* Discount badge */}
        {discount > 0 && (
          <span className="absolute left-2.5 top-2.5 rounded-lg bg-gradient-to-br from-[#F97316] to-[#EA580C] px-2 py-1 text-[11px] font-bold leading-none text-white shadow-[0_2px_8px_rgba(234,88,12,0.35)]">
            -{discount}%
          </span>
        )}

        {/* Wishlist */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsFavorite(!isFavorite);
          }}
          aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={isFavorite}
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-card)]/90 text-[var(--text-muted)] shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:text-[#F43F5E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        >
          <Heart size={15} fill={isFavorite ? "currentColor" : "none"} />
        </button>

        {/* Status badge - only for admin/manager */}
        {isManagerOrAdmin && (
          <div className="absolute bottom-2.5 left-2.5">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${product.status === "active"
                ? "bg-[#EAF7EE] text-[#1F9D55]"
                : product.status === "archived"
                  ? "bg-[var(--bg-input)] text-[var(--text-secondary)]"
                  : "bg-[#FEE2E2] text-[#DC2626]"
                }`}
            >
              {product.status}
            </span>
          </div>
        )}

        {/* Out of stock overlay */}
        {product.stock <= 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-overlay)] backdrop-blur-[2px]">
            <span className="rounded-full bg-[var(--bg-card-solid)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] shadow-md">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Name — 2 lines max */}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
          {product.name}
        </h3>

        {/* Sold count */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--text-muted)]">{sold} sold</span>
        </div>

        {/* Price — current emphasized, original strikethrough */}
        <div className="mt-auto flex items-baseline gap-1.5 pt-1">
          <span
            className="text-lg font-extrabold tracking-tight text-[var(--accent)]"
            style={{ fontFamily: "'Baloo 2', sans-serif" }}
          >
            ${product.price.toFixed(2)}
          </span>
          {discount > 0 && (
            <span className="text-[11px] font-medium text-[var(--text-muted)] line-through">
              ${original.toFixed(2)}
            </span>
          )}
        </div>

        {/* CTA — quantity selector + add to cart */}
        {showAddToCartButton && (
          <div className="md:translate-y-1 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-300">
            {isOutOfStock ? (
              <button
                disabled
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--bg-input)] px-3 py-2.5 text-sm font-semibold text-[var(--text-muted)] cursor-not-allowed opacity-60"
              >
                <ShoppingBag size={15} />
                Out of stock
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {/* Quantity selector */}
                <div className="flex shrink-0 items-center rounded-xl border border-[var(--border)] bg-[var(--bg-input)]">
                  <button
                    onClick={handleDecrease}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="flex h-9 w-8 items-center justify-center rounded-l-xl text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--text-secondary)]"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-8 text-center text-sm font-bold tabular-nums text-[var(--text-primary)]">
                    {quantity}
                  </span>
                  <button
                    onClick={handleIncrease}
                    disabled={quantity >= product.stock}
                    aria-label="Increase quantity"
                    className="flex h-9 w-8 items-center justify-center rounded-r-xl text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--text-secondary)]"
                  >
                    <Plus size={13} />
                  </button>
                </div>

                {/* Add to cart */}
                <button
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-3 py-2.5 text-sm font-semibold text-white shadow-[0_3px_10px_rgba(234,88,12,0.2)] transition-all duration-200 hover:from-[#EA580C] hover:to-[#C2410C] hover:shadow-[0_5px_16px_rgba(234,88,12,0.3)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  {isAdding ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <ShoppingBag size={15} />
                  )}
                  {isAdding ? "Adding..." : "Add to cart"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}