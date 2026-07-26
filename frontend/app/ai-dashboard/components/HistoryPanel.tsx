"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import type { AiWidgetData } from "./AiDashboardWidget";

interface TaskInfo {
  question: string;
  display: string;
  chart_type: string;
}

interface HistoryItem {
  _id: string;
  session_id: string;
  user_id: number;
  question: string;
  tasks: TaskInfo[];
  widgets: AiWidgetData[];
  widget_count: number;
  task_count: number;
  created_at: string;
}

interface HistoryPanelProps {
  onSelect: (item: HistoryItem) => void;
}

export default function HistoryPanel({ onSelect }: HistoryPanelProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/dashboard/history?skip=0&limit=20");
      if (res.data?.success) {
        setItems(res.data.data || []);
      } else {
        setError(res.data?.error || "Failed to load history");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this history item?")) return;
    try {
      const res = await api.delete(`/dashboard/history/${id}`);
      if (res.data?.success) {
        setItems((prev) => prev.filter((item) => item._id !== id));
      }
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="card"
      style={{ padding: 0, overflow: "hidden" }}
    >
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
          📋 Query History
        </h3>
        <button
          className="btn btn-ghost btn-sm"
          onClick={fetchHistory}
          disabled={loading}
          style={{ fontSize: 12 }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading && (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            Loading history...
          </p>
        </div>
      )}

      {error && (
        <div style={{ padding: "14px 20px", color: "var(--danger)", fontSize: 13 }}>
          Error: {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          No history yet. Ask a question to get started.
        </div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {items.map((item) => (
            <div
              key={item._id}
              onClick={() => onSelect(item)}
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid var(--border-light)",
                cursor: "pointer",
                transition: "background 0.15s ease",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>💬</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginBottom: 2,
                  }}
                >
                  {item.question}
                </div>
                <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--text-muted)" }}>
                  <span>{item.widget_count} widget{item.widget_count !== 1 ? "s" : ""}</span>
                  <span>•</span>
                  <span>{formatDate(item.created_at)}</span>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={(e) => handleDelete(item._id, e)}
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  color: "var(--danger)",
                  borderColor: "rgba(239, 68, 68, 0.2)",
                  flexShrink: 0,
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}