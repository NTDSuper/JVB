import Link from "next/link";
import {
  ShoppingBag,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  Shield,
  Truck,
  Headphones,
  CreditCard,
} from "lucide-react";

/* ── Data ── */

const QUICK_LINKS = [
  { href: "/products", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/categories", label: "Categories" },
  { href: "/cart", label: "Cart" },
] as const;

const SUPPORT_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/returns", label: "Return Policy" },
  { href: "/contact", label: "Contact Us" },
] as const;

const CONTACT_INFO = [
  {
    icon: MapPin,
    label: "Address",
    value: "Hanoi, Vietnam",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "0983981277",
    href: "tel:19001234",
  },
  {
    icon: Mail,
    label: "Email",
    value: "ntdung270205@gmail.com",
    href: "mailto:support@supermarket.com",
  },
] as const;

const FEATURES = [
  { icon: Truck, title: "Fast Delivery", desc: "Free shipping" },
  { icon: Shield, title: "Secure Payment", desc: "100% secure" },
  { icon: Headphones, title: "24/7 Support", desc: "Always ready to help" },
  { icon: CreditCard, title: "Easy Returns", desc: "Within 7 days" },
] as const;

/* ── Sub-components ── */

function FooterLogo() {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/products" className="inline-flex items-center gap-3 group">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white shrink-0 shadow-lg shadow-[var(--primary)]/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
          <ShoppingBag size={22} />
        </div>
        <span className="text-xl font-extrabold tracking-tight text-[var(--text-primary)] transition-colors duration-200 group-hover:text-[var(--primary)]">
          SuperMarket
        </span>
      </Link>
      <p className="text-sm leading-relaxed text-[var(--text-muted)] max-w-xs">
        Shop online fast with a wide range of products at great prices every day.
      </p>
    </div>
  );
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] mb-5 relative pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-0.5 after:bg-[var(--primary)] after:rounded-full">
      {children}
    </h3>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li className="group">
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-all duration-200 hover:text-[var(--primary)] hover:translate-x-1"
      >
        <ChevronRight
          size={14}
          className="shrink-0 opacity-0 -ml-4 transition-all duration-200 group-hover:opacity-100 group-hover:ml-0 text-[var(--primary)]"
        />
        {label}
      </Link>
    </li>
  );
}

function ContactItem({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-3 group">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--bg-hover)] text-[var(--primary)] shrink-0 transition-all duration-300 group-hover:bg-[var(--primary)] group-hover:text-white group-hover:scale-110">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--text-muted)] mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-[var(--text-secondary)] transition-colors duration-200 group-hover:text-[var(--primary)] truncate">
          {value}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        className="block no-underline"
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        {content}
      </a>
    );
  }

  return content;
}

function FeatureBadge({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] transition-all duration-300 hover:border-[var(--primary)] hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white shrink-0 shadow-sm">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{title}</p>
        <p className="text-xs text-[var(--text-muted)] truncate">{desc}</p>
      </div>
    </div>
  );
}

/* ── Main Footer ── */

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-surface)] relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--bg-main)] opacity-50 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative">
        {/* ── Features Bar ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 py-8 border-b border-[var(--border)]">
          {FEATURES.map((feature) => (
            <FeatureBadge key={feature.title} {...feature} />
          ))}
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 py-12 md:py-16">
          {/* Column 1: Logo & Description */}
          <div className="sm:col-span-2 lg:col-span-1">
            <FooterLogo />
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <FooterHeading>Quick Links</FooterHeading>
            <ul className="flex flex-col gap-3">
              {QUICK_LINKS.map((link) => (
                <FooterLink key={link.label} href={link.href} label={link.label} />
              ))}
            </ul>
          </div>

          {/* Column 3: Support */}
          <div>
            <FooterHeading>Support</FooterHeading>
            <ul className="flex flex-col gap-3">
              {SUPPORT_LINKS.map((link) => (
                <FooterLink key={link.label} href={link.href} label={link.label} />
              ))}
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <FooterHeading>Contact</FooterHeading>
            <div className="flex flex-col gap-4">
              {CONTACT_INFO.map((item) => (
                <ContactItem key={item.label} {...item} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer Bottom ── */}
      <div className="border-t border-[var(--border)] relative">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)] text-center sm:text-left">
            &copy; 2026 SuperMarket. All rights reserved.
          </p>
          <p className="text-xs text-[var(--text-muted)] text-center sm:text-right flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
            Safe & convenient shopping
          </p>
        </div>
      </div>
    </footer>
  );
}