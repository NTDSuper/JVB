"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";
import type { AccountDropdownProps, UserMenuItem } from "./types";

/* ── Icons (SVG) ── */

function IconClipboardList() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconPackage() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
}

function IconLogOut() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  );
}

function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

const ICONS: Record<string, React.FC> = {
  ClipboardList: IconClipboardList,
  User: IconUser,
  Package: IconPackage,
};

function getIcon(name: string): React.FC {
  return ICONS[name] || IconUser;
}

/* ── Skeleton ── */

function AccountSkeleton() {
  return (
    <div className="am-skeleton" aria-hidden="true">
      <div className="am-skeleton-line" />
      <div className="am-skeleton-line am-skeleton-line--short" />
    </div>
  );
}

/* ── Dropdown ── */

export function AccountDropdown({
  displayName,
  email,
  initials,
  menuItems,
  onLogout,
  loggingOut,
}: AccountDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  const close = useCallback(() => setOpen(false), []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, close]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  const handleLogout = () => {
    close();
    onLogout();
  };

  const handleItemClick = () => {
    // Close dropdown when selecting a nav item
    close();
  };

  // Group menu items
  const userGroup = menuItems.filter((item: UserMenuItem) => item.group === "user");
  const adminGroup = menuItems.filter((item: UserMenuItem) => item.group === "admin_manager");

  return (
    <div className="am-dropdown" ref={ref}>
      <button
        type="button"
        className="am-avatar-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        title={displayName}
      >
        <span className="am-avatar">{initials}</span>
        <svg
          className={`am-chevron${open ? " am-chevron--open" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="am-dropdown-menu" role="menu">
          {/* Header: full name + email/role */}
          <div className="am-dropdown-header">
            <span className="am-dropdown-name">{displayName}</span>
            {email && <span className="am-dropdown-email">{email}</span>}
          </div>

          <div className="am-dropdown-divider" />

          {/* User group */}
          {userGroup.length > 0 && (
            <>
              {userGroup.map((item: UserMenuItem) => {
                const IconComp = getIcon(item.icon);
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="am-dropdown-item"
                    role="menuitem"
                    onClick={handleItemClick}
                  >
                    <span className="am-dropdown-item-icon">
                      <IconComp />
                    </span>
                    {item.label}
                  </a>
                );
              })}
              {adminGroup.length > 0 && <div className="am-dropdown-divider" />}
            </>
          )}

          {/* Admin/Manager group */}
          {adminGroup.length > 0 && (
            <>
              {adminGroup.map((item: UserMenuItem) => {
                const IconComp = getIcon(item.icon);
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="am-dropdown-item"
                    role="menuitem"
                    onClick={handleItemClick}
                  >
                    <span className="am-dropdown-item-icon">
                      <IconComp />
                    </span>
                    {item.label}
                  </a>
                );
              })}
              <div className="am-dropdown-divider" />
            </>
          )}

          {/* Footer: Dark mode toggle + Logout */}
          {/* <button
            type="button"
            className="am-dropdown-item am-dropdown-item--toggle"
            onClick={() => toggleTheme()}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            <span className="am-dropdown-item-icon">
              {theme === "light" ? <IconMoon /> : <IconSun />}
            </span>
            <span>Dark mode</span>
            <span className="am-toggle-track">
              <span className={`am-toggle-thumb${theme === "dark" ? " am-toggle-thumb--on" : ""}`} />
            </span>
          </button> */}

          <button
            type="button"
            className="am-dropdown-item am-dropdown-item--danger"
            role="menuitem"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <span className="am-dropdown-item-icon">
              <IconLogOut />
            </span>
            {loggingOut ? "Logging Out..." : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}

export function AccountDropdownSkeleton() {
  return (
    <div className="am-dropdown" aria-hidden="true">
      <div className="am-avatar-btn am-avatar-btn--skeleton">
        <span className="am-avatar am-avatar--skeleton" />
      </div>
      <div className="am-dropdown-menu am-dropdown-menu--skeleton">
        <AccountSkeleton />
      </div>
    </div>
  );
}

/* ── Guest Menu (Login/Register) ── */

function IconLogIn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function IconUserPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

export function GuestMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, close]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  return (
    <div className="am-dropdown" ref={ref}>
      <button
        type="button"
        className="am-avatar-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        title="Account"
      >
        <span className="am-avatar am-avatar--guest">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
        <svg
          className={`am-chevron${open ? " am-chevron--open" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="am-dropdown-menu" role="menu">
          <div className="am-dropdown-header">
            <span className="am-dropdown-name">Welcome</span>
            <span className="am-dropdown-email">Sign in to continue</span>
          </div>
          <div className="am-dropdown-divider" />
          <a href="/login" className="am-dropdown-item" role="menuitem" onClick={close}>
            <span className="am-dropdown-item-icon">
              <IconLogIn />
            </span>
            Login
          </a>
          <a href="/register" className="am-dropdown-item" role="menuitem" onClick={close}>
            <span className="am-dropdown-item-icon">
              <IconUserPlus />
            </span>
            Register
          </a>
        </div>
      )}
    </div>
  );
}
