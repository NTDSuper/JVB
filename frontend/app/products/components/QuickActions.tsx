"use client";

import { Zap, Gift, Truck, ShieldCheck, RotateCcw, Headphones, CreditCard, BadgePercent } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface QuickAction {
  label: string;
  icon: LucideIcon;
  /** Subtle single-hue accent — muted so it doesn't fight with deal-orange */
  iconColor: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Flash Sale", icon: Zap, iconColor: "text-[#EA580C]" },
  { label: "Vouchers", icon: Gift, iconColor: "text-[#D97706]" },
  { label: "Free Ship", icon: Truck, iconColor: "text-[#0284C7]" },
  { label: "Authentic", icon: ShieldCheck, iconColor: "text-[#16A34A]" },
  { label: "Return", icon: RotateCcw, iconColor: "text-[#7C3AED]" },
  { label: "Support", icon: Headphones, iconColor: "text-[#DB2777]" },
  { label: "Pay Later", icon: CreditCard, iconColor: "text-[#0284C7]" },
  { label: "Rewards", icon: BadgePercent, iconColor: "text-[#EA580C]" },
];

export default function QuickActions() {
  return (
    <section aria-label="Quick actions" className="grid grid-cols-2 min-[420px]:grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.label}
          className="group flex flex-col items-center gap-2.5 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] px-3 py-4 shadow-[var(--shadow-xs)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)] hover:border-[rgba(var(--primary-rgb),0.2)]"
        >
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--bg-input)] ${action.iconColor} transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-[var(--bg-hover)]`}
          >
            <action.icon size={20} strokeWidth={1.8} />
          </span>
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
            {action.label}
          </span>
        </button>
      ))}
    </section>
  );
}