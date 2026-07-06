"use client";

/**
 * useAuth - Hook để truy cập AuthContext
 *
 * Ví dụ:
 *   const { user, isAuthenticated, login, logout } = useAuth();
 */

import { useAuthContext } from "@/auth/contexts/AuthContext";

export const useAuth = () => {
  return useAuthContext();
};