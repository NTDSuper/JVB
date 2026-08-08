"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  DollarSign, TrendingUp, TrendingDown, Package, Users, ShoppingCart,
  Calendar, Filter, Search, ArrowUpRight, ArrowDownRight, Layers,
  AlertTriangle, Clock, UserPlus, CreditCard, Activity,
} from "lucide-react";
import api from "@/lib/api";
import { withProtection } from "@/components/ProtectedRouter";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ── Types ───────────────────────────────────────────────────────────────

interface RevenueKPI {
  revenue: number;
  cost: number;
  net_revenue: number;
  total_bills: number;
  avg_bill: number;
  growth_pct: number;
  cost_pct: number;
  prev_revenue: number;
}

interface TrendPoint {
  date: string;
  revenue: number;
  count?: number;
}

interface RevenueTrend {
  current: TrendPoint[];
  previous: TrendPoint[];
  period: string;
}

interface BillPoint {
  date: string;
  bills: number;
  revenue: number;
}

interface ProductKPI {
  total_products: number;
  active_products: number;
  expired_products: number;
  low_stock: number;
}

interface CategoryCount {
  category: string;
  count: number;
}

interface LowStockProduct {
  id: number;
  sku: string;
  name: string;
  stock: number;
  status: string;
  price: number;
}

interface TopProduct {
  id: number;
  name: string;
  sku: string;
  total_quantity: number;
  total_revenue: number;
}

interface CustomerKPI {
  total_users: number;
  active_users: number;
  new_customers: number;
  new_growth: number;
  active_buyers: number;
  avg_bills_per_customer: number;
}

interface CustomerItem {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string | null;
  orders_count: number;
  total_spent: number;
}

interface CustomerListResponse {
  total: number;
  items: CustomerItem[];
}

interface TopSpender {
  id: number;
  username: string;
  email: string;
  total_spent: number;
  orders_count: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function getToday(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function get30DaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

// ── Chart.js shared options factory ─────────────────────────────────────

function getChartColors() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark" ||
    document.documentElement.classList.contains("dark");
  return {
    grid: isDark ? "rgba(148, 163, 184, 0.08)" : "rgba(148, 163, 184, 0.12)",
    text: isDark ? "#64748B" : "#94A3B8",
    tooltipBg: isDark ? "#131C31" : "#FFFFFF",
    tooltipTitle: isDark ? "#F1F5F9" : "#0F172A",
    tooltipBody: isDark ? "#CBD5E1" : "#475569",
    tooltipBorder: isDark ? "rgba(148, 163, 184, 0.15)" : "#E2E8F0",
  };
}

function createChartOptions() {
  const c = getChartColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: c.text,
          font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: c.tooltipBg,
        titleColor: c.tooltipTitle,
        bodyColor: c.tooltipBody,
        borderColor: c.tooltipBorder,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: c.grid },
        ticks: { color: c.text, font: { size: 10 } },
      },
      y: {
        grid: { color: c.grid },
        ticks: { color: c.text, font: { size: 10 } },
      },
    },
  };
}

// ── Tab Config ──────────────────────────────────────────────────────────

type TabId = "revenue" | "products" | "customers";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "revenue", label: "Revenue", icon: <DollarSign size={16} /> },
  { id: "products", label: "Products", icon: <Package size={16} /> },
  { id: "customers", label: "Customers", icon: <Users size={16} /> },
];

// ── KPI Card Component ──────────────────────────────────────────────────

function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  color: string;
}) {
  const isPositive = trend !== undefined && trend >= 0;
  return (
    <div className="rounded-2xl bg-[var(--bg-card)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.5)]">
      <div className="flex items-start justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-bold ${isPositive ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{title}</p>
      <p className="text-2xl font-bold text-[var(--text-primary)] mt-1" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
        {value}
      </p>
      {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>}
      {trendLabel && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{trendLabel}</p>}
    </div>
  );
}

// ── Chart Card Component ────────────────────────────────────────────────

function ChartCard({
  title,
  icon,
  children,
  loading,
  empty,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[var(--bg-card)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2.5 mb-4">
        {icon && <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-hover)] text-[var(--primary)]">{icon}</div>}
        <h3 className="text-sm font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>{title}</h3>
      </div>
      {loading ? (
        <div className="skeleton" style={{ height: 250 }} />
      ) : empty ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-3xl mb-2 opacity-30">📊</div>
          <p className="text-sm text-[var(--text-muted)]">No data available</p>
        </div>
      ) : (
        <div style={{ height: 280 }}>{children}</div>
      )}
    </div>
  );
}

// ── Table Card Component ────────────────────────────────────────────────

function TableCard({
  title,
  icon,
  headers,
  children,
  loading,
  empty,
  emptyMessage,
}: {
  title: string;
  icon?: React.ReactNode;
  headers: string[];
  children: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--bg-card)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] overflow-hidden transition-all duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.5)]">
      <div className="p-6 pb-0">
        <div className="flex items-center gap-2.5 mb-4">
          {icon && <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-hover)] text-[var(--primary)]">{icon}</div>}
          <h3 className="text-sm font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>{title}</h3>
        </div>
      </div>
      {loading ? (
        <div className="p-6 space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 40 }} />)}
        </div>
      ) : empty ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-[var(--text-muted)]">{emptyMessage || "No data"}</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Filter Bar Component ────────────────────────────────────────────────

function FilterBar({
  period,
  onPeriodChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: {
  period: string;
  onPeriodChange: (p: string) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (d: string) => void;
  onEndDateChange: (d: string) => void;
}) {
  return (
    <div className="rounded-2xl bg-[var(--bg-card)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] mb-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#A5B4FC]">
            <Filter size={14} />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Filters</span>
        </div>

        <div className="flex items-center gap-2">
          {["day", "month", "year"].map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p
                  ? "bg-[var(--primary)] text-white shadow-[var(--shadow-primary)]"
                  : "bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[var(--text-muted)]" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
          />
          <span className="text-xs text-[var(--text-muted)]">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// REVENUE TAB
// ═══════════════════════════════════════════════════════════════════════════

function RevenueTab({ period, startDate, endDate }: { period: string; startDate: string; endDate: string }) {
  const params = `period=${period}&start_date=${startDate}&end_date=${endDate}`;

  const { data: kpi, isLoading: kpiLoading } = useQuery<RevenueKPI>({
    queryKey: ["analytics-revenue-kpi", period, startDate, endDate],
    queryFn: async () => {
      const res = await api.get<RevenueKPI>(`/analytics/revenue/kpi?${params}`);
      return res.data;
    },
    staleTime: 1000 * 60,
  });

  const { data: trend, isLoading: trendLoading } = useQuery<RevenueTrend>({
    queryKey: ["analytics-revenue-trend", period, startDate, endDate],
    queryFn: async () => {
      const res = await api.get<RevenueTrend>(`/analytics/revenue/trend?${params}`);
      return res.data;
    },
    staleTime: 1000 * 60,
  });

  const { data: bills, isLoading: billsLoading } = useQuery<BillPoint[]>({
    queryKey: ["analytics-revenue-bills", period, startDate, endDate],
    queryFn: async () => {
      const res = await api.get<BillPoint[]>(`/analytics/revenue/bills?${params}`);
      return res.data;
    },
    staleTime: 1000 * 60,
  });

  // Chart.js data
  const lineData = {
    labels: trend?.current?.map(d => d.date.slice(5)) ?? [],
    datasets: [{
      label: "Revenue",
      data: trend?.current?.map(d => d.revenue) ?? [],
      borderColor: "#059669",
      backgroundColor: "rgba(5, 150, 105, 0.1)",
      fill: true,
      tension: 0.4,
      pointRadius: 3,
    }],
  };

  const comparisonData = {
    labels: trend?.current?.map(d => d.date.slice(5)) ?? [],
    datasets: [
      {
        label: "Current",
        data: trend?.current?.map(d => d.revenue) ?? [],
        backgroundColor: "rgba(5, 150, 105, 0.8)",
        borderRadius: 4,
      },
      {
        label: "Previous",
        data: trend?.current?.map((_d, i) => trend?.previous?.[i]?.revenue ?? 0) ?? [],
        backgroundColor: "rgba(234, 88, 12, 0.8)",
        borderRadius: 4,
      },
    ],
  };

  const billsData = {
    labels: bills?.map(d => d.date.slice(5)) ?? [],
    datasets: [{
      label: "Bills",
      data: bills?.map(d => d.bills) ?? [],
      backgroundColor: "rgba(5, 150, 105, 0.8)",
      borderRadius: 4,
    }],
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Revenue (Gross)" value={kpiLoading ? "..." : formatCurrency(kpi?.revenue ?? 0)} icon={<DollarSign size={18} />} trend={kpi?.growth_pct} trendLabel="vs previous period" color="bg-[#EAF7EE] text-[#1F9D55] dark:bg-[#1A2E22] dark:text-[#34D399]" />
        <KPICard title="Cost" value={kpiLoading ? "..." : formatCurrency(kpi?.cost ?? 0)} icon={<TrendingDown size={18} />} trend={kpi?.cost_pct} trendLabel="of revenue" color="bg-[#FEE2E2] text-[#DC2626] dark:bg-[#2A1010] dark:text-[#FB7185]" />
        <KPICard title="Net Revenue" value={kpiLoading ? "..." : formatCurrency(kpi?.net_revenue ?? 0)} icon={<Activity size={18} />} color="bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#A5B4FC]" />
        <KPICard title="Total Bills" value={kpiLoading ? "..." : formatNumber(kpi?.total_bills ?? 0)} icon={<ShoppingCart size={18} />} color="bg-[#FFF4EC] text-[#E14E17] dark:bg-[#2A1A10] dark:text-[#FB923C]" />
        <KPICard title="Average Bill" value={kpiLoading ? "..." : formatCurrency(kpi?.avg_bill ?? 0)} icon={<CreditCard size={18} />} color="bg-[#F3E8FF] text-[#9333EA] dark:bg-[#1E0A3A] dark:text-[#C084FC]" />
        <KPICard title="Growth / Month" value={kpiLoading ? "..." : `${kpi?.growth_pct?.toFixed(1) ?? 0}%`} icon={<TrendingUp size={18} />} trend={kpi?.growth_pct} color="bg-[#E0F2FE] text-[#0284C7] dark:bg-[#0A1E2E] dark:text-[#38BDF8]" />
        <KPICard title="Cost %" value={kpiLoading ? "..." : `${kpi?.cost_pct?.toFixed(1) ?? 0}%`} icon={<Layers size={18} />} color="bg-[#FEF3C7] text-[#D97706] dark:bg-[#2A1F0A] dark:text-[#FBBF24]" />
        <KPICard title="Prev Period Revenue" value={kpiLoading ? "..." : formatCurrency(kpi?.prev_revenue ?? 0)} icon={<Clock size={18} />} color="bg-[#F1F5F9] text-[#475569] dark:bg-[#1E293B] dark:text-[#94A3B8]" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue Trend" icon={<TrendingUp size={16} />} loading={trendLoading} empty={!trend?.current?.length}>
          <Line data={lineData} options={{ ...createChartOptions(), plugins: { ...createChartOptions().plugins, tooltip: { ...createChartOptions().plugins.tooltip, callbacks: { label: (ctx: any) => `${formatCurrency(ctx.parsed.y)}` } } }, scales: { ...createChartOptions().scales, y: { ...createChartOptions().scales.y, ticks: { ...createChartOptions().scales.y.ticks, callback: (v: any) => `$${(v / 1000).toFixed(0)}k` } } } }} />
        </ChartCard>
        <ChartCard title="Revenue vs Previous Period" icon={<Layers size={16} />} loading={trendLoading} empty={!trend?.current?.length}>
          <Bar data={comparisonData} options={{ ...createChartOptions(), plugins: { ...createChartOptions().plugins, tooltip: { ...createChartOptions().plugins.tooltip, callbacks: { label: (ctx: any) => `${formatCurrency(ctx.parsed.y)}` } } }, scales: { ...createChartOptions().scales, y: { ...createChartOptions().scales.y, ticks: { ...createChartOptions().scales.y.ticks, callback: (v: any) => `$${(v / 1000).toFixed(0)}k` } } } }} />
        </ChartCard>
      </div>

      {/* Bills Chart */}
      <ChartCard title="Total Bills by Day" icon={<ShoppingCart size={16} />} loading={billsLoading} empty={!bills?.length}>
        <Bar data={billsData} options={createChartOptions()} />
      </ChartCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTS TAB
// ═══════════════════════════════════════════════════════════════════════════

function ProductsTab() {
  const { data: kpi, isLoading: kpiLoading } = useQuery<ProductKPI>({
    queryKey: ["analytics-products-kpi"],
    queryFn: async () => {
      const res = await api.get<ProductKPI>("/analytics/products/kpi");
      return res.data;
    },
    staleTime: 1000 * 60,
  });

  const { data: byCategory, isLoading: catLoading } = useQuery<CategoryCount[]>({
    queryKey: ["analytics-products-by-category"],
    queryFn: async () => {
      const res = await api.get<CategoryCount[]>("/analytics/products/by-category");
      return res.data;
    },
    staleTime: 1000 * 60,
  });

  const { data: lowStock, isLoading: lowStockLoading } = useQuery<LowStockProduct[]>({
    queryKey: ["analytics-products-low-stock"],
    queryFn: async () => {
      const res = await api.get<LowStockProduct[]>("/analytics/products/low-stock?limit=20");
      return res.data;
    },
    staleTime: 1000 * 60,
  });

  const { data: topByQty, isLoading: topQtyLoading } = useQuery<TopProduct[]>({
    queryKey: ["analytics-products-top-qty"],
    queryFn: async () => {
      const res = await api.get<TopProduct[]>("/analytics/products/top-selling?by=quantity&limit=5");
      return res.data;
    },
    staleTime: 1000 * 60,
  });

  const { data: topByRev, isLoading: topRevLoading } = useQuery<TopProduct[]>({
    queryKey: ["analytics-products-top-rev"],
    queryFn: async () => {
      const res = await api.get<TopProduct[]>("/analytics/products/top-selling?by=revenue&limit=5");
      return res.data;
    },
    staleTime: 1000 * 60,
  });

  const catChartData = {
    labels: byCategory?.map(c => c.category) ?? [],
    datasets: [{
      label: "Products",
      data: byCategory?.map(c => c.count) ?? [],
      backgroundColor: "rgba(5, 150, 105, 0.8)",
      borderRadius: 4,
    }],
  };

  const revChartData = {
    labels: topByRev?.map(p => p.name) ?? [],
    datasets: [{
      label: "Revenue",
      data: topByRev?.map(p => p.total_revenue) ?? [],
      backgroundColor: "rgba(234, 88, 12, 0.8)",
      borderRadius: 4,
    }],
  };

  const hOptions = { ...createChartOptions(), indexAxis: "y" as const };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Products" value={kpiLoading ? "..." : formatNumber(kpi?.total_products ?? 0)} icon={<Package size={18} />} color="bg-[#EAF7EE] text-[#1F9D55] dark:bg-[#1A2E22] dark:text-[#34D399]" />
        <KPICard title="Active Products" value={kpiLoading ? "..." : formatNumber(kpi?.active_products ?? 0)} icon={<Activity size={18} />} color="bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#A5B4FC]" />
        <KPICard title="Expired Products" value={kpiLoading ? "..." : formatNumber(kpi?.expired_products ?? 0)} icon={<AlertTriangle size={18} />} color="bg-[#FEE2E2] text-[#DC2626] dark:bg-[#2A1010] dark:text-[#FB7185]" />
        <KPICard title="Low Stock" value={kpiLoading ? "..." : formatNumber(kpi?.low_stock ?? 0)} icon={<Clock size={18} />} color="bg-[#FEF3C7] text-[#D97706] dark:bg-[#2A1F0A] dark:text-[#FBBF24]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Products by Category" icon={<Layers size={16} />} loading={catLoading} empty={!byCategory?.length}>
          <Bar data={catChartData} options={hOptions} />
        </ChartCard>
        <ChartCard title="Top 5 Best Selling (Revenue)" icon={<TrendingUp size={16} />} loading={topRevLoading} empty={!topByRev?.length}>
          <Bar data={revChartData} options={{ ...hOptions, plugins: { ...hOptions.plugins, tooltip: { ...hOptions.plugins.tooltip, callbacks: { label: (ctx: any) => `${formatCurrency(ctx.parsed.x)}` } } }, scales: { ...hOptions.scales, x: { ...hOptions.scales.x, ticks: { ...hOptions.scales.x.ticks, callback: (v: any) => `$${(v / 1000).toFixed(0)}k` } } } }} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TableCard title="Low Stock Products" icon={<AlertTriangle size={16} />} headers={["Name", "SKU", "Stock", "Status", "Price"]} loading={lowStockLoading} empty={!lowStock?.length} emptyMessage="No low stock products">
          {lowStock?.map((p) => (
            <tr key={p.id} className="border-t border-[var(--border)] transition hover:bg-[var(--bg-hover)]">
              <td className="px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">{p.name}</td>
              <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{p.sku}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#FEE2E2] text-[#DC2626] dark:bg-[#2A1010] dark:text-[#FB7185]">{p.stock}</span>
              </td>
              <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{p.status}</td>
              <td className="px-4 py-3 text-sm font-bold text-[var(--accent)]">${p.price.toFixed(2)}</td>
            </tr>
          ))}
        </TableCard>

        <TableCard title="Top 5 Best Selling (Quantity)" icon={<TrendingUp size={16} />} headers={["Product", "SKU", "Sold", "Revenue"]} loading={topQtyLoading} empty={!topByQty?.length} emptyMessage="No sales data">
          {topByQty?.map((p, i) => (
            <tr key={p.id} className="border-t border-[var(--border)] transition hover:bg-[var(--bg-hover)]">
              <td className="px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">
                <span className="inline-flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  {p.name}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{p.sku}</td>
              <td className="px-4 py-3 text-sm font-bold text-[var(--text-primary)]">{formatNumber(p.total_quantity)}</td>
              <td className="px-4 py-3 text-sm font-bold text-[var(--accent)]">{formatCurrency(p.total_revenue)}</td>
            </tr>
          ))}
        </TableCard>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMERS TAB
// ═══════════════════════════════════════════════════════════════════════════

function CustomersTab({ period, startDate, endDate }: { period: string; startDate: string; endDate: string }) {
  const params = `period=${period}&start_date=${startDate}&end_date=${endDate}`;
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("total_spent");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const { data: kpi, isLoading: kpiLoading } = useQuery<CustomerKPI>({
    queryKey: ["analytics-customers-kpi", period, startDate, endDate],
    queryFn: async () => {
      const res = await api.get<CustomerKPI>(`/analytics/customers/kpi?${params}`);
      return res.data;
    },
    staleTime: 1000 * 60,
  });

  // Debug: log KPI data to verify correctness
  console.log("[Dashboard] Customer KPI:", kpi);

  const { data: customerList, isLoading: listLoading } = useQuery<CustomerListResponse>({
    queryKey: ["analytics-customers-list", search, sortBy, sortOrder, page],
    queryFn: async () => {
      const res = await api.get<CustomerListResponse>(
        `/analytics/customers/list?search=${search}&sort_by=${sortBy}&sort_order=${sortOrder}&skip=${page * pageSize}&limit=${pageSize}`
      );
      return res.data;
    },
    staleTime: 1000 * 30,
  });

  const { data: topSpenders, isLoading: spendersLoading } = useQuery<TopSpender[]>({
    queryKey: ["analytics-customers-top-spenders"],
    queryFn: async () => {
      const res = await api.get<TopSpender[]>("/analytics/customers/top-spenders?limit=10");
      return res.data;
    },
    staleTime: 1000 * 60,
  });

  const spenderData = {
    labels: topSpenders?.map(s => s.username) ?? [],
    datasets: [{
      label: "Total Spent",
      data: topSpenders?.map(s => s.total_spent) ?? [],
      backgroundColor: "rgba(5, 150, 105, 0.8)",
      borderRadius: 4,
    }],
  };

  const hOptions = { ...createChartOptions(), indexAxis: "y" as const };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Users" value={kpiLoading ? "..." : formatNumber(kpi?.total_users ?? 0)} icon={<Users size={18} />} color="bg-[#EAF7EE] text-[#1F9D55] dark:bg-[#1A2E22] dark:text-[#34D399]" />
        <KPICard title="Active Users" value={kpiLoading ? "..." : formatNumber(kpi?.active_users ?? 0)} icon={<Activity size={18} />} color="bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#A5B4FC]" />
        <KPICard title="New Customers" value={kpiLoading ? "..." : formatNumber(kpi?.new_customers ?? 0)} icon={<UserPlus size={18} />} trend={kpi?.new_growth} trendLabel="vs previous period" color="bg-[#F3E8FF] text-[#9333EA] dark:bg-[#1E0A3A] dark:text-[#C084FC]" />
        <KPICard title="Avg Bills / Customer" value={kpiLoading ? "..." : formatNumber(kpi?.avg_bills_per_customer ?? 0)} icon={<CreditCard size={18} />} color="bg-[#FFF4EC] text-[#E14E17] dark:bg-[#2A1A10] dark:text-[#FB923C]" />
      </div>

      <ChartCard title="Top Customers by Spending" icon={<TrendingUp size={16} />} loading={spendersLoading} empty={!topSpenders?.length}>
        <Bar data={spenderData} options={{ ...hOptions, plugins: { ...hOptions.plugins, tooltip: { ...hOptions.plugins.tooltip, callbacks: { label: (ctx: any) => `${formatCurrency(ctx.parsed.x)}` } } }, scales: { ...hOptions.scales, x: { ...hOptions.scales.x, ticks: { ...hOptions.scales.x.ticks, callback: (v: any) => `$${(v / 1000).toFixed(0)}k` } } } }} />
      </ChartCard>

      {/* Customer Table */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none"
            >
              <option value="total_spent">Total Spent</option>
              <option value="orders_count">Orders</option>
              <option value="name">Name</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              className="px-2 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            >
              {sortOrder === "desc" ? "↓" : "↑"}
            </button>
          </div>
        </div>

        <TableCard title="Customer List" icon={<Users size={16} />} headers={["User", "Email", "Orders", "Total Spent", "Status"]} loading={listLoading} empty={!customerList?.items?.length} emptyMessage="No customers found">
          {customerList?.items?.map((c) => (
            <tr key={c.id} className="border-t border-[var(--border)] transition hover:bg-[var(--bg-hover)]">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white text-xs font-bold flex items-center justify-center">
                    {(c.username?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{c.full_name || c.username}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">ID: {c.id}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{c.email}</td>
              <td className="px-4 py-3 text-sm font-bold text-[var(--text-primary)]">{c.orders_count}</td>
              <td className="px-4 py-3 text-sm font-bold text-[var(--accent)]">{formatCurrency(c.total_spent)}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${c.is_active ? "bg-[#EAF7EE] text-[#1F9D55] dark:bg-[#1A2E22] dark:text-[#34D399]" : "bg-[#FEE2E2] text-[#DC2626] dark:bg-[#2A1010] dark:text-[#FB7185]"}`}>
                  {c.is_active ? "Active" : "Inactive"}
                </span>
              </td>
            </tr>
          ))}
        </TableCard>

        {customerList && customerList.total > pageSize && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-40">Previous</button>
            <span className="text-xs text-[var(--text-muted)]">Page {page + 1} of {Math.ceil(customerList.total / pageSize)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= customerList.total} className="px-3 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════════════

function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>("revenue");
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState(get30DaysAgo());
  const [endDate, setEndDate] = useState(getToday());

  const handlePeriodChange = useCallback((p: string) => {
    setPeriod(p);
    const now = new Date();
    let start = new Date();
    if (p === "day") start = now;
    else if (p === "month") start.setDate(now.getDate() - 30);
    else if (p === "year") start.setFullYear(now.getFullYear() - 1);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(now.toISOString().split("T")[0]);
  }, []);

  return (
    <div className="relative min-h-screen bg-[var(--bg-main)] px-4 py-8 sm:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-[#FF5A1F]/8 to-transparent blur-3xl transition-opacity duration-500 dark:from-[#FF5A1F]/15" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-gradient-to-tr from-[#6366F1]/8 to-transparent blur-3xl transition-opacity duration-500 dark:from-[#6366F1]/15" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Real-time analytics and insights for your business</p>
        </div>

        <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-[var(--bg-input)] w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {(activeTab === "revenue" || activeTab === "customers") && (
          <FilterBar period={period} onPeriodChange={handlePeriodChange} startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />
        )}

        {activeTab === "revenue" && <RevenueTab period={period} startDate={startDate} endDate={endDate} />}
        {activeTab === "products" && <ProductsTab />}
        {activeTab === "customers" && <CustomersTab period={period} startDate={startDate} endDate={endDate} />}
      </div>
    </div>
  );
}

export default withProtection(DashboardPage, ["admin", "manager"]);