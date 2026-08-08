import {
  Package,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Tag,
} from "lucide-react";

export interface ProductStats {
  totalProducts: number;
  totalStock: number;
  totalActive: number;
  totalLowStock: number;
  totalValue: number;
  avgPrice: number;
}

interface ProductStatsProps {
  stats: ProductStats;
  isLoading: boolean;
}

export default function ProductStats({ stats, isLoading }: ProductStatsProps) {
  const statItems = [
    {
      label: "Total Products",
      value: isLoading ? "..." : stats.totalProducts,
      subtext: "Items in catalog",
      icon: <Package size={22} />,
      color: "text-[var(--primary)]",
      bg: "bg-[var(--success-bg)]",
    },
    {
      label: "Total Stock",
      value: isLoading ? "..." : stats.totalStock,
      subtext: "Units across all products",
      icon: <Boxes size={22} />,
      color: "text-[var(--info)]",
      bg: "bg-[var(--info-bg)]",
    },
    {
      label: "Active Products",
      value: isLoading ? "..." : stats.totalActive,
      subtext: "Visible to shoppers",
      icon: <CheckCircle2 size={22} />,
      color: "text-[var(--success)]",
      bg: "bg-[var(--success-bg)]",
    },
    {
      label: "Low Stock",
      value: isLoading ? "..." : stats.totalLowStock,
      subtext: "10 units or fewer",
      icon: <AlertTriangle size={22} />,
      color: "text-[var(--warning)]",
      bg: "bg-[var(--warning-bg)]",
    },
    {
      label: "Inventory Value",
      value: isLoading ? "..." : `$${stats.totalValue.toLocaleString()}`,
      subtext: "At cost price",
      icon: <DollarSign size={22} />,
      color: "text-[var(--accent)]",
      bg: "bg-[var(--accent-lighter)]/30",
    },
    {
      label: "Avg Price",
      value: isLoading ? "..." : `$${stats.avgPrice.toFixed(2)}`,
      subtext: "Selling price",
      icon: <Tag size={22} />,
      color: "text-[var(--text-secondary)]",
      bg: "bg-[var(--bg-tag)]",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {statItems.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)]"
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {stat.label}
              </div>
              <div className="truncate text-xl font-extrabold text-[var(--text-primary)]" style={{ fontFamily: "'Baloo 2', sans-serif", lineHeight: 1.2 }}>
                {stat.value}
              </div>
              <div className="truncate text-[11px] text-[var(--text-muted)]">
                {stat.subtext}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}