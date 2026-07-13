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

interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: any;
  borderColor?: any;
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface Chart {
  type: "bar" | "line" | "pie";
  data: ChartData;
}

interface DashboardWidgetData {
  summary: string;
  display: "table" | "chart" | "kpi";
  table: Record<string, any>[];
  chart: Chart | null;
}

const COLORS = [
  "#14b8a6",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

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

function KpiCard({ summary }: { summary: string }) {
  return (
    <div className="card metric-card">
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

function ChartWidget({ chart }: { chart: Chart }) {
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
    backgroundColor: ds.backgroundColor || CHART_BG_COLORS[i % CHART_BG_COLORS.length],
    borderColor: ds.borderColor || CHART_BORDER_COLORS[i % CHART_BORDER_COLORS.length],
    borderWidth: ds.borderWidth || (chart.type === "pie" ? 2 : 1),
    fill: ds.fill ?? (chart.type === "line" ? false : undefined),
    tension: ds.tension ?? 0.1,
  }));

  const chartData = { labels, datasets: chartJsDatasets };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#94a3b8",
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
              ticks: { color: "#94a3b8" },
              grid: { color: "rgba(148, 163, 184, 0.12)" },
            },
            y: {
              ticks: { color: "#94a3b8" },
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
    <div className="card">
      <div className="table-card-header" style={{ padding: "0 0 16px" }}>
        <h2
          style={{ fontSize: 18, fontWeight: 700, textTransform: "capitalize" }}
        >
          {chart.type} Chart
        </h2>
      </div>
      <div style={{ height: 360 }}>
        {renderChart()}
      </div>
    </div>
  );
}

export default function DashboardWidget({
  widget,
}: {
  widget: DashboardWidgetData;
}) {
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
        <ChartWidget chart={widget.chart} />
      )}
    </div>
  );
}