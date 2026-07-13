"use client";

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

// ── Heuristics: tự động quyết định widget to hay nhỏ dựa vào data ──

function isSmallWidget(widget: AiWidgetData): boolean {
  if (widget.display === "kpi") {
    // KPI luôn là small (2 cái 1 dòng)
    return true;
  }

  if (widget.display === "chart" && widget.chart) {
    const { type, data } = widget.chart;
    const labelCount = data.labels?.length ?? 0;
    const datasetCount = data.datasets?.length ?? 0;
    const totalDataPoints = data.datasets?.reduce(
      (sum, ds) => sum + (ds.data?.length ?? 0),
      0
    ) ?? 0;

    switch (type) {
      case "pie":
        // Pie ít slice → small, nhiều slice → large
        return labelCount <= 6;
      case "bar":
        // Bar ít cột & ít dataset → small, nhiều → large
        return labelCount <= 6 && datasetCount <= 2 && totalDataPoints <= 12;
      case "line":
        // Line ít điểm → small, nhiều → large (line thường là trend cần rộng)
        return labelCount <= 4 && datasetCount <= 1;
      default:
        return false;
    }
  }

  if (widget.display === "table") {
    const columns = widget.table?.length > 0 ? Object.keys(widget.table[0]).length : 0;
    const rows = widget.table?.length ?? 0;
    // Table nhỏ: ít cột & ít dòng
    return columns <= 3 && rows <= 5;
  }

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
  if (!chart || !chart.data || !chart.data.labels) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 32 }}>
        <span className="muted">No chart data available</span>
      </div>
    );
  }

  const { labels, datasets } = chart.data;

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
        display: !isSmall, // hide legend on small charts to save space
        labels: {
          color: "#94a3b8",
          boxWidth: isSmall ? 8 : 12,
          font: {
            size: isSmall ? 10 : 12,
          },
        },
      },
      tooltip: {
        backgroundColor: "#182231",
        borderColor: "rgba(148, 163, 184, 0.18)",
        borderWidth: 1,
        titleColor: "#f1f5f9",
        bodyColor: "#f1f5f9",
      },
    },
    scales:
      chart.type !== "pie"
        ? {
            x: {
              ticks: { color: "#94a3b8", font: { size: isSmall ? 9 : 11 } },
              grid: { color: "rgba(148, 163, 184, 0.12)" },
            },
            y: {
              ticks: { color: "#94a3b8", font: { size: isSmall ? 9 : 11 } },
              grid: { color: "rgba(148, 163, 184, 0.12)" },
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
    <div className="card" style={{ height: "100%" }}>
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
      <div style={{ height: isSmall ? 200 : 360 }}>
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
  const small = isSmallWidget(widget);

  // Small widget: render 2 per row, no separate summary card
  if (small) {
    // Small chart
    if (widget.display === "chart" && widget.chart) {
      return (
        <div
          style={{
            display: "inline-flex",
            flexDirection: "column",
            width: "50%",
            padding: "0 6px",
            marginBottom: 18,
            boxSizing: "border-box",
            verticalAlign: "top",
          }}
        >
          <ChartWidget chart={widget.chart} isSmall={true} />
        </div>
      );
    }

    // Small table
    if (widget.display === "table") {
      return (
        <div
          style={{
            display: "inline-flex",
            flexDirection: "column",
            width: "50%",
            padding: "0 6px",
            marginBottom: 18,
            boxSizing: "border-box",
            verticalAlign: "top",
          }}
        >
          <TableWidget table={widget.table} />
        </div>
      );
    }

    // Small KPI
    if (widget.display === "kpi") {
      return (
        <div
          style={{
            display: "inline-flex",
            flexDirection: "column",
            width: "50%",
            padding: "0 6px",
            marginBottom: 18,
            boxSizing: "border-box",
            verticalAlign: "top",
          }}
        >
          <KpiCard summary={widget.summary} />
        </div>
      );
    }
  }

  // Large widget: full width with summary card
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        className="card"
        style={{ marginBottom: 12, padding: "12px 20px" }}
      >
        <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
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

/**
 * rules for deciding whether a widget is small or large (to render 2 per row or 1 per row):

**Cách hoạt động của `isSmallWidget()`:**

| Loại           | Small (2 cái / dòng)                         | Large (1 cái / dòng) |
|----------------|----------------------------------------------|----------------------|
| **KPI**        | Luôn small                                   | —                    |
| **Pie chart**  | ≤ 6 labels                                   | > 6 labels           |
| **Bar chart**  | ≤ 6 labels + ≤ 2 datasets + ≤ 12 data points | Ngược lại            |
| **Line chart** | ≤ 4 labels + 1 dataset                       | Ngược lại            |
| **Table**      | ≤ 3 cột + ≤ 5 dòng                           | Ngược lại            |

**Small widget**: render inline-flex 50% width, **không có summary card** riêng, chart title font nhỏ hơn (13px), chart height 200px, ẩn legend, font ticks 9px.

**Large widget**: render full width, có summary card, chart title 18px, chart height 360px, hiển thị legend đầy đủ.
 */