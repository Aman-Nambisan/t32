import Link from "next/link";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#cases", label: "Cases" },
  { href: "#pricing", label: "Pricing" },
];

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070707]/85 backdrop-blur">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 md:px-8"
      >
        <Link href="/" className="flex items-baseline gap-3">
          <span className="font-display text-xl font-bold tracking-tight text-amber-100">
            PENNY
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 sm:inline">
            by team t32 · McContext
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-6 md:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-white/60 transition-colors hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </div>
          <Link
            href="/agents"
            className="rounded-full bg-amber-300 px-4 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-amber-200"
          >
            Meet Narmata Tai →
          </Link>
        </div>
      </nav>
    </header>
  );
}
