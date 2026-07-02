import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 md:flex-row md:items-start md:justify-between md:px-8">
        <div>
          <p className="font-display text-lg font-bold tracking-tight text-amber-100">PENNY</p>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
            team t32 · &ldquo;AI has SKILLS what do u have&rdquo;
          </p>
          <p className="mt-1 text-xs text-white/40">Atlan AI Hackathon 2026</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-2 text-sm text-white/50">
          <Link href="/agents" className="transition-colors hover:text-white">
            Meet Narmata Tai
          </Link>
          <Link href="/metrics" className="transition-colors hover:text-white">
            Metrics
          </Link>
          <a
            href="https://github.com/Aman-Nambisan/t32"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-white"
          >
            GitHub
          </a>
          <a href="#demo-video" className="transition-colors hover:text-white">
            Demo video — placeholder
          </a>
        </nav>
      </div>
      <div className="border-t border-white/5">
        <p className="mx-auto max-w-6xl px-5 py-4 text-[11px] leading-relaxed text-white/30 md:px-8">
          Parody for the Atlan AI Hackathon · Not affiliated with any real official · Every figure,
          store and case on this page is simulated demo data.
        </p>
      </div>
    </footer>
  );
}
