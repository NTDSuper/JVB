"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthContext } from "@/auth/contexts/AuthContext";

const PUBLIC_ROUTES = ["/", "/login", "/register"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname);
}

interface Props {
  children: React.ReactNode;
  roles?: string[];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated } = useAuthContext();

  const isPublic = isPublicRoute(pathname);

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
      router.replace("/products");
      return;
    }

    if (!isAuthenticated && !isPublic) {
      router.replace("/login");
      return;
    }

    if (roles && roles.length > 0 && user && isAuthenticated) {
      const userRoles: string[] = Array.isArray(user.role)
        ? user.role
        : user.role
          ? [user.role]
          : [];

      const hasRole = roles.some((role) => userRoles.includes(role));

      if (!hasRole) {
        router.replace("/products");
      }
    }
  }, [router, pathname, roles, user, isLoading, isAuthenticated, isPublic]);

  if (isLoading && !isPublic) {
    return (
      <div className="page-loading">
        <div className="spinner" aria-hidden="true" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isLoading && !isAuthenticated && !isPublic) {
    return null;
  }

  return <>{children}</>;
}
