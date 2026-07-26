"use client";

import { useState, useEffect } from "react";
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
import { Bar, Line, Pie } from "react-chartjs-2";

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

// ── Types ──

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: any;
  borderColor?: any;
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface Chart {
  type: "bar" | "line" | "pie";
  data: ChartData;
}

export interface AiWidgetData {
  summary: string;
  display: "table" | "chart" | "kpi";
  table: Record<string, any>[];
  chart: Chart | null;
}

// ── Constants ──

const CHART_BG_COLORS = [
  "rgba(20, 184, 166, 0.7)",
  "rgba(59, 130, 246, 0.7)",
  "rgba(245, 158, 11, 0.7)",
  "rgba(239, 68, 68, 0.7)",
  "rgba(139, 92, 246, 0.7)",
  "rgba(236, 72, 153, 0.7)",
  "rgba(6, 182, 212, 0.7)",
  "rgba(132, 204, 22, 0.7)",
];

const CHART_BORDER_COLORS = [
  "#14b8a6",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

function getCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

// ── Heuristics: tự động quyết định widget to hay nhỏ dựa vào data ──

function isSmallWidget(_widget: AiWidgetData): boolean {
  return false;
}

// ── Sub-components ──

function KpiCard({ summary }: { summary: string }) {
  return (
    <div className="card metric-card" style={{ height: "100%" }}>
      <div className="metric-label">KPI</div>
      <div>
        <p className="metric-value" style={{ fontSize: 24 }}>{summary}</p>
      </div>
    </div>
  );
}

function TableWidget({ table }: { table: Record<string, any>[] }) {
  if (!table || table.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 32 }}>
        <span className="muted">No data available</span>
      </div>
    );
  }

  const columns = [...new Set(table.flatMap(row => Object.keys(row)))];

  return (
    <div className="card table-card">
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>
                  {col
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col}>
                    {typeof row[col] === "number"
                      ? Number(row[col]).toLocaleString(undefined, {
                          minimumFractionDigits:
                            col.toLowerCase().includes("price") ||
                            col.toLowerCase().includes("amount") ||
                            col.toLowerCase().includes("revenue")
                              ? 2
                              : 0,
                          maximumFractionDigits:
                            col.toLowerCase().includes("price") ||
                            col.toLowerCase().includes("amount") ||
                            col.toLowerCase().includes("revenue")
                              ? 2
                              : 0,
                        })
                      : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChartWidget({ chart, isSmall }: { chart: Chart; isSmall: boolean }) {
  const [, setTick] = useState(0);

  // Listen for theme changes to re-render chart
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTick((t) => t + 1);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  if (!chart || !chart.data || !chart.data.labels) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 32 }}>
        <span className="muted">No chart data available</span>
      </div>
    );
  }

  const { labels, datasets } = chart.data;

  // Get theme-aware colors at render time
  const chartTextColor = getCssVar("--chart-text", "#94A3B8");
  const chartGridColor = getCssVar("--chart-grid", "rgba(148, 163, 184, 0.12)");
  const tooltipBg = getCssVar("--chart-tooltip-bg", "#1E293B");
  const tooltipBorder = getCssVar("--chart-tooltip-border", "rgba(148, 163, 184, 0.18)");
  const tooltipTitleColor = getCssVar("--chart-tooltip-title", "#F1F5F9");
  const tooltipBodyColor = getCssVar("--chart-tooltip-body", "#CBD5E1");

  // Build Chart.js compatible datasets
  const chartJsDatasets = datasets.map((ds, i) => ({
    label: ds.label,
    data: ds.data,
    backgroundColor:
      ds.backgroundColor || CHART_BG_COLORS[i % CHART_BG_COLORS.length],
    borderColor:
      ds.borderColor || CHART_BORDER_COLORS[i % CHART_BORDER_COLORS.length],
    borderWidth: ds.borderWidth || (chart.type === "pie" ? 1 : 1),
    fill: ds.fill ?? (chart.type === "line" ? false : undefined),
    tension: ds.tension ?? 0.1,
  }));

  const chartData = { labels, datasets: chartJsDatasets };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: !isSmall,
        labels: {
          color: chartTextColor,
          boxWidth: isSmall ? 8 : 12,
          font: {
            size: isSmall ? 10 : 12,
          },
        },
      },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        titleColor: tooltipTitleColor,
        bodyColor: tooltipBodyColor,
      },
    },
    scales:
      chart.type !== "pie"
        ? {
            x: {
              ticks: { color: chartTextColor, font: { size: isSmall ? 9 : 11 } },
              grid: { color: chartGridColor },
            },
            y: {
              ticks: { color: chartTextColor, font: { size: isSmall ? 9 : 11 } },
              grid: { color: chartGridColor },
            },
          }
        : undefined,
  };

  const renderChart = () => {
    switch (chart.type) {
      case "bar":
        return <Bar data={chartData} options={chartOptions as any} />;
      case "line":
        return <Line data={chartData} options={chartOptions as any} />;
      case "pie":
        return <Pie data={chartData} options={chartOptions as any} />;
      default:
        return <p className="muted">Unsupported chart type</p>;
    }
  };

  return (
    <div className="card" style={{ height: "100%", overflow: "hidden", position: "relative" }}>
      <div className="table-card-header" style={{ padding: "0 0 12px" }}>
        <h2
          style={{
            fontSize: isSmall ? 13 : 18,
            fontWeight: 700,
            textTransform: "capitalize",
            margin: 0,
          }}
        >
          {chart.type} Chart
        </h2>
      </div>
      <div style={{ height: isSmall ? 200 : 360, position: "relative" }}>
        {renderChart()}
      </div>
    </div>
  );
}

// ── Main Component ──

export default function AiDashboardWidget({
  widget,
}: {
  widget: AiWidgetData;
}) {
  // Use theme-aware text color
  const summaryColor = getCssVar("--text-secondary", "#94A3B8");
  const small = isSmallWidget(widget);

  // Small widget: render 2 per row, no separate summary card
  if (small) {
    if (widget.display === "chart" && widget.chart) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "calc(50% - 6px)",
            boxSizing: "border-box",
          }}
        >
          <ChartWidget chart={widget.chart} isSmall={true} />
        </div>
      );
    }

    if (widget.display === "table") {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "calc(50% - 6px)",
            boxSizing: "border-box",
          }}
        >
          <TableWidget table={widget.table} />
        </div>
      );
    }

    if (widget.display === "kpi") {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "calc(50% - 6px)",
            boxSizing: "border-box",
          }}
        >
          <KpiCard summary={widget.summary} />
        </div>
      );
    }
  }

  // Large widget: full width with summary card
  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      <div
        className="card"
        style={{ marginBottom: 20, marginTop: 20, padding: "12px 20px" }}
      >
        <p style={{ color: summaryColor, fontSize: 14, margin: 0 }}>
          {widget.summary}
        </p>
      </div>

      {widget.display === "kpi" && <KpiCard summary={widget.summary} />}
      {widget.display === "table" && <TableWidget table={widget.table} />}
      {widget.display === "chart" && widget.chart && (
        <ChartWidget chart={widget.chart} isSmall={false} />
      )}
    </div>
  );
}