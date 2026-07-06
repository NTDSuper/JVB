"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { useAuthContext } from "@/auth/contexts/AuthContext";
import { getToken } from "@/lib/auth";
import api from "@/lib/api";
import { Cart } from "@/types/dto";

const HIDDEN_ROUTES = ["/login", "/register"];

const NAV_LINKS = [
  { href: "/products", label: "Products" },
  { href: "/cart", label: "Cart", showBadge: true },
  { href: "/orders", label: "Orders" },
  { href: "/dashboard", label: "Manager", roles: ["manager", "admin"] },
  { href: "/admin", label: "Admin", roles: ["admin"] },
  { href: "/profile", label: "Profile" },
] as const;

interface NavLinkItemProps {
  href: string;
  label: string;
  badge?: number;
  isActive: boolean;
  onNavigate?: () => void;
}

function NavLinkItem({
  href,
  label,
  badge,
  isActive,
  onNavigate,
}: NavLinkItemProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`app-nav-link${isActive ? " active" : ""}`}
      onClick={onNavigate}
    >
      <span>{label}</span>
      {!!badge && (
        <span className="nav-badge" aria-label={`${badge} items`}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return (email?.[0] ?? "?").toUpperCase();
}

function readCachedUser() {
  try {
    const raw = sessionStorage.getItem("auth_user");
    return raw ? (JSON.parse(raw) as { full_name?: string; email?: string; role?: string[] | string }) : null;
  } catch {
    return null;
  }
}

export default function TopBar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthContext();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const hasSession = isAuthenticated || Boolean(getToken());
  const sessionUser = user ?? (hasSession ? readCachedUser() : null);

  const { data: cart } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const res = await api.get<Cart>("/cart");
      return res.data;
    },
    enabled: hasSession,
    staleTime: 1000 * 30,
  });

  const roles = useMemo(() => {
    if (!sessionUser?.role) return [];
    return Array.isArray(sessionUser.role) ? sessionUser.role : [sessionUser.role];
  }, [sessionUser?.role]);

  const visibleLinks = useMemo(
    () =>
      NAV_LINKS.filter((link) => {
        if (!("roles" in link)) return true;
        return link.roles.some((role) => roles.includes(role));
      }),
    [roles]
  );

  if (HIDDEN_ROUTES.includes(pathname)) {
    return null;
  }

  const cartCount = cart?.items?.length ?? 0;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setMobileOpen(false);
    }
  };

  const closeMobile = () => setMobileOpen(false);

  const displayName = sessionUser?.full_name || sessionUser?.email || "User";
  const initials = getInitials(sessionUser?.full_name, sessionUser?.email);

  return (
    <header className="app-header" role="banner">
      <div className="app-header-inner">
        <div className="app-brand-group">
          <Link href="/products" className="app-brand" aria-label="SuperMart">
            SuperMart
          </Link>
          <span className="app-brand-subtitle">Supermarket</span>
        </div>

        <nav className="app-nav app-nav-desktop" aria-label="Primary navigation">
          {visibleLinks.map((link) => (
            <NavLinkItem
              key={link.href}
              href={link.href}
              label={link.label}
              badge={
                "showBadge" in link && link.showBadge ? cartCount : undefined
              }
              isActive={isActive(link.href)}
            />
          ))}
        </nav>

        <div className="app-actions">
          {hasSession && (
            <>
              <Link href="/profile" className="user-chip" title={displayName}>
                <span className="user-chip-avatar" aria-hidden="true">
                  {initials}
                </span>
                <span>{displayName}</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-ghost btn-sm logout-btn logout-btn-desktop"
                disabled={loggingOut}
              >
                {loggingOut ? "..." : "Logout"}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-ghost btn-sm logout-btn logout-btn-mobile"
                disabled={loggingOut}
                aria-label="Logout"
                title="Logout"
              >
                {loggingOut ? "..." : "Logout"}
              </button>
            </>
          )}

          <button
            type="button"
            className="app-menu-toggle"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? "×" : "☰"}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="app-mobile-nav" aria-label="Mobile navigation">
          {visibleLinks.map((link) => (
            <NavLinkItem
              key={link.href}
              href={link.href}
              label={link.label}
              badge={
                "showBadge" in link && link.showBadge ? cartCount : undefined
              }
              isActive={isActive(link.href)}
              onNavigate={closeMobile}
            />
          ))}
        </nav>
      )}
    </header>
  );
}
