interface SummaryCardProps {
  title: string;
  value: string | number;
  hint?: string;
}

export default function SummaryCard({ title, value, hint }: SummaryCardProps) {
  return (
    <div className="card metric-card">
      <div className="metric-label">{title}</div>
      <div>
        <p className="metric-value">{value}</p>
        {hint && <p className="muted" style={{ fontSize: 13 }}>{hint}</p>}
      </div>
    </div>
  );
}
