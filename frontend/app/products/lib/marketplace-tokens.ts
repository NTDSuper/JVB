// ─────────────────────────────────────────────────────────────────────────────
// Marketplace display tokens — purely presentational helpers.
// Categories in the data model have no image, so we derive a deterministic
// gradient per category id for the circular avatar tiles. No business logic.
// Colors are muted/soft to keep the overall page calm — orange is reserved
// for deal/discount accents only.
// ─────────────────────────────────────────────────────────────────────────────

import type { LucideIcon } from "lucide-react";
import {
  Carrot,
  Beef,
  Fish,
  Milk,
  Croissant,
  Coffee,
  Cookie,
  Apple,
  Pizza,
  IceCream,
  Egg,
  Wheat,
  Soup,
  Sandwich,
  BottleWine,
  Candy,
  Cherry,
  Citrus,
  Grape,
  Leaf,
  ShoppingBag,
  Package,
  UtensilsCrossed,
  Drumstick,
  CakeSlice,
  Wine,
  Beer,
  CupSoda,
  Shrimp,
  Salad,
} from "lucide-react";

const CATEGORY_GRADIENTS: { from: string; to: string }[] = [
  { from: "from-[#EA580C]/85", to: "to-[#F97316]/70" },   // soft orange
  { from: "from-[#059669]/85", to: "to-[#10B981]/70" },   // soft emerald
  { from: "from-[#6366F1]/85", to: "to-[#818CF8]/70" },   // soft indigo
  { from: "from-[#0284C7]/85", to: "to-[#0EA5E9]/70" },   // soft sky
  { from: "from-[#D97706]/85", to: "to-[#F59E0B]/70" },   // soft amber
  { from: "from-[#DB2777]/85", to: "to-[#EC4899]/70" },   // soft pink
  { from: "from-[#7C3AED]/85", to: "to-[#A78BFA]/70" },   // soft purple
  { from: "from-[#16A34A]/85", to: "to-[#4ADE80]/70" },   // soft green
];

/** Deterministic gradient per category */
export const getCategoryGradient = (id: number): string => {
  const g = CATEGORY_GRADIENTS[Math.abs(id) % CATEGORY_GRADIENTS.length];
  return `bg-gradient-to-br ${g.from} ${g.to}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Category icon mapping — maps category names to illustrative lucide icons
// based on keyword matching. Falls back to a shopping bag icon.
// ─────────────────────────────────────────────────────────────────────────────

interface IconMatch {
  keywords: string[];
  icon: LucideIcon;
}

const ICON_MATCHES: IconMatch[] = [
  // Vegetables / produce
  { keywords: ["vegetable", "veggie", "rau", "củ", "produce", "greens"], icon: Carrot },
  { keywords: ["salad", "green", "leaf", "xà lách"], icon: Salad },
  { keywords: ["leaf", "herb", "thảo mộc"], icon: Leaf },

  // Fruits
  { keywords: ["fruit", "trái cây", "apple", "tao", "quả"], icon: Apple },
  { keywords: ["cherry", "berry", "dâu", "anh đào"], icon: Cherry },
  { keywords: ["citrus", "orange", "lemon", "lime", "chanh", "cam"], icon: Citrus },
  { keywords: ["grape", "nho"], icon: Grape },

  // Meat & seafood
  { keywords: ["meat", "thịt", "beef", "bò", "pork", "heo"], icon: Beef },
  { keywords: ["chicken", "poultry", "gà", "duck", "vịt"], icon: Drumstick },
  { keywords: ["fish", "seafood", "cá", "hải sản", "salmon", "tuna"], icon: Fish },
  { keywords: ["shrimp", "prawn", "tôm"], icon: Shrimp },

  // Dairy & eggs
  { keywords: ["dairy", "milk", "sữa", "cheese", "phô mai", "yogurt", "sữa chua"], icon: Milk },
  { keywords: ["egg", "trứng"], icon: Egg },

  // Bakery & grains
  { keywords: ["bakery", "bread", "bánh mì", "bánh", "pastry", "croissant"], icon: Croissant },
  { keywords: ["cake", "dessert", "bánh ngọt", "tiramisu"], icon: CakeSlice },
  { keywords: ["wheat", "grain", "rice", "gạo", "ngũ cốc", "cereal"], icon: Wheat },
  { keywords: ["noodle", "pasta", "mì", "phở", "bún"], icon: Soup },

  // Prepared food
  { keywords: ["pizza", "fast food", "đồ ăn nhanh"], icon: Pizza },
  { keywords: ["sandwich", "burger", "bánh mì kẹp"], icon: Sandwich },
  { keywords: ["food", "meal", "đồ ăn", "món ăn", "cuisine"], icon: UtensilsCrossed },

  // Beverages
  { keywords: ["coffee", "cà phê", "espresso", "latte"], icon: Coffee },
  { keywords: ["tea", "trà", "matcha"], icon: CupSoda },
  { keywords: ["soda", "soft drink", "nước ngọt", "coke", "pepsi"], icon: CupSoda },
  { keywords: ["juice", "nước ép", "smoothie"], icon: CupSoda },
  { keywords: ["water", "nước suối", "khoáng"], icon: BottleWine },
  { keywords: ["wine", "vang", "champagne"], icon: Wine },
  { keywords: ["beer", "bia", "ale"], icon: Beer },
  { keywords: ["alcohol", "liquor", "rượu", "spirits"], icon: BottleWine },

  // Snacks & sweets
  { keywords: ["snack", "đồ ăn vặt", "chips", "bim bim"], icon: Cookie },
  { keywords: ["candy", "chocolate", "kẹo", "socola", "sweet"], icon: Candy },
  { keywords: ["ice cream", "kem", "gelato"], icon: IceCream },
  { keywords: ["cookie", "biscuit", "bánh quy"], icon: Cookie },

  // General / fallback
  { keywords: ["package", "box", "đóng gói"], icon: Package },
];

/**
 * Returns an illustrative lucide icon for a category based on its name.
 * Falls back to ShoppingBag if no keyword matches.
 */
export const getCategoryIcon = (name: string): LucideIcon => {
  const lower = name.toLowerCase();
  for (const match of ICON_MATCHES) {
    if (match.keywords.some((kw) => lower.includes(kw))) {
      return match.icon;
    }
  }
  return ShoppingBag;
};