"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { useAuthContext } from "@/auth/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { getToken } from "@/lib/auth";
import api from "@/lib/api";
import { Cart } from "@/types/dto";

const HIDDEN_ROUTES = ["/login", "/register"];

// Navigation links per role (Guest = no links shown besides branding)
const NAV_LINKS = [
  { href: "/products", label: "Products", roles: ["user", "guest"] },
  { href: "/cart", label: "Cart", showBadge: true, roles: ["user"] },
  { href: "/orders", label: "Orders", roles: ["user"] },
  { href: "/dashboard", label: "Dashboard", roles: ["manager", "admin"] },
  { href: "/ai-dashboard", label: "AI Dashboard", roles: ["manager"] },
  { href: "/orders/manage", label: "Order Management", roles: ["admin", "manager"] },
  { href: "/admin", label: "Admin", roles: ["admin"] },
  { href: "/profile", label: "Profile", roles: ["user", "manager", "admin"] },
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
  const { theme, toggleTheme } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const hasSession = isMounted && (isAuthenticated || Boolean(getToken()));
  const sessionUser = user ?? (hasSession ? readCachedUser() : null);

  const roles = useMemo(() => {
    if (!sessionUser?.role) return [];
    return Array.isArray(sessionUser.role) ? sessionUser.role : [sessionUser.role];
  }, [sessionUser?.role]);

  const isNormalUser = roles.includes("user");
  const isGuest = !hasSession;

  const { data: cart } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const res = await api.get<Cart>("/cart");
      return res.data;
    },
    enabled: hasSession && isNormalUser,
    staleTime: 1000 * 30,
  });

  // Guest sees only "Products" link; authenticated users see links matching their roles
  const visibleLinks = useMemo(
    () =>
      NAV_LINKS.filter((link) => {
        if (isGuest) {
          // Guest: only show Products
          return link.href === "/products";
        }
        // Authenticated users filter by their roles
        if (!("roles" in link)) return true;
        return link.roles.some((role) => roles.includes(role));
      }),
    [roles, isGuest]
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
          {/* Theme Toggle */}
          <button
            suppressHydrationWarning
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            title={theme === "light" ? "Dark Mode" : "Light Mode"}
          >
            {theme === "light" ? "\u263E" : "\u2600"}
          </button>

          {!hasSession && (
            <Link href="/login" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
              Login
            </Link>
          )}
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
            {mobileOpen ? "\u00d7" : "\u2630"}
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