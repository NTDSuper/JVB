"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthContext } from "@/auth/contexts/AuthContext";

// Public routes: only Guest and User can access, NOT Manager/Admin
const PUBLIC_ROUTES = ["/", "/login", "/register", "/products", "/403"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/products/");
}

export function LoadingSpinner() {
  return (
    <div
      className="page-loading"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: "16px",
      }}
    >
      <div
        className="spinner"
        style={{ width: 36, height: 36, borderWidth: 3 }}
        aria-hidden="true"
      />
      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
        Verifying permissions...
      </p>
    </div>
  );
}

interface ProtectionOptions {
  roles?: string[];
  requireAuth?: boolean;
}

export function withProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: ProtectionOptions | string[] = {}
) {
  const allowedRoles = Array.isArray(options) ? options : options.roles;
  const requireAuth = Array.isArray(options) ? true : (options.requireAuth ?? true);

  return function ProtectedComponent(props: P) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isLoading, isAuthenticated } = useAuthContext();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    const userRoles: string[] = user
      ? Array.isArray(user.role)
        ? user.role
        : user.role
          ? [user.role]
          : []
      : [];

    const hasRequiredRole =
      !allowedRoles || allowedRoles.length === 0
        ? true
        : allowedRoles.some((r) => userRoles.includes(r));

    const isManagerOrAdmin = userRoles.some((r) => r === "manager" || r === "admin");

    useEffect(() => {
      if (!isMounted || isLoading) return;

      // If user is Manager or Admin, block access to public customer routes
      if (isAuthenticated && isManagerOrAdmin && isPublicRoute(pathname)) {
        router.replace("/dashboard");
        return;
      }

      if (requireAuth && !isAuthenticated && !isPublicRoute(pathname)) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      if (
        requireAuth &&
        isAuthenticated &&
        allowedRoles &&
        allowedRoles.length > 0 &&
        !hasRequiredRole
      ) {
        router.replace("/403");
        return;
      }
    }, [isMounted, isLoading, isAuthenticated, hasRequiredRole, requireAuth, router, pathname, isManagerOrAdmin]);

    // 1. Initial SSR render & client mount wait -> ONLY render loading spinner
    if (!isMounted || isLoading) {
      return <LoadingSpinner />;
    }

    // 2. Manager/Admin blocked from public customer routes
    if (isAuthenticated && isManagerOrAdmin && isPublicRoute(pathname)) {
      return <LoadingSpinner />;
    }

    // 3. Unauthenticated check
    if (requireAuth && !isAuthenticated && !isPublicRoute(pathname)) {
      return <LoadingSpinner />;
    }

    // 4. Unauthorized role check -> ONLY render loading spinner while router redirects
    if (
      requireAuth &&
      isAuthenticated &&
      allowedRoles &&
      allowedRoles.length > 0 &&
      !hasRequiredRole
    ) {
      return <LoadingSpinner />;
    }

    // 5. Authorized -> Render page component
    return <WrappedComponent {...props} />;
  };
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated } = useAuthContext();
  const [isMounted, setIsMounted] = useState(false);

  const isPublic = isPublicRoute(pathname);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const userRoles: string[] = user
    ? Array.isArray(user.role)
      ? user.role
      : user.role
        ? [user.role]
        : []
    : [];

  const hasRequiredRole =
    !roles || roles.length === 0
      ? true
      : roles.some((r) => userRoles.includes(r));

  const isManagerOrAdmin = userRoles.some((r) => r === "manager" || r === "admin");

  useEffect(() => {
    if (!isMounted || isLoading) return;

    if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
      router.replace(isManagerOrAdmin ? "/dashboard" : "/products");
      return;
    }

    // Block Manager/Admin from customer routes
    if (isAuthenticated && isManagerOrAdmin && isPublic) {
      router.replace("/dashboard");
      return;
    }

    if (!isAuthenticated && !isPublic) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (roles && roles.length > 0 && user && isAuthenticated && !hasRequiredRole) {
      router.replace("/403");
      return;
    }
  }, [isMounted, isLoading, isAuthenticated, hasRequiredRole, roles, user, isPublic, router, pathname, isManagerOrAdmin]);

  // NEVER render children if loading, unauthenticated on private route, or unauthorized role
  if (!isMounted || (isLoading && !isPublic)) {
    return <LoadingSpinner />;
  }

  // Block Manager/Admin from customer routes
  if (isAuthenticated && isManagerOrAdmin && isPublic) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated && !isPublic) {
    return <LoadingSpinner />;
  }

  if (roles && roles.length > 0 && !hasRequiredRole) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
}