const VIDEOS = [
  "Product walkthrough (10 min) — link coming",
  "Boardroom demo — link coming",
  "Bench run trace — link coming",
];

export default function DemoVideos() {
  return (
    <section id="demo-video" className="scroll-mt-20 border-t border-white/10">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="home-reveal max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-300/80">
            Demo videos
          </p>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
            Watch it work
          </h2>
        </div>
        {/* PASTE REAL VIDEO LINKS HERE: swap each href="#" for the published
            URL and drop the aria-disabled attribute. */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VIDEOS.map((caption) => (
            <a key={caption} href="#" aria-disabled="true" className="home-reveal group block">
              <span className="flex aspect-video items-center justify-center rounded-xl border border-white/10 bg-[radial-gradient(ellipse_at_center,rgba(252,211,77,0.05),rgba(255,255,255,0.02))] transition-colors group-hover:border-amber-300/40">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-white/5 pl-1 text-xl text-white/70 transition-colors group-hover:border-amber-300/60 group-hover:text-amber-200">
                  ▶
                </span>
              </span>
              <span className="mt-3 block font-mono text-[11px] uppercase tracking-[0.15em] text-white/45">
                {caption}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
