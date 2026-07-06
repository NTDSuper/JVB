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

// ── Token Management ──

const TOKEN_KEY = "access_token";

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
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