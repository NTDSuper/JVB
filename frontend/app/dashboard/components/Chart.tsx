"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import { Product } from "@/types/dto";

interface Props {
  products: Product[];
}

export default function Chart({ products }: Props) {
  const chartData = products.slice(0, 10).map((item) => ({
    name: item.name.length > 18 ? `${item.name.slice(0, 18)}...` : item.name,
    stock: item.stock,
  }));

  return (
    <div className="card">
      <div className="table-card-header" style={{ padding: "0 0 16px" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Stock Overview</h2>
          <p className="muted" style={{ fontSize: 13 }}>
            Top 10 products by current list order
          </p>
        </div>
      </div>

      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: "rgba(37, 99, 235, 0.08)" }}
              contentStyle={{
                background: "#182231",
                border: "1px solid rgba(148, 163, 184, 0.18)",
                borderRadius: 8,
                color: "#f1f5f9",
              }}
            />
            <Bar dataKey="stock" fill="#14b8a6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
