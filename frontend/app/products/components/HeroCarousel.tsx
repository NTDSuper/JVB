"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Zap, Gift, Truck, Sparkles } from "lucide-react";

interface Banner {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  icon: "zap" | "gift" | "sparkles" | "truck";
  gradient: string;
  accent: string;
}

const BANNERS: Banner[] = [
  {
    eyebrow: "Flash Sale 24h",
    title: "Deals so hot they sell out before your coffee cools",
    subtitle: "Up to 50% off trending products. Inventory is limited — grab yours before the countdown ends.",
    cta: "Shop flash deals",
    icon: "zap",
    gradient:
      "from-[#FF5A1F] via-[#F43F5E] to-[#EA580C]",
    accent: "#FF5A1F",
  },
  {
    eyebrow: "New Season",
    title: "Fresh picks, freshly stocked",
    subtitle: "The newest arrivals just landed on the shelves. Be the first to browse.",
    cta: "Browse new arrivals",
    icon: "sparkles",
    gradient:
      "from-[#059669] via-[#10B981] to-[#0D9488]",
    accent: "#059669",
  },
  {
    eyebrow: "Free Shipping",
    title: "Free delivery on qualifying orders",
    subtitle: "Every order over $29 ships free, straight to your door. Simple and fast.",
    cta: "See conditions",
    icon: "truck",
    gradient:
      "from-[#6366F1] via-[#8B5CF6] to-[#7C3AED]",
    accent: "#6366F1",
  },
];

const SIDE_BANNERS = [
  {
    eyebrow: "Voucher Zone",
    title: "Extra $5 off your first cart",
    cta: "Collect voucher",
    icon: Gift,
    gradient: "from-[#EA580C] via-[#F43F5E] to-[#C2410C]",
    accentColor: "#FFEDD5",
    ring: "border-[#EA580C]/40",
  },
  {
    eyebrow: "Authentic",
    title: "100% genuine products, guaranteed",
    cta: "Learn more",
    icon: Sparkles,
    gradient: "from-[#059669] via-[#10B981] to-[#0D9488]",
    accentColor: "#D1FAE5",
    ring: "border-[#059669]/40",
  },
];

const AUTOPLAY_MS = 5000;

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((dir: 1 | -1) => {
    setCurrent((prev) => (prev + dir + BANNERS.length) % BANNERS.length);
  }, []);

  const goTo = useCallback((i: number) => setCurrent(i), []);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => setCurrent((prev) => (prev + 1) % BANNERS.length), AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused]);

  const active = BANNERS[current];
  const Icon = active.icon === "zap" ? Zap : active.icon === "gift" ? Gift : active.icon === "truck" ? Truck : Sparkles;

  return (
    <section aria-label="Featured promotions" className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_380px] 2xl:grid-cols-[1fr_420px] gap-4">
      {/* ── Main carousel ── */}
      <div
        className="group relative overflow-hidden rounded-2xl shadow-[var(--shadow-lg)] min-h-[240px] sm:min-h-[300px] lg:min-h-[360px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {BANNERS.map((b, i) => (
          <div
            key={b.eyebrow}
            aria-hidden={i !== current}
            className={`absolute inset-0 bg-gradient-to-br ${b.gradient} transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            {/* Decorative rings */}
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border-[28px] border-white/10" />
            <div className="absolute right-24 bottom-[-72px] h-56 w-56 rounded-full border-[20px] border-white/5" />
            <div className="absolute right-40 top-10 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

            <div className="relative flex h-full flex-col justify-center gap-3 p-6 sm:p-10 lg:p-12 text-white max-w-xl">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] backdrop-blur-sm">
                <Icon size={12} />
                {b.eyebrow}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-[1.1] tracking-tight" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
                {b.title}
              </h2>
              <p className="max-w-md text-sm sm:text-base text-white/85 leading-relaxed">{b.subtitle}</p>
              <button className="mt-2 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:scale-[1.02] active:scale-95"
                style={{ color: b.accent }}
              >
                {b.cta}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}

        {/* Arrows */}
        <button
          onClick={() => go(-1)}
          aria-label="Previous banner"
          className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-white/35 hover:scale-110"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => go(1)}
          aria-label="Next banner"
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-white/35 hover:scale-110"
        >
          <ChevronRight size={18} />
        </button>

        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to banner ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-7 bg-white" : "w-2 bg-white/45 hover:bg-white/70"}`}
            />
          ))}
        </div>
      </div>

      {/* ── Right side: two stacked small banners ── */}
      <div className="grid grid-rows-2 gap-4">
        {SIDE_BANNERS.map((b) => (
          <div
            key={b.eyebrow}
            className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border ${b.ring} bg-gradient-to-br ${b.gradient} p-5 shadow-[var(--shadow-md)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)] group`}
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/15 blur-xl" />
            <div className="absolute right-3 bottom-3 h-16 w-16 rounded-full border-[10px] border-white/10" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/90">{b.eyebrow}</span>
                <p className="mt-1.5 text-sm font-bold leading-snug text-white">{b.title}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/25 text-white shadow-sm backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <b.icon size={18} />
              </div>
            </div>
            <button className="inline-flex items-center gap-1 text-xs font-semibold text-white hover:gap-2 transition-all">
              {b.cta}
              <ChevronRight size={14} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}