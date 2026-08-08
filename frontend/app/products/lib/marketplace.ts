// ─────────────────────────────────────────────────────────────────────────────
// Marketplace display helpers
// These derive *presentational only* metadata (rating, sold, discount, etc.)
// deterministically from the product id. They do NOT touch API responses,
// filtering, sorting, or any business logic — they exist purely so the UI can
// render a rich marketplace card layout consistent across reloads.
// ─────────────────────────────────────────────────────────────────────────────

import { Product } from "@/types/dto";

/** Deterministic 0–1 hash from a number. */
const hash = (n: number, salt: number): number => {
  const s = Math.abs(n * 9301 + 49297 + salt * 7817) % 233280;
  return s / 233280;
};

/** Star rating 4.0 – 4.9 */
export const getRating = (p: Product): number =>
  Math.round((4 + hash(p.id ?? 0, 3) * 0.9) * 10) / 10;

/** Sold count between 12 and 999 */
export const getSold = (p: Product): number =>
  Math.floor(hash(p.id ?? 0, 7) * 988) + 12;

/** Discount percent, 5 – 44 */
export const getDiscountPct = (p: Product): number =>
  Math.max(5, Math.floor(hash(p.id ?? 0, 13) * 40));

/** Original (pre-discount) price shown as strikethrough */
export const getOriginalPrice = (p: Product): number =>
  +(p.price / (1 - getDiscountPct(p) / 100)).toFixed(2);

/** Sale progress 12 – 98% used by the flash-sale progress bar */
export const getSaleProgress = (p: Product): number =>
  Math.min(98, Math.max(12, Math.floor(hash(p.id ?? 0, 29) * 100)));

/** Short deterministic label for flash-sale cards ("Mua ngay", "Hot") */
export const getDealLabel = (p: Product): string =>
  hash(p.id ?? 0, 41) > 0.5 ? "Hot" : "Mua ngay";

export const formatVND = (price: number): string => `$${price.toFixed(2)}`;