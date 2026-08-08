"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { useAuthContext } from "@/auth/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { getToken } from "@/lib/auth";
import api from "@/lib/api";
import { Cart } from "@/types/dto";
import { AccountDropdown, AccountDropdownSkeleton, GuestMenu } from "./UserMenu";
import { buildUserMenu } from "./menuConfig";
import { getInitials, getDisplayName } from "./helpers";

const HIDDEN_ROUTES = ["/login", "/register"];

/* ── Admin/Manager center nav links ── */
const ADMIN_NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/orders/manage", label: "Order Management" },
  { href: "/products/manager", label: "Product Management" },
] as const;

const ADMIN_ONLY_LINK = { href: "/admin", label: "Admin" } as const;
const MANAGER_ONLY_LINK = { href: "/ai-dashboard", label: "AI Dashboard" } as const;

/* ── Sub-components ── */

function NavLink({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`
        relative inline-flex items-center gap-1.5 whitespace-nowrap
        px-4 py-2 rounded-lg
        text-sm font-medium
        transition-colors duration-200 ease-out
        ${
          isActive
            ? 'bg-emerald-100 text-emerald-700 font-semibold border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/40'
            : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50 border border-transparent dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/10'
        }
      `}
    >
      {label}
    </Link>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      suppressHydrationWarning
      type="button"
      className="tb-icon-btn"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      title={theme === "light" ? "Dark Mode" : "Light Mode"}
    >
      {theme === "light" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </button>
  );
}

function CartIcon({ count }: { count: number }) {
  return (
    <Link href="/cart" className="tb-icon-btn tb-cart-btn" aria-label={`Cart with ${count} items`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      {count > 0 && (
        <span className="tb-cart-badge">{count > 99 ? "99+" : count}</span>
      )}
    </Link>
  );
}

/* ── Mobile Drawer ── */

function MobileDrawer({
  open,
  onClose,
  hasSession,
  displayName,
  initials,
  onLogout,
  loggingOut,
}: {
  open: boolean;
  onClose: () => void;
  hasSession: boolean;
  displayName: string;
  initials: string;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        className={`tb-drawer-backdrop${open ? " tb-drawer-backdrop--open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`tb-drawer${open ? " tb-drawer--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="tb-drawer-header">
          <Link href="/products" className="tb-drawer-brand" onClick={onClose}>
            SuperMart
          </Link>
          <button
            type="button"
            className="tb-icon-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {hasSession && (
          <div className="tb-drawer-user">
            <span className="tb-avatar tb-avatar--lg">{initials}</span>
            <div>
              <div className="tb-drawer-user-name">{displayName}</div>
              <Link href="/profile" className="tb-drawer-user-link" onClick={onClose}>
                View profile
              </Link>
            </div>
          </div>
        )}

        {!hasSession && (
          <div className="tb-drawer-auth">
            <Link href="/login" className="tb-drawer-btn tb-drawer-btn--primary" onClick={onClose}>
              Login
            </Link>
            <Link href="/register" className="tb-drawer-btn tb-drawer-btn--ghost" onClick={onClose}>
              Register
            </Link>
          </div>
        )}

        {hasSession && (
          <div className="tb-drawer-footer">
            <button
              type="button"
              className="tb-drawer-btn tb-drawer-btn--ghost tb-drawer-btn--danger"
              onClick={() => {
                onClose();
                onLogout();
              }}
              disabled={loggingOut}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {loggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Main TopBar ── */

export default function TopBar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthContext();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const hasSession = mounted ? (isAuthenticated || Boolean(getToken())) : false;
  const sessionUser = user;

  // Sync permissions into permissionService once user/auth is ready
  if (sessionUser && !permissionsReady) {
    const roleNames = Array.isArray(sessionUser.role) ? sessionUser.role : sessionUser.role ? [sessionUser.role] : [];
    const perms = sessionUser.permissions || [];
    import("@/auth/services/permissionService").then(({ initPermissions }) => {
      initPermissions(perms, roleNames);
      setPermissionsReady(true);
    });
  }
  if (!sessionUser && !permissionsReady) {
    setPermissionsReady(true);
  }

  const roles = useMemo(() => {
    if (!sessionUser?.role) return [];
    return Array.isArray(sessionUser.role) ? sessionUser.role : [sessionUser.role];
  }, [sessionUser]);

  const isNormalUser = roles.includes("user");
  const isManagerOrAdmin = roles.some((r) => r === "manager" || r === "admin");

  const { data: cart } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const res = await api.get<Cart>("/cart");
      return res.data;
    },
    enabled: hasSession && isNormalUser,
    staleTime: 1000 * 30,
  });

  const menuItems = useMemo(() => {
    if (!permissionsReady) return [];
    const canManageOrders = (sessionUser?.permissions || []).includes("order:manage");
    const canManageProducts = (sessionUser?.permissions || []).some((p: string) =>
      ["product:create", "product:update", "product:delete"].includes(p)
    );
    return buildUserMenu(roles, canManageOrders, canManageProducts);
  }, [permissionsReady, roles, sessionUser]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  if (HIDDEN_ROUTES.includes(pathname)) {
    return null;
  }

  const cartCount = cart?.items?.length ?? 0;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setMobileOpen(false);
    }
  };

  const displayName = getDisplayName(sessionUser?.full_name, sessionUser?.email);
  const initials = getInitials(sessionUser?.full_name, sessionUser?.email);
  const email = sessionUser?.email || null;

  return (
    <>
      <header
        className={`tb-header${scrolled ? " tb-header--scrolled" : ""}`}
        role="banner"
      >
        <div className="tb-header-inner">
          <div className="tb-left">
            <Link href="/products" className="tb-logo" aria-label="SuperMart">
              <span className="tb-logo-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </span>
              <span className="tb-logo-text">SuperMart</span>
            </Link>
          </div>

          {/* ── Center: Admin/Manager nav links only ── */}
          {isManagerOrAdmin && (
            <nav className="tb-nav tb-nav-desktop" aria-label="Primary navigation">
              {ADMIN_NAV_LINKS.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  isActive={isActive(link.href)}
                />
              ))}
              {roles.includes("admin") && (
                <NavLink
                  href={ADMIN_ONLY_LINK.href}
                  label={ADMIN_ONLY_LINK.label}
                  isActive={isActive(ADMIN_ONLY_LINK.href)}
                />
              )}
              {roles.includes("manager") && (
                <NavLink
                  href={MANAGER_ONLY_LINK.href}
                  label={MANAGER_ONLY_LINK.label}
                  isActive={isActive(MANAGER_ONLY_LINK.href)}
                />
              )}
            </nav>
          )}

          <div className="tb-right">
            <ThemeToggle />

            {hasSession && isNormalUser && <CartIcon count={cartCount} />}

            {mounted && !hasSession && <GuestMenu />}

            {mounted && hasSession && (
              permissionsReady ? (
                <AccountDropdown
                  displayName={displayName}
                  email={email}
                  initials={initials}
                  menuItems={menuItems}
                  onLogout={handleLogout}
                  loggingOut={loggingOut}
                />
              ) : (
                <AccountDropdownSkeleton />
              )
            )}

            <button
              type="button"
              className="tb-hamburger"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span className={`tb-hamburger-line${mobileOpen ? " tb-hamburger-line--open" : ""}`} />
              <span className={`tb-hamburger-line${mobileOpen ? " tb-hamburger-line--open" : ""}`} />
              <span className={`tb-hamburger-line${mobileOpen ? " tb-hamburger-line--open" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <MobileDrawer
        open={mobileOpen}
        onClose={closeMobile}
        hasSession={hasSession}
        displayName={displayName}
        initials={initials}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />
    </>
  );
}