"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/auth/contexts/AuthContext";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthContext();

  useEffect(() => {
    if (isLoading) return;
    router.replace(isAuthenticated ? "/products" : "/products");
  }, [router, isAuthenticated, isLoading]);

  return (
    <div className="page-loading">
      <div className="spinner" aria-hidden="true" />
      <p>Loading SuperMart...</p>
    </div>
  );
}
