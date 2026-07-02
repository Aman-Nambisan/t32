export default function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-white/10">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="home-reveal mx-auto max-w-2xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-300/80">
            Pricing
          </p>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
            The evidence trail is the invoice
          </h2>
        </div>
        <div className="home-reveal mx-auto mt-10 max-w-2xl rounded-2xl border border-amber-300/25 bg-white/[0.03] p-8 md:p-10">
          <span className="rounded-full border border-amber-300/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-200">
            Hackathon thesis
          </span>
          <p className="font-display mt-6 text-2xl font-semibold leading-snug text-white md:text-[1.7rem]">
            A modest platform fee per store, per month — plus 10–15% of confirmed recovered
            dollars.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            The contingency is billed only after a human confirms the evidence. Every recovered
            dollar walks back to a PO, an invoice, a register row — so the bill audits itself. If
            Penny can&apos;t prove it, you don&apos;t pay for it.
          </p>
          <div className="mt-7 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2">
            <div className="bg-[#0C0C0C] px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
                Platform
              </p>
              <p className="mt-1.5 font-mono text-sm text-amber-200">
                flat fee / store / month
              </p>
            </div>
            <div className="bg-[#0C0C0C] px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
                Recovery
              </p>
              <p className="mt-1.5 font-mono text-sm text-amber-200">
                10–15% of confirmed recoveries
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
