/**
 * TopBar menu config
 *
 * Định nghĩa các mục menu dạng config/constant, không hardcode trong JSX.
 */

import type { PermissionCode } from "@/auth/constants/permissions";
import type { UserMenuItem } from "./types";

export const MENU_GROUPS = {
  user: [
    { href: "/orders", label: "Orders", icon: "ClipboardList" as const },
    { href: "/profile", label: "Profile", icon: "User" as const },
  ],
  staff: [
    { href: "/profile", label: "Profile", icon: "User" as const },
  ],
  admin_manager: [
    { href: "/orders/manage", label: "Quản lý đơn hàng", icon: "ClipboardList" as const },
    { href: "/products/manager", label: "Quản lý sản phẩm", icon: "Package" as const },
  ],
} as const;

export const MENU_FOOTER = [
  { key: "darkmode", label: "Dark mode", type: "darkmode" as const },
  { key: "logout", label: "Log out", type: "logout" as const, danger: true },
];

export type MenuItemType = (typeof MENU_GROUPS)[keyof typeof MENU_GROUPS][number];

export function buildUserMenu(
  roles: string[],
  canManageOrders: boolean,
  canManageProducts: boolean
): UserMenuItem[] {
  const items: UserMenuItem[] = [];

  const isStaff = roles.some((r) => r === "manager" || r === "admin");

  if (isStaff) {
    // Admin/Manager: chỉ Profile trong dropdown (không có Orders)
    for (const item of MENU_GROUPS.staff) {
      items.push({ ...item, group: "user" as const });
    }
  } else {
    // Regular user: Orders + Profile
    for (const item of MENU_GROUPS.user) {
      items.push({ ...item, group: "user" as const });
    }
  }

  // Admin/Manager group chỉ hiển thị khi có quyền tương ứng
  if (canManageOrders || canManageProducts) {
    for (const item of MENU_GROUPS.admin_manager) {
      if (item.label.includes("đơn hàng") && !canManageOrders) continue;
      if (item.label.includes("sản phẩm") && !canManageProducts) continue;
      items.push({ ...item, group: "admin_manager" as const });
    }
  }

  return items;
}

export function getAllMenuPermissions(): PermissionCode[] {
  return ["order:manage", "product:create", "product:update", "product:delete"];
}