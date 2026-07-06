/**
 * Permission Service
 *
 * Service xử lý tất cả logic kiểm tra quyền.
 * - hasPermission: kiểm tra 1 permission
 * - hasAnyPermission: kiểm tra ít nhất 1 trong các permission
 * - hasAllPermissions: kiểm tra tất cả permissions
 * - hasRole: kiểm tra role
 * - isAdmin: kiểm tra admin role
 *
 * Service hoạt động độc lập với React, có thể dùng ở bất kỳ đâu.
 */

import {
  ALL_PERMISSIONS,
  ROLES,
  PRODUCT_CREATE,
  PRODUCT_UPDATE,
  PRODUCT_DELETE,
  USER_READ,
  USER_UPDATE,
  USER_DELETE,
  ROLE_MANAGE,
  ORDER_READ,
  ORDER_MANAGE,
  PAYMENT_MANAGE,
} from "@/auth/constants/permissions";

// ── In-memory store ──
let _permissions: Set<string> = new Set();
let _roles: Set<string> = new Set();

// ── Init ──
export const initPermissions = (
  permissionCodes: string[],
  roleNames: string[]
): void => {
  _permissions = new Set(permissionCodes);
  _roles = new Set(roleNames);
};

export const clearPermissions = (): void => {
  _permissions = new Set();
  _roles = new Set();
};

export const getPermissionCodes = (): string[] => {
  return Array.from(_permissions);
};

export const getRoleNames = (): string[] => {
  return Array.from(_roles);
};

// ── Check Permission ──

export const hasPermission = (permission: string): boolean => {
  if (!permission) return false;
  return _permissions.has(permission);
};

export const hasAnyPermission = (permissions: string[]): boolean => {
  if (!permissions || permissions.length === 0) return false;
  return permissions.some((p) => _permissions.has(p));
};

export const hasAllPermissions = (permissions: string[]): boolean => {
  if (!permissions || permissions.length === 0) return false;
  return permissions.every((p) => _permissions.has(p));
};

// ── Check Role ──

export const hasRole = (role: string): boolean => {
  if (!role) return false;
  return _roles.has(role);
};

export const hasAnyRole = (roles: string[]): boolean => {
  if (!roles || roles.length === 0) return false;
  return roles.some((r) => _roles.has(r));
};

export const isAdmin = (): boolean => {
  return _roles.has(ROLES.ADMIN);
};

// ── Validate permission code ──

export const isValidPermission = (code: string): boolean => {
  return (ALL_PERMISSIONS as readonly string[]).includes(code);
};

// ── Module-level helpers (dùng constants, không hardcode) ──
export const canManageProducts = (): boolean => {
  return hasAnyPermission([PRODUCT_CREATE, PRODUCT_UPDATE, PRODUCT_DELETE]);
};

export const canManageUsers = (): boolean => {
  return hasAnyPermission([USER_UPDATE, USER_DELETE]);
};

export const canViewUsers = (): boolean => {
  return hasPermission(USER_READ);
};

export const canManageRoles = (): boolean => {
  return hasPermission(ROLE_MANAGE);
};

export const canManageOrders = (): boolean => {
  return hasPermission(ORDER_MANAGE);
};

export const canViewOrders = (): boolean => {
  return hasPermission(ORDER_READ);
};

export const canManagePayments = (): boolean => {
  return hasPermission(PAYMENT_MANAGE);
};