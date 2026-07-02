import Link from "next/link";

const CARDS = [
  {
    tag: "3D persona",
    title: "Talk to Narmata Tai",
    body: "A 3D animated controller fronting Penny — she speaks, she scolds, she switches Hinglish ↔ English mid-sentence and converts to ₹ crore when a number deserves the gravity.",
    cta: "Open the stage →",
  },
  {
    tag: "Generative evidence UI",
    title: "Answers that arrive assembled",
    body: "The model composes its replies as dashboards, evidence tables and timelines — not prose walls. When it's time to act, it drafts the formal legal notice or recovery email, exportable to DOCX and PDF.",
    cta: "See it compose →",
  },
  {
    tag: "Clearance-gated",
    title: "The Boardroom",
    body: "A PIN-gated CXO mode. Same agent, different clearance, different context — that's governance made visible, not a party trick. The PIN exists. Ask your CFO.",
    cta: "Knock politely →",
  },
];

export default function ProductRow() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="home-reveal max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-300/80">
            The product
          </p>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
            One agent. Three ways to meet it.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/60">
            The live product is running now — everything below links straight into it.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {CARDS.map((c) => (
            <Link
              key={c.title}
              href="/agents"
              className="home-reveal group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-amber-300/40 hover:bg-white/[0.05] md:p-7"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300/80">
                {c.tag}
              </p>
              <h3 className="font-display mt-3 text-xl font-semibold text-white">{c.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-white/60">{c.body}</p>
              <p className="mt-5 text-sm font-medium text-amber-200/80 transition-colors group-hover:text-amber-200">
                {c.cta}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
