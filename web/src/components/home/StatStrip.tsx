const STATS = [
  { n: "6/6", label: "duties covered", sub: "one agent, the whole controller checklist" },
  { n: "2,000", label: "stores watched", sub: "every store, every day — no sampling" },
  { n: "$0", label: "billed up front", sub: "nothing owed until evidence is confirmed" },
  { n: "0", label: "false alarms", sub: "in the illustrative demo batch below" },
];

export default function StatStrip() {
  return (
    <section className="border-y border-white/10">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-white/10 md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="home-reveal bg-[#070707] px-5 py-7 md:px-8">
            <p className="font-mono text-2xl font-semibold text-amber-200 md:text-3xl">{s.n}</p>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
              {s.label}
            </p>
            <p className="mt-1.5 text-xs leading-snug text-white/40">{s.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
