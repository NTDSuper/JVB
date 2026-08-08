import React from "react";
import type { LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  /** Action node shown on the right (e.g. View All button, SortDropdown) */
  action?: React.ReactNode;
  /** Accent color for the icon box + accent line */
  accent?: "primary" | "deal";
}

export default function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  accent = "primary",
}: SectionHeaderProps) {
  const isDeal = accent === "deal";

  return (
    <div className="mb-5 sm:mb-6 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {/* Accent line + icon */}
        <div className="flex items-center gap-2.5">
          <span
            className={`h-7 w-1.5 rounded-full bg-gradient-to-b ${isDeal ? "from-[#F97316] to-[#EA580C]" : "from-[var(--primary)] to-[var(--primary-light)]"}`}
            aria-hidden="true"
          />
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDeal ? "bg-[rgba(234,88,12,0.1)] text-[var(--accent)]" : "bg-[rgba(var(--primary-rgb),0.1)] text-[var(--primary)]"}`}
          >
            <Icon size={20} strokeWidth={1.8} />
          </span>
        </div>
        <div>
          <h2
            className="text-xl sm:text-2xl font-extrabold leading-tight text-[var(--text-primary)] tracking-tight"
            style={{ fontFamily: "'Baloo 2', sans-serif" }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}