"use client";

import { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import api from "@/lib/api";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

interface DailyRevenue {
  date: string;
  revenue: number;
}

interface RevenueResponse {
  year: number;
  month: number;
  days: number;
  data: DailyRevenue[];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getComputedStyleProp(prop: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
}

export default function Chart() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [revenueData, setRevenueData] = useState<DailyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  // Force re-render when theme changes
  const [, setTick] = useState(0);

  // Listen for theme changes to re-render chart
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTick((t) => t + 1);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get<RevenueResponse>("/revenue/daily", { params: { year, month } })
      .then((res) => {
        const data = res.data.data;
        setRevenueData(data);
        setTotalRevenue(data.reduce((sum, d) => sum + d.revenue, 0));
      })
      .catch(() => {
        setRevenueData([]);
        setTotalRevenue(0);
      })
      .finally(() => setLoading(false));
  }, [year, month]);

  const goToPrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;

  // Get theme-aware colors from CSS variables
  const gridColor = getComputedStyleProp("--chart-grid") || "rgba(148, 163, 184, 0.12)";
  const textColor = getComputedStyleProp("--chart-text") || "#94A3B8";
  const tooltipBg = getComputedStyleProp("--chart-tooltip-bg") || "#1E293B";
  const tooltipBorder = getComputedStyleProp("--chart-tooltip-border") || "rgba(148, 163, 184, 0.18)";
  const tooltipTitle = getComputedStyleProp("--chart-tooltip-title") || "#F1F5F9";
  const tooltipBody = getComputedStyleProp("--chart-tooltip-body") || "#CBD5E1";
  const accentColor = getComputedStyleProp("--accent") || "#F97316";
  const isDark = getComputedStyleProp("--bg-main") === "#0F172A";

  const chartData = {
    labels: revenueData.map((d) => {
      const day = parseInt(d.date.split("-")[2], 10);
      return day.toString();
    }),
    datasets: [
      {
        label: "Daily Revenue",
        data: revenueData.map((d) => d.revenue),
        fill: true,
        borderColor: accentColor,
        backgroundColor: isDark
          ? "rgba(251, 146, 60, 0.12)"
          : "rgba(249, 115, 22, 0.1)",
        borderWidth: 2,
        pointBackgroundColor: accentColor,
        pointBorderColor: accentColor,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        titleColor: tooltipTitle,
        bodyColor: tooltipBody,
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: function (context: any) {
            const value = context.parsed.y;
            return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: textColor,
          font: { size: 11 },
          maxTicksLimit: 15,
        },
      },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          font: { size: 11 },
          callback: function (value: any) {
            return "$" + value.toLocaleString();
          },
        },
      },
    },
  };

  return (
    <div className="card">
      <div
        className="table-card-header"
        style={{ padding: "0 0 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Daily Revenue</h2>
          <p className="muted" style={{ fontSize: 13 }}>
            {MONTHS[month - 1]} {year}
            {!loading && (
              <span style={{ marginLeft: 8, color: "var(--accent)", fontWeight: 600 }}>
                — ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="btn btn-ghost"
            onClick={goToPrevMonth}
            style={{ padding: "4px 10px", fontSize: 13 }}
            title="Previous month"
          >
            ← Prev
          </button>
          <button
            className="btn btn-ghost"
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            style={{ padding: "4px 10px", fontSize: 13 }}
            title="Next month"
          >
            Next →
          </button>
        </div>
      </div>

      <div style={{ height: 320, position: "relative" }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-muted)",
            }}
          >
            Loading...
          </div>
        ) : revenueData.length === 0 || totalRevenue === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-muted)",
            }}
          >
            No revenue data for this month
          </div>
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
    </div>
  );
}