/**
 * Permission Constants
 *
 * Tất cả permission codes được định nghĩa tập trung tại đây.
 * Các component chỉ sử dụng constants này, không hardcode string.
 *
 * Format: <MODULE>_<ACTION> = "module:action"
 */

// ── Product Permissions ──
export const PRODUCT_READ = "product:read";
export const PRODUCT_CREATE = "product:create";
export const PRODUCT_UPDATE = "product:update";
export const PRODUCT_DELETE = "product:delete";

// ── User Permissions ──
export const USER_READ = "user:read";
export const USER_UPDATE = "user:update";
export const USER_DELETE = "user:delete";

// ── Role Permissions ──
export const ROLE_MANAGE = "role:manage";

// ── Order Permissions ──
export const ORDER_READ = "order:read";
export const ORDER_MANAGE = "order:manage";

// ── Payment Permissions ──
export const PAYMENT_READ = "payment:read";
export const PAYMENT_MANAGE = "payment:manage";

// ── Grouped permissions by module ──
export const PRODUCT_PERMISSIONS = [
  PRODUCT_READ,
  PRODUCT_CREATE,
  PRODUCT_UPDATE,
  PRODUCT_DELETE,
] as const;

export const USER_PERMISSIONS = [
  USER_READ,
  USER_UPDATE,
  USER_DELETE,
] as const;

export const ORDER_PERMISSIONS = [
  ORDER_READ,
  ORDER_MANAGE,
] as const;

export const PAYMENT_PERMISSIONS = [
  PAYMENT_READ,
  PAYMENT_MANAGE,
] as const;

// ── All permissions ──
export const ALL_PERMISSIONS = [
  ...PRODUCT_PERMISSIONS,
  ...USER_PERMISSIONS,
  ...ORDER_PERMISSIONS,
  ...PAYMENT_PERMISSIONS,
  ROLE_MANAGE,
] as const;

// ── Type helper ──
export type PermissionCode = (typeof ALL_PERMISSIONS)[number];

// ── Permission Labels (cho UI) ──
export const PERMISSION_LABELS: Record<string, string> = {
  [PRODUCT_READ]: "View Products",
  [PRODUCT_CREATE]: "Create Products",
  [PRODUCT_UPDATE]: "Update Products",
  [PRODUCT_DELETE]: "Delete Products",
  [USER_READ]: "View Users",
  [USER_UPDATE]: "Update Users",
  [USER_DELETE]: "Delete Users",
  [ROLE_MANAGE]: "Manage Roles",
  [ORDER_READ]: "View Orders",
  [ORDER_MANAGE]: "Manage Orders",
  [PAYMENT_READ]: "View Payments",
  [PAYMENT_MANAGE]: "Manage Payments",
};

// ── Roles constants ──
export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
  USER: "user",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];