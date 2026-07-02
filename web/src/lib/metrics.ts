// Server-side loader for Penny's local eval results. Reads the newest runs/*.json produced by the
// mock bench (harness/bench.py) — the same file the CLI writes — and reshapes it for the /metrics
// dashboard. This is the "agent quality + cost" side of the dashboard (the $ -exposure side is live
// SQL, added separately). Runs on the server only (uses node:fs); never shipped to the browser.
import fs from "node:fs";
import path from "node:path";

export type CaseResult = {
  id: string;
  tags: string[];
  scoreMean: number;
  scoreWorst: number; // headline for a detection agent: right every time > right on average
  passRate: number; // fraction of repeats with zero critical + deterministic failures
  det: number | null; // deterministic-check score (grounding/structured/decision/retrieved)
  axes: Record<string, number>;
  criticalFailures: string[];
  toolCalls: number;
};

export type RunReport = {
  runId: string;
  agentModel: string;
  repeats: number;
  meanScore: number;
  worstMean: number;
  passRate: number;
  detMean: number | null;
  // cost is null on runs that predate cost instrumentation; the tile shows "pending" until a
  // cost-instrumented run lands, then back-fills with no code change.
  cost: {
    estCostUsd: number;
    inputTokens: number;
    outputTokens: number;
    toolCalls: number;
    durationMs: number;
  } | null;
  cases: CaseResult[];
  criticalFailures: string[];
};

// Repo-root runs/ lives one level up from web/. Override for deploy (where web/ is the root) via env.
const RUNS_DIR = process.env.METRICS_RUNS_DIR || path.join(process.cwd(), "..", "runs");

export function loadLatestRun(): RunReport | null {
  let files: string[];
  try {
    // Report files are timestamped (YYYYMMDD-…_*.json); exclude `_raw_*` checkpoints (raw arrays the
    // bench writes so a crash never loses paid runs — they'd otherwise sort last and get picked).
    files = fs.readdirSync(RUNS_DIR).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  } catch {
    return null; // no runs/ dir (e.g. fresh deploy) — the page renders an empty state
  }
  if (files.length === 0) return null;
  // Filenames are timestamped (YYYYMMDD-HHMMSS_…) so lexical sort = chronological; newest wins.
  files.sort();
  const latest = path.join(RUNS_DIR, files[files.length - 1]);

  let d: Record<string, unknown>;
  try {
    d = JSON.parse(fs.readFileSync(latest, "utf8"));
  } catch {
    return null;
  }

  const results = (d.results as Record<string, unknown>[]) || [];
  const cases: CaseResult[] = results.map((r) => {
    const verdict = (r.verdict as Record<string, unknown>) || {};
    const det = r.deterministic as Record<string, unknown> | null;
    return {
      id: String(r.id ?? "?"),
      tags: (r.tags as string[]) || [],
      scoreMean: num(r.score_mean, verdict.weighted),
      scoreWorst: num(r.score_worst, verdict.weighted),
      passRate: num(r.pass_rate),
      det: det && det.det_score != null ? Number(det.det_score) : null,
      axes: (verdict.axes as Record<string, number>) || {},
      criticalFailures: (verdict.critical_failures as string[]) || [],
      toolCalls: num(r.tool_calls),
    };
  });

  const c = d.cost as Record<string, unknown> | undefined;
  return {
    runId: String(d.run_id ?? ""),
    agentModel: String(d.agent_model ?? "?"),
    repeats: num(d.repeats, 1),
    meanScore: num(d.mean_score),
    worstMean: num(d.worst_mean, d.mean_score),
    passRate: num(d.pass_rate),
    detMean: d.det_mean != null ? Number(d.det_mean) : null,
    cost: c
      ? {
          estCostUsd: num(c.est_cost_usd),
          inputTokens: num(c.input_tokens),
          outputTokens: num(c.output_tokens),
          toolCalls: num(c.tool_calls),
          durationMs: num(c.duration_ms),
        }
      : null,
    cases,
    criticalFailures: (d.all_critical_failures as string[]) || [],
  };
}

function num(...vals: unknown[]): number {
  for (const v of vals) if (typeof v === "number" && !Number.isNaN(v)) return v;
  return 0;
}

// ---- derivations the dashboard uses -------------------------------------------------------------

export const axisMean = (cases: CaseResult[], axis: string): number | null => {
  const vals = cases.map((c) => c.axes[axis]).filter((v): v is number => typeof v === "number");
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};

export const dutyCases = (cases: CaseResult[]) => cases.filter((c) => c.tags.includes("duty"));

export const adversarialCases = (cases: CaseResult[]) =>
  cases.filter((c) => c.tags.includes("adversarial") || c.tags.includes("security"));

// Status band for a 0..1 metric (higher = better). Drives the fixed status palette + icon/label.
export type Status = "good" | "warning" | "serious" | "critical";
export const statusFor = (v: number | null): Status => {
  if (v == null) return "warning";
  if (v >= 0.85) return "good";
  if (v >= 0.7) return "warning";
  if (v >= 0.5) return "serious";
  return "critical";
};
