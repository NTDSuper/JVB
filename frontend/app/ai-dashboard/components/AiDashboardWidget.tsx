"use client";

import { useState, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  BarController,
  LineController,
  PieController,
  DoughnutController,
} from "chart.js";

// ── Register ALL required Chart.js components ───────────────────────────────
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  Title,
  Tooltip,
  Legend,
  Filler,
);

// ── Types ───────────────────────────────────────────────────────────────────

export interface ChartDataset {
  label: string;
  data: (number | null)[];
  type?: "bar" | "line";
  backgroundColor?: any;
  borderColor?: any;
  borderWidth?: number;
  borderRadius?: number;
  fill?: boolean;
  tension?: number;
  yAxisID?: string;
  stack?: string;
  pointRadius?: number;
  pointHoverRadius?: number;
  pointBorderWidth?: number;
  maxBarThickness?: number;
  unit?: string;
  axisLabel?: string;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface Chart {
  type: "bar" | "line" | "pie" | "doughnut" | "mixed";
  data: ChartData;
  options?: Record<string, any>;
}

export interface AiWidgetData {
  summary: string;
  display: "table" | "chart" | "kpi";
  table: Record<string, any>[];
  chart: Chart | null;
}

// ── Constants ───────────────────────────────────────────────────────────────

const PIE_LIKE_TYPES = new Set(["pie", "doughnut"]);
const VALID_CHART_TYPES = new Set(["bar", "line", "pie", "doughnut", "mixed"]);

// Colors for non-mixed charts
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

// Professional mixed chart colors
const MIXED_BAR_COLOR = "rgba(59, 130, 246, 0.75)";
const MIXED_BAR_BORDER = "#2563eb";
const MIXED_LINE_COLOR = "#f97316";
const MIXED_LINE_BG = "rgba(249, 115, 22, 0.1)";

function getCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

// ── Number Formatting ───────────────────────────────────────────────────────

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  }
  if (Math.abs(value) >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (Math.abs(value) >= 1_000) {
    return (value / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return value.toLocaleString("vi-VN");
}

function formatShortLabel(label: string, maxLen: number = 20): string {
  if (!label) return "";
  if (label.length <= maxLen) return label;
  return label.substring(0, maxLen - 3) + "...";
}

// ── Generic Mixed Chart Helpers ─────────────────────────────────────────────

interface AxisGroup {
  axisId: string;
  datasets: any[];
  unit: string;
  label: string;
}

function groupDatasetsByUnit(datasets: any[]): { groups: AxisGroup[]; useTypeFallback: boolean } {
  const distinctUnits = new Set(
    datasets.map((d) => (d.unit || "").trim()).filter((u) => u.length > 0)
  );
  // Chỉ tin tưởng "unit" nếu nó thực sự phân biệt được >= 2 nhóm.
  const useTypeFallback = distinctUnits.size < 2;
 
  const groups = new Map<string, any[]>();
  const groupLabels = new Map<string, string>();
 
  for (const ds of datasets) {
    const key = getAxisGroupKey(ds, useTypeFallback);
    if (!groups.has(key)) {
      groups.set(key, []);
      const fallbackLabel =
        ds.axisLabel || ds.unit || ds.label || (key === "line" ? "Line" : "Bar");
      groupLabels.set(key, fallbackLabel);
    }
    groups.get(key)!.push(ds);
  }
 
  const ordered: AxisGroup[] = [];
  let index = 0;
  for (const [key, dsList] of groups) {
    const axisId = index === 0 ? "y" : `y${index}`;
    ordered.push({
      axisId,
      datasets: dsList,
      unit: key,
      label: groupLabels.get(key) || key,
    });
    index++;
  }
 
  return { groups: ordered, useTypeFallback };
}

function getAxisGroupKey(ds: any, useTypeFallback: boolean): string {
  if (useTypeFallback) return ds.type || "bar";
  return ds.unit || "";
}

function assignAxes(datasets: any[], axisGroups: AxisGroup[], useTypeFallback: boolean): any[] {
  return datasets.map((ds) => {
    const key = getAxisGroupKey(ds, useTypeFallback);
    const group = axisGroups.find((g) => g.unit === key);
    if (!group) return ds;
    return {
      ...ds,
      yAxisID: group.axisId,
    };
  });
}

function autoAssignType(datasets: any[]): any[] {
  return datasets.map((ds) => {
    if (ds.type) return ds;
    return { ...ds, type: "bar" };
  });
}



function buildMixedChartData(datasets: any[], mixedColors: any[]) {
  const allAssigned = autoAssignType(datasets);
  const { groups: axisGroups, useTypeFallback } = groupDatasetsByUnit(allAssigned);
  const withAxes = assignAxes(allAssigned, axisGroups, useTypeFallback);
 
  const chartJsDatasets = withAxes.map((ds, i) => {
    const isBar = ds.type === "bar";
    const isLine = ds.type === "line";
 
    let bg, border, borderWidth, borderRadius, fill, tension, pointRadius, pointHoverRadius, pointBorderWidth;
 
    if (isBar) {
      bg = ds.backgroundColor || MIXED_BAR_COLOR;
      border = ds.borderColor || MIXED_BAR_BORDER;
      borderWidth = ds.borderWidth ?? 1;
      borderRadius = ds.borderRadius ?? 8;
      fill = false;
      tension = 0;
      pointRadius = 0;
      pointHoverRadius = 0;
      pointBorderWidth = 0;
    } else {
      bg = ds.backgroundColor || MIXED_LINE_BG;
      border = ds.borderColor || mixedColors[i % mixedColors.length];
      borderWidth = ds.borderWidth ?? 3;
      borderRadius = 0;
      fill = ds.fill ?? true;
      tension = ds.tension ?? 0.35;
      pointRadius = ds.pointRadius ?? 5;
      pointHoverRadius = ds.pointHoverRadius ?? 8;
      pointBorderWidth = 2;
    }
 
    return {
      label: ds.label || "",
      data: Array.isArray(ds.data) ? ds.data : [],
      type: ds.type,
      yAxisID: ds.yAxisID,
      stack: isBar ? `bar-${i}` : undefined,
      backgroundColor: bg,
      borderColor: border,
      borderWidth,
      borderRadius,
      fill,
      tension,
      pointRadius,
      pointHoverRadius,
      pointBorderWidth,
      maxBarThickness: 40,
      unit: ds.unit,
      axisLabel: ds.axisLabel,
    };
  });
 
  return { axisGroups, datasets: chartJsDatasets };
}
// ── Validation ──────────────────────────────────────────────────────────────

interface ValidationResult {
  valid: boolean;
  error: string | null;
}

function validateChartData(chartType: string, chartData: any): ValidationResult {
  if (!chartData) return { valid: false, error: "chartData is null/undefined" };
  if (!Array.isArray(chartData.labels)) return { valid: false, error: "labels must be an array" };
  if (!Array.isArray(chartData.datasets)) return { valid: false, error: "datasets must be an array" };
  if (chartData.datasets.length === 0) return { valid: false, error: "datasets is empty" };

  const usedAxisIds = new Set<string>();
  for (let i = 0; i < chartData.datasets.length; i++) {
    const ds = chartData.datasets[i];
    if (!ds) return { valid: false, error: `datasets[${i}] is null/undefined` };
    if (!Array.isArray(ds.data)) return { valid: false, error: `datasets[${i}].data must be an array` };
    if (ds.data.length !== chartData.labels.length) {
      return {
        valid: false,
        error: `datasets[${i}].data length (${ds.data.length}) !== labels length (${chartData.labels.length})`,
      };
    }
    if (chartType === "mixed") {
      if (!ds.yAxisID) {
        return { valid: false, error: `datasets[${i}] missing yAxisID for mixed chart` };
      }
      const axisId = String(ds.yAxisID);
      if (!axisId.startsWith("y")) {
        return { valid: false, error: `datasets[${i}] has invalid yAxisID "${ds.yAxisID}" for mixed chart` };
      }
      usedAxisIds.add(axisId);
    } else {
      if (ds.yAxisID && ds.yAxisID !== "y") {
        return { valid: false, error: `datasets[${i}] references yAxisID="${ds.yAxisID}" but chart type is "${chartType}"` };
      }
    }
  }
  return { valid: true, error: null };
}

// ── Data Builders ───────────────────────────────────────────────────────────

function buildChartData(chart: Chart, isPieLike: boolean): any {
  const { labels, datasets } = chart.data;

  if (chart.type !== "mixed") {
    const chartJsDatasets = datasets.map((ds, i) => {
      const base: any = {
        label: ds.label || "",
        data: Array.isArray(ds.data) ? ds.data : [],
        backgroundColor: ds.backgroundColor || CHART_BG_COLORS[i % CHART_BG_COLORS.length],
        borderColor: ds.borderColor || CHART_BORDER_COLORS[i % CHART_BORDER_COLORS.length],
        borderWidth: ds.borderWidth ?? (isPieLike ? 1 : 2),
        borderRadius: ds.borderRadius ?? (chart.type === "bar" ? 6 : undefined),
      };

      if (!isPieLike) {
        base.type = ds.type;
        base.fill = ds.fill ?? (chart.type === "line" ? false : undefined);
        base.tension = ds.tension ?? 0.35;
        if (ds.yAxisID && ds.yAxisID !== "y") {
          console.warn(`[buildChartData] Stripping invalid yAxisID="${ds.yAxisID}" for non-mixed chart type="${chart.type}"`);
        }
        base.yAxisID = ds.yAxisID === "y" ? "y" : undefined;
        base.stack = ds.stack;
      }

      return base;
    });

    return { labels, datasets: chartJsDatasets };
  }

  const { axisGroups, datasets: chartJsDatasets } = buildMixedChartData(datasets, CHART_BORDER_COLORS);
  return { labels, datasets: chartJsDatasets, axisGroups };
}

function buildChartOptions(chart: Chart, isSmall: boolean, isPieLike: boolean, axisGroups?: AxisGroup[]): any {
  const chartTextColor = getCssVar("--chart-text", "#94A3B8");
  const chartGridColor = getCssVar("--chart-grid", "rgba(148, 163, 184, 0.12)");
  const tooltipBg = getCssVar("--chart-tooltip-bg", "#1E293B");
  const tooltipBorder = getCssVar("--chart-tooltip-border", "rgba(148, 163, 184, 0.18)");
  const tooltipTitleColor = getCssVar("--chart-tooltip-title", "#F1F5F9");
  const tooltipBodyColor = getCssVar("--chart-tooltip-body", "#CBD5E1");

  if (isPieLike) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: !isSmall,
          position: "top" as const,
          align: "center",
          labels: {
            color: chartTextColor,
            boxWidth: 12,
            padding: 16,
            font: { size: isSmall ? 10 : 12 },
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          borderWidth: 1,
          titleColor: tooltipTitleColor,
          bodyColor: tooltipBodyColor,
          padding: 12,
          cornerRadius: 8,
          titleFont: { weight: "600" as const },
        },
      },
    };
  }

  const isMixed = chart.type === "mixed";
  const rawBackendOptions = chart.options || {};
  const isTablet = typeof window !== "undefined" && window.innerWidth < 1024;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const xFontSize = isMobile ? 8 : isTablet ? 9 : 11;
  const yFontSize = isMobile ? 9 : isTablet ? 10 : 11;
  const legendFontSize = isMobile ? 9 : isTablet ? 10 : 12;
  const labelMaxLen = isMobile ? 12 : isTablet ? 16 : 25;

  const tooltipConfig: any = {
    backgroundColor: tooltipBg,
    borderColor: tooltipBorder,
    borderWidth: 1,
    padding: 14,
    cornerRadius: 10,
    titleFont: { weight: "600" as const, size: 14 },
    bodyFont: { size: 13 },
    titleColor: tooltipTitleColor,
    bodyColor: tooltipBodyColor,
    displayColors: true,
    boxPadding: 6,
    usePointStyle: true,
    callbacks: {
      title: (items: any[]) => {
        if (!items.length) return "";
        const label = items[0].label;
        return label.length > 30 ? label.substring(0, 30) + "..." : label;
      },
      label: (ctx: any) => {
        const dsLabel = ctx.dataset.label || "";
        const val = ctx.parsed?.y ?? ctx.parsed;
        if (val === null || val === undefined) return `${dsLabel}: N/A`;
        if (Math.abs(val) >= 1_000_000) {
          return `${dsLabel}: ${formatCompact(val)}`;
        }
        return `${dsLabel}: ${val.toLocaleString("vi-VN")}`;
      },
    },
  };

  const scales: any = {
    x: {
      stacked: false,
      type: "category" as const,
      ticks: {
        color: chartTextColor,
        font: { size: xFontSize },
        maxRotation: isMobile ? 45 : 0,
        minRotation: 0,
        autoSkip: true,
        maxTicksLimit: isMobile ? 6 : isTablet ? 10 : 20,
        callback: function (this: any, _value: any, index: number) {
          const label = this.getLabelForValue(index);
          return formatShortLabel(label, labelMaxLen);
        },
      },
      grid: { display: false },
      offset: isMobile ? false : true,
    },
  };

  if (isMixed && axisGroups) {
    for (const group of axisGroups) {
      const isLeft = group.axisId === "y";
      scales[group.axisId] = {
        type: "linear",
        beginAtZero: true,
        position: isLeft ? "left" : "right",
        title: {
          display: !isSmall && !!group.label,
          text: group.label || "",
          color: chartTextColor,
          font: { size: 11, weight: "500" },
        },
        ticks: {
          color: chartTextColor,
          font: { size: yFontSize },
          callback: function (value: any) {
            return formatCompact(value);
          },
        },
        grid: {
          color: chartGridColor,
          drawOnChartArea: isLeft,
          drawTicks: false,
        },
        border: { display: false },
      };
    }
  } else {
    scales.y = {
      type: "linear",
      position: "left",
      beginAtZero: true,
      ticks: {
        color: chartTextColor,
        font: { size: yFontSize },
        callback: function (value: any) {
          return formatCompact(value);
        },
      },
      grid: {
        color: chartGridColor,
        drawOnChartArea: true,
        drawTicks: false,
      },
      border: { display: false },
    };
  }

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    ...rawBackendOptions,
    plugins: {
      ...(rawBackendOptions.plugins || {}),
      legend: {
        display: !isSmall,
        position: "top" as const,
        align: "start" as const,
        ...(rawBackendOptions.plugins?.legend || {}),
        labels: {
          color: chartTextColor,
          boxWidth: isMobile ? 10 : 14,
          padding: isMobile ? 12 : 20,
          font: { size: legendFontSize, weight: "500" as const },
          usePointStyle: true,
          ...(rawBackendOptions.plugins?.legend?.labels || {}),
        },
      },
      tooltip: tooltipConfig,
    },
    scales,
  };

  if (rawBackendOptions.animation !== false) {
    options.animation = {
      duration: 1000,
      easing: "easeOutQuart" as const,
    };
  }

  return options;
}

// ── Sub-components ──────────────────────────────────────────────────────────

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

  const columns = [...new Set(table.flatMap((row) => Object.keys(row)))];

  return (
    <div className="card table-card">
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>
                  {col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
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

// ── Chart Component (canvas ref for full control) ───────────────────────────

function ChartWidget({ chart, isSmall }: { chart: Chart; isSmall: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => setTick((t) => t + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  if (!chart) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 32 }}>
        <span className="muted">No chart data available</span>
      </div>
    );
  }

  if (!VALID_CHART_TYPES.has(chart.type)) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 32 }}>
        <span className="muted">Unsupported chart type: {chart.type}</span>
      </div>
    );
  }

  if (!chart.data || !Array.isArray(chart.data.labels) || !Array.isArray(chart.data.datasets)) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 32 }}>
        <span className="muted">Invalid chart data structure</span>
      </div>
    );
  }

  const isPieLike = PIE_LIKE_TYPES.has(chart.type);

  const chartData = buildChartData(chart, isPieLike);
  const axisGroups = chartData.axisGroups;
  delete chartData.axisGroups;
  const chartOptions = buildChartOptions(chart, isSmall, isPieLike, axisGroups);

  const validation = validateChartData(chart.type, chartData);
  if (!validation.valid) {
    console.warn(`[ChartWidget] Validation failed: ${validation.error}`);
    return (
      <div className="card" style={{ textAlign: "center", padding: 32 }}>
        <span className="muted">Invalid chart data: {validation.error}</span>
      </div>
    );
  }

  console.group("[ChartWidget] Debug");
  console.log("Type:", chart.type);
  console.log("Scales:", chartOptions.scales);
  console.log("Datasets yAxisID:", chartData.datasets.map((d: any) => ({ label: d.label, yAxisID: d.yAxisID })));
  console.groupEnd();

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    try {
      const chartTypeMap: Record<string, string> = {
        bar: "bar",
        line: "line",
        pie: "pie",
        doughnut: "doughnut",
        mixed: "bar",
      };

      const controllerType = chartTypeMap[chart.type] || "bar";

      chartInstanceRef.current = new ChartJS(ctx, {
        type: controllerType as any,
        data: chartData,
        options: chartOptions,
      });
    } catch (err) {
      console.error("[ChartWidget] Failed to create chart:", err);
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, isSmall]);

  return (
    <div
      className="card"
      style={{
        height: "100%",
        overflow: "hidden",
        position: "relative",
        padding: isSmall ? "12px" : "20px",
      }}
    >
      <div style={{ padding: "0 0 16px" }}>
        <h2
          style={{
            fontSize: isSmall ? 13 : 18,
            fontWeight: 700,
            textTransform: "capitalize",
            margin: 0,
            color: "var(--text-primary)",
          }}
        >
          {/* {chart.type === "mixed" ? "Doanh thu & Số đơn theo sản phẩm" : `${chart.type} Chart`} */}
        </h2>
      </div>
      <div style={{ height: isSmall ? 200 : 360, position: "relative" }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function AiDashboardWidget({ widget, title, isLoading }: { widget: AiWidgetData; title?: string; isLoading?: boolean }) {
  const small = false;

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

  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      
      {!title && widget.display !== "kpi" && (
        <div
          className="card"
          style={{ marginBottom: 20, marginTop: 20, padding: "12px 20px" }}
        >
          <p className="metric-value" style={{ fontSize: 14, margin: 0 }}>
            {widget.summary}
          </p>
        </div>
      )}

      {widget.display === "kpi" && <KpiCard summary={widget.summary} />}
      {widget.display === "table" && <TableWidget table={widget.table} />}
      {widget.display === "chart" && widget.chart && (
        <ChartWidget chart={widget.chart} isSmall={false} />
      )}
    </div>
  );
}