"use client";

import React, {
  createContext,
  useContext,
  useState,
  useLayoutEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import type { AuthUser, LoginCredentials, AuthState } from "@/auth/types";
import * as authService from "@/auth/services/authService";
import * as permissionService from "@/auth/services/permissionService";

// ── Cache helpers ──
const CACHE_KEY = "auth_user";

function readCache(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch { return null; }
}
function writeCache(user: AuthUser): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(user));
    const roles = Array.isArray(user.role) ? user.role : user.role ? [user.role] : [];
    authService.setCookie("user_roles", JSON.stringify(roles));
  } catch {}
}
function clearCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
    authService.removeCookie("user_roles");
  } catch {}
}

// ── Context Shape ──
interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (data: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ──
interface AuthProviderProps { children: ReactNode; }

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const router = useRouter();

  // Luôn khởi tạo null — giống hệt SSR, tránh hydration mismatch
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Sau khi mount (client-only): đọc cache → render ngay, rồi verify API ngầm
  const refreshUser = useCallback(async () => {
    const token = authService.getToken();
    if (!token) {
      clearCache();
      setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
      return;
    }

    const cached = readCache();
    if (cached) {
      setState({ user: cached, isAuthenticated: true, isLoading: false, error: null });
    } else {
      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        isLoading: true,
        error: null,
      }));
    }

    try {
      const user = await authService.fetchCurrentUser();
      writeCache(user);
      setState({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch {
      clearCache();
      authService.removeToken();
      permissionService.clearPermissions();
      setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  }, []);

  useLayoutEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // ── Login ──
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const res = await authService.login(credentials);
        authService.setToken(res.access_token);

      const user = await authService.fetchCurrentUser();
        writeCache(user);
        setState({ user, isAuthenticated: true, isLoading: false, error: null });

        // Redirect based on role: Manager/Admin go to dashboard, User goes to products
        const userRoles = Array.isArray(user.role) ? user.role : [user.role];
        const isManagerOrAdmin = userRoles.some((r) => r === "manager" || r === "admin");
        router.replace(isManagerOrAdmin ? "/dashboard" : "/products");
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        const message = axiosErr.response?.data?.detail || "Login failed. Please try again.";
        setState((prev) => ({ ...prev, isLoading: false, error: message }));
        throw new Error(message);
      }
    },
    [router]
  );

  // ── Logout ──
  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } finally {
      // Clear all auth data
      clearCache();
      authService.removeToken();
      permissionService.clearPermissions();
      // Reset state to Guest
      setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
      // Force full page navigation to /products so middleware sees cleared cookies
      // Using window.location.href instead of router.replace to ensure cookies
      // are cleared before the middleware processes the request
      if (typeof window !== "undefined") {
        window.location.href = "/products";
      }
    }
  }, []);

  // ── Update local user data ──
  const updateUser = useCallback((data: Partial<AuthUser>): void => {
    setState((prev) => {
      if (!prev.user) return prev;
      const updated = { ...prev.user, ...data };
      writeCache(updated);
      return { ...prev, user: updated };
    });
  }, []);

  const value: AuthContextValue = { ...state, login, logout, refreshUser, updateUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ── Hook ──
export const useAuthContext = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within an AuthProvider");
  return ctx;
};