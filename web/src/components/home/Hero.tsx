import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Faint amber wash so the fold doesn't read as a flat black slab */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(252,211,77,0.09),transparent)]"
      />
      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 md:px-8 md:pb-28 md:pt-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-300/80">
          Continuous finance &amp; controls · audit-grade by default
        </p>
        <h1 className="font-display mt-5 max-w-4xl text-4xl font-semibold leading-[1.06] tracking-tight text-white sm:text-5xl md:text-6xl">
          McContext isn&apos;t losing money because something is broken. It&apos;s losing money
          because nothing is watching 2,000 registers at once.{" "}
          <span className="text-amber-300">Penny watches.</span>
        </h1>
        <p className="mt-7 max-w-2xl text-base leading-relaxed text-white/60 md:text-lg">
          Penny is a continuous agent working six controller duties — three-way match, duplicate
          payments, settlement reconciliation, loss prevention, COGS leakage, cash over/short —
          across every store, every day. Deterministic tools do the math, every verdict ships with
          evidence, and it only flags what it can prove.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            href="/agents"
            className="rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-amber-200"
          >
            Meet Narmata Tai →
          </Link>
          <a
            href="#demo-video"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/45 hover:text-white"
          >
            ▶ Watch the walkthrough
          </a>
        </div>
        <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
          Hackathon demo · simulated data · Atlan AI Hackathon 2026
        </p>
      </div>
    </section>
  );
}
