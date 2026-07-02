const CARDS = [
  {
    num: "01",
    title: "Deterministic math",
    body: "Matching and variance math run as tools — never LLM arithmetic. When Penny says $109.20 was overbilled, a calculator produced that number, and the trace shows the call.",
  },
  {
    num: "02",
    title: "Innocent explanation first",
    body: "Before calling anything a leak, Penny hunts for the boring truth: the split delivery, the processing fee, the published price rise. The flags that survive that hunt are the ones worth your time.",
  },
  {
    num: "03",
    title: "Evidence-grade output",
    body: "Every verdict carries the exact PO, invoice and store IDs, the amounts, and the reasoning — a one-read explanation a controller can act on.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="home-reveal max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-300/80">
            How it works
          </p>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
            Built like a controller, not a chatbot
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {CARDS.map((c) => (
            <div
              key={c.num}
              className="home-reveal rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-7"
            >
              <p className="font-mono text-xs text-amber-300/80">{c.num}</p>
              <h3 className="font-display mt-3 text-xl font-semibold text-white">{c.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
