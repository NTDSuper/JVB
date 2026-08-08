export default function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-xs)]">
      {/* Image 1:1 */}
      <div className="skeleton aspect-square w-full rounded-none" />

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-3 w-3/5" />
        <div className="flex items-center justify-between mt-1">
          <div className="skeleton h-3 w-12" />
          <div className="skeleton h-3 w-10" />
        </div>
        <div className="skeleton h-6 w-1/3 mt-1" />
        <div className="skeleton h-10 w-full mt-1 rounded-xl" />
      </div>
    </div>
  );
}