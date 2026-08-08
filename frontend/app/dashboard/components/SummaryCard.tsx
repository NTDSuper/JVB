interface SummaryCardProps {
  title: string;
  value: string | number;
  hint?: string;
}

export default function SummaryCard({ title, value, hint }: SummaryCardProps) {
  return (
    <div className="rounded-2xl bg-[var(--bg-card)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.5)]">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{title}</p>
      <p className="text-2xl font-bold text-[var(--text-primary)] mt-1" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
        {value}
      </p>
      {hint && <p className="text-xs text-[var(--text-muted)] mt-1">{hint}</p>}
    </div>
  );
}