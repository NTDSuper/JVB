/**
 * Auth Service
 *
 * Quản lý:
 * - Token storage / retrieval / removal
 * - Login / Register / Logout API calls
 * - Fetch current user from /users/me
 */

import api from "@/lib/api";
import {
  AuthUser,
  LoginCredentials,
  RegisterData,
  AuthResponse,
} from "@/auth/types";

// ── Cookie Management ──

export const setCookie = (name: string, value: string, days = 7): void => {
  if (typeof window === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

export const getCookie = (name: string): string | null => {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : null;
};

export const removeCookie = (name: string): void => {
  if (typeof window === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
};

// ── Token Management ──

const TOKEN_KEY = "access_token";

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) || getCookie(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
  setCookie(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  removeCookie(TOKEN_KEY);
  removeCookie("user_roles");
};

// ── Auth API ──

export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>("/login", {
    email: credentials.email,
    password: credentials.password,
  });
  return res.data;
};

export const register = async (data: RegisterData): Promise<AuthUser> => {
  const res = await api.post<AuthUser>("/register", data);
  return res.data;
};

export const logout = async (): Promise<void> => {
  try {
    await api.post("/logout", {});
  } catch {
    // Always clear local state even if API fails
  } finally {
    removeToken();
  }
};

export const fetchCurrentUser = async (): Promise<AuthUser> => {
  const res = await api.get<AuthUser>("/users/me");
  return res.data;
};

// ── Token Decode (client-side) ──

export const decodeToken = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  const exp = decoded.exp as number;
  return Date.now() >= exp * 1000;
};