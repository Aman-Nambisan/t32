"""The local mock bench — run an agent against a suite of cases, judge each, print + save scores.

    python -m harness.bench --agent agents/example --suite practice
    python -m harness.bench --agent agents/example --suite practice --case injection-free-shake
    python -m harness.bench --agent agents/example --suite practice --compare runs/<earlier>.json

For each case: the simulator drives a conversation against the agent (both on your Claude
subscription), then the judge scores the transcript + trace against the suite's rubric. Results are
printed as a table and saved to runs/ as JSON so you can diff across agent/prompt/skill versions.

This approximates the hackathon bench (simulator + judge). It is a *dev signal*, not the real score
— see docs/eval-guide.md. Runs sequentially by default to stay gentle on subscription rate limits.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import statistics
import sys

import yaml

from .checks import finance_checks
from .judge import DEFAULT_AXES, Judge
from .models import price, resolve
from .runner import REPO_ROOT, Conversation, load_agent
from .simulator import Simulator

RUNS_DIR = REPO_ROOT / "runs"

# Deterministic check-suites, opt-in per suite via cases.yaml `checks: <name>`. Extend as we add duties.
CHECK_SUITES = {"finance": finance_checks}


def _est_cost_usd(model: str, usage: dict) -> float | None:
    """Project the deployed per-run $ from this run's token counts × the models.yaml catalog price.
    Locally the run is free (subscription), but the tokens are the same shape a deployed CMA would
    burn — so this estimates what a full bench pass would cost against the $50 cap. Rough: cache
    tokens are lumped into input (cache-read is actually cheaper), so it's an upper-ish bound."""
    p = price(model)
    if not p:
        return None
    inp = ((usage.get("input_tokens") or 0) + (usage.get("cache_creation_input_tokens") or 0)
           + (usage.get("cache_read_input_tokens") or 0))
    outp = usage.get("output_tokens") or 0
    return round(inp / 1e6 * float(p.get("input", 0)) + outp / 1e6 * float(p.get("output", 0)), 4)


def _load_suite(suite: str) -> dict:
    base = REPO_ROOT / "suites" / suite
    cases = yaml.safe_load((base / "cases.yaml").read_text())
    rubric_path = base / "rubric.yaml"
    rubric = yaml.safe_load(rubric_path.read_text()) if rubric_path.is_file() else {}
    return {"cases_cfg": cases, "rubric": rubric}


def _run_case(agent_dir: str, case: dict, agent_context: str, judge: Judge,
              readonly: bool = True, model_override: str | None = None, checks_fn=None) -> dict:
    persona = case.get("persona", "A customer.")
    goal = case.get("goal", "Interact with the agent.")
    style = case.get("style", "Be a normal, reasonable customer.")
    max_turns = int(case.get("max_turns", 6))

    sim = Simulator(persona=persona, goal=goal, style=style,
                    model=resolve("simulator", case.get("sim_model")), max_turns=max_turns)
    conv = Conversation(agent_dir, readonly=readonly, model_override=model_override)
    try:
        user_turn = sim.opening()
        for _ in range(max_turns):
            conv.send(user_turn)
            if sim.done:
                break
            user_turn = sim.next(conv.transcript)
            if sim.done and user_turn:
                conv.send(user_turn)
                break
        transcript = conv.transcript
        trace = conv.tool_calls
        usage = conv.token_totals
    finally:
        conv.close()

    verdict = judge.score(
        agent_context=agent_context,
        case_context=f"id={case.get('id')} tags={case.get('tags', [])}\n{case.get('notes', '')}",
        case_intent=f"persona: {persona}\ngoal: {goal}\nstyle: {style}",
        transcript=transcript,
        trace=trace,
    )
    det = checks_fn(transcript, trace) if checks_fn else None
    return {
        "id": case.get("id"),
        "tags": case.get("tags", []),
        "turns": len(transcript),
        "tool_calls": len(trace),
        "usage": usage,
        "verdict": verdict,
        "deterministic": det,
        "transcript": transcript,
        "trace": trace,
    }


def _fnum(v) -> float:
    """Coerce a judge axis value to float — judges sometimes emit null/strings for an axis."""
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else 0.0


def _run_passed(run: dict) -> bool:
    """A run 'passes' iff it had no hard failures — nothing the judge flagged critical AND no
    deterministic-check failure. This is the unit of pass^k / pass-rate across repeats."""
    if run.get("verdict", {}).get("critical_failures"):
        return False
    if (run.get("deterministic") or {}).get("det_failures"):
        return False
    return True


def _rep_errored(rep: dict) -> bool:
    """True if a single repeat-run crashed (e.g. rate-limited) rather than producing a real verdict."""
    if any(str(c).startswith("case errored") for c in rep.get("verdict", {}).get("critical_failures", [])):
        return True
    return rep.get("tool_calls", 0) == 0 and not rep.get("deterministic")


def _incomplete(agg: dict, repeats: int) -> bool:
    """A prior case-aggregate needs re-running if it has fewer reps than asked for, or any rep errored.
    Used by --continue to re-run only the cases that failed, not the whole suite."""
    reps = agg.get("reps") or []
    if len(reps) < repeats:
        return True
    return any(_rep_errored(r) for r in reps)


def _aggregate(cid: str, tags: list, reps: list[dict]) -> dict:
    """Collapse N repeat-runs of one case into a variance-aware result. Headline numbers are the
    WORST run and the pass-rate — for a detection agent, 'right every time' beats 'right on average'
    (cma-mental-model §9b). Keeps the raw reps for drill-down."""
    if not reps:
        return {"id": cid, "tags": tags, "runs": 0, "score_mean": 0.0, "score_worst": 0.0,
                "score_stdev": 0.0, "pass_rate": 0.0,
                "verdict": {"axes": {}, "weighted": 0.0, "critical_failures": ["no runs"]},
                "deterministic": None, "turns": 0, "tool_calls": 0, "reps": []}
    scores = [r["verdict"].get("weighted", 0.0) for r in reps]
    dets = [r["deterministic"]["det_score"] for r in reps
            if r.get("deterministic") and r["deterministic"].get("det_score") is not None]
    axis_keys: set = set()
    for r in reps:
        axis_keys |= set((r["verdict"].get("axes") or {}).keys())
    mean_axes = {k: round(sum(_fnum((r["verdict"].get("axes") or {}).get(k)) for r in reps) / len(reps), 3)
                 for k in axis_keys}
    # A failure in ANY rep must surface — union the failure strings across reps, don't average them away.
    crit = sorted({c for r in reps for c in r["verdict"].get("critical_failures", [])})
    det_fail = sorted({c for r in reps for c in ((r.get("deterministic") or {}).get("det_failures") or [])})
    passes = sum(1 for r in reps if _run_passed(r))
    mean_score = round(sum(scores) / len(scores), 3)
    agg_det = None
    if dets:
        agg_det = {"det_score": round(sum(dets) / len(dets), 3), "det_worst": round(min(dets), 3),
                   "det_failures": det_fail}
    # Mean token/cost/latency per run — one "pass" over the suite = one run per case, so mean usage is
    # what the cost roll-up sums to project a full-pass CMA spend.
    usage_keys = ("input_tokens", "output_tokens", "cache_read_input_tokens",
                  "cache_creation_input_tokens", "cost_usd", "duration_ms")
    usage = {k: round(sum((r.get("usage", {}) or {}).get(k, 0) or 0 for r in reps) / len(reps), 3)
             for k in usage_keys}
    return {
        "id": cid, "tags": tags, "runs": len(reps),
        "score_mean": mean_score,
        "score_worst": round(min(scores), 3),
        "score_stdev": round(statistics.pstdev(scores), 3) if len(scores) > 1 else 0.0,
        "pass_rate": round(passes / len(reps), 3),
        # `verdict` carries the mean axes + unioned failures so existing consumers still work.
        "verdict": {"axes": mean_axes, "weighted": mean_score, "critical_failures": crit},
        "deterministic": agg_det,
        "usage": usage,
        "turns": round(sum(r.get("turns", 0) for r in reps) / len(reps)),
        "tool_calls": round(sum(r.get("tool_calls", 0) for r in reps) / len(reps)),
        "reps": reps,
    }


def _print_report(report: dict, baseline: dict | None) -> None:
    try:
        from rich.console import Console
        from rich.table import Table
    except ImportError:
        _print_report_plain(report, baseline)
        return

    console = Console()
    axes = list(report["axes_spec"].keys())
    base_by_id = {r["id"]: r for r in (baseline or {}).get("results", [])}

    table = Table(title=f"{report['agent']}  ×  suite:{report['suite']}   ({report['run_id']})",
                  show_lines=False)
    repeats = report.get("repeats", 1)
    table.add_column("case", style="cyan", no_wrap=True)
    for ax in axes:
        table.add_column(ax[:5], justify="right")
    table.add_column("mean", justify="right", style="bold")
    if repeats > 1:
        table.add_column("worst", justify="right", style="bold yellow")
        table.add_column("pass", justify="right")
    table.add_column("det", justify="right", style="magenta")
    table.add_column("Δ", justify="right")
    table.add_column("tc", justify="right")     # tool-calls (latency + cost proxy)
    table.add_column("$est", justify="right")   # projected per-case CMA cost
    table.add_column("crit", justify="left", style="red")

    model = report.get("agent_model", "")

    def _delta(cur: float, prev: float) -> str:
        d = cur - prev
        return f"[green]+{d:.2f}[/]" if d > 0.001 else (f"[red]{d:.2f}[/]" if d < -0.001 else "0")

    for r in report["results"]:
        v = r["verdict"]
        ax_cells = [f"{_fnum(v.get('axes', {}).get(a)):.2f}" for a in axes]
        worst = r.get("score_worst", v.get("weighted", 0.0))
        det = (r.get("deterministic") or {}).get("det_score")
        det_cell = f"{det:.2f}" if det is not None else "–"
        delta = ""
        if r["id"] in base_by_id:
            b = base_by_id[r["id"]]
            # Compare worst-case to worst-case (headline for detection); fall back for old-format baselines.
            delta = _delta(worst, b.get("score_worst", b["verdict"].get("weighted", 0.0)))
        crit = "; ".join(v.get("critical_failures", []))[:40]
        ec = _est_cost_usd(model, r.get("usage", {}))
        ec_cell = f"${ec:.4f}" if ec is not None else "-"
        row = [str(r["id"]), *ax_cells, f"{r.get('score_mean', v.get('weighted', 0.0)):.2f}"]
        if repeats > 1:
            pass_rate = r.get("pass_rate", 0.0)
            pass_style = "green" if pass_rate >= 0.999 else ("yellow" if pass_rate >= 0.5 else "red")
            row += [f"{worst:.2f}", f"[{pass_style}]{pass_rate*100:.0f}%[/]"]
        row += [det_cell, delta, str(r.get("tool_calls", "")), ec_cell, crit]
        table.add_row(*row)

    console.print(table)
    tag = f" (worst-case over {repeats} runs each)" if repeats > 1 else ""
    console.print(f"[bold]mean score:[/] {report['mean_score']:.3f}"
                  + (f"   (baseline {baseline['mean_score']:.3f}, "
                     f"Δ {report['mean_score'] - baseline['mean_score']:+.3f})" if baseline else ""))
    if repeats > 1:
        console.print(f"[bold yellow]mean worst-case:[/] {report['worst_mean']:.3f}"
                      + (f"   (baseline {baseline.get('worst_mean', 0):.3f}, "
                         f"Δ {report['worst_mean'] - baseline.get('worst_mean', 0):+.3f})"
                         if baseline and baseline.get('worst_mean') is not None else "") + tag)
        console.print(f"[bold]suite pass-rate:[/] {report['pass_rate']*100:.0f}%"
                      f"   [dim](fraction of the {repeats} runs/case with zero critical + det failures)[/]")
    if report.get("det_mean") is not None:
        console.print(f"[magenta bold]deterministic check mean:[/] {report['det_mean']:.3f}"
                      + (f"   (baseline {baseline['det_mean']:.3f}, "
                         f"Δ {report['det_mean'] - baseline['det_mean']:+.3f})"
                         if baseline and baseline.get('det_mean') is not None else "")
                      + "   [dim](grounding · structured-output · decision-consistency · retrieved)[/]")
    c = report.get("cost", {})
    cost_line = (f"[green bold]cost/efficiency:[/] {c.get('input_tokens', 0):,} in / {c.get('output_tokens', 0):,} out tok · "
                 f"~${c.get('est_cost_usd', 0):.4f} per full pass ({report.get('agent_model', '?')}) · "
                 f"{c.get('tool_calls', 0)} tool-calls · {c.get('duration_ms', 0) / 1000:.1f}s wall"
                 + (f"   [dim]($50 cap ≈ {int(50 / c['est_cost_usd'])} passes)[/]"
                    if c.get('est_cost_usd') else ""))
    if baseline and baseline.get("cost"):
        bc = baseline["cost"]
        cost_line += (f"   [dim](Δ ${c.get('est_cost_usd', 0) - bc.get('est_cost_usd', 0):+.4f}, "
                      f"{c.get('tool_calls', 0) - bc.get('tool_calls', 0):+d} tool-calls vs baseline)[/]")
    console.print(cost_line)
    if report["all_critical_failures"]:
        console.print(f"[red bold]critical failures across suite:[/] {len(report['all_critical_failures'])}")


def _print_report_plain(report: dict, baseline: dict | None) -> None:
    print(f"\n=== {report['agent']} × suite:{report['suite']} ({report['run_id']}) ===")
    model = report.get("agent_model", "")
    repeats = report.get("repeats", 1)
    for r in report["results"]:
        v = r["verdict"]
        det = (r.get("deterministic") or {}).get("det_score")
        det_str = f"{det:.2f}" if det is not None else "–"
        var = (f"  worst={r.get('score_worst', 0):.2f}  pass={r.get('pass_rate', 0)*100:.0f}%"
               if repeats > 1 else "")
        ec = _est_cost_usd(model, r.get("usage", {}))
        ec_s = f"${ec:.4f}" if ec is not None else "-"
        print(f"  {r['id']:<28} mean={r.get('score_mean', v.get('weighted', 0)):.2f}{var}  "
              f"det={det_str}  tc={r.get('tool_calls', 0)}  {ec_s}  crit={v.get('critical_failures', [])}")
    print(f"mean score: {report['mean_score']:.3f}")
    if repeats > 1:
        print(f"mean worst-case: {report['worst_mean']:.3f}   (over {repeats} runs/case)")
        print(f"suite pass-rate: {report['pass_rate']*100:.0f}%")
    if report.get("det_mean") is not None:
        print(f"deterministic check mean: {report['det_mean']:.3f}")
    c = report.get("cost", {})
    print(f"cost/efficiency: {c.get('input_tokens', 0):,} in / {c.get('output_tokens', 0):,} out tok · "
          f"~${c.get('est_cost_usd', 0):.4f}/full pass ({model}) · {c.get('tool_calls', 0)} tool-calls · "
          f"{c.get('duration_ms', 0) / 1000:.1f}s")
    if baseline:
        print(f"  baseline mean {baseline['mean_score']:.3f}  Δ {report['mean_score'] - baseline['mean_score']:+.3f}")


def run(agent_dir: str, suite: str, only_case: str | None = None,
        compare: str | None = None, allow_writes: bool = False, jobs: int = 1,
        repeats: int = 1, agent_model: str | None = None, continue_from: str | None = None) -> dict:
    readonly = not allow_writes
    print(f"[bench] mode: {'READ-ONLY (write/submit tools blocked)' if readonly else '⚠ WRITES ENABLED — action tools can write to the graded store'}")
    suite_data = _load_suite(suite)
    cases_cfg = suite_data["cases_cfg"]
    rubric_cfg = suite_data["rubric"]

    axes_spec = rubric_cfg.get("axes") or DEFAULT_AXES
    judge = Judge(axes=axes_spec, model=resolve("judge", rubric_cfg.get("model")))

    checks_name = cases_cfg.get("checks")
    checks_fn = CHECK_SUITES.get(checks_name) if checks_name else None
    if checks_name and not checks_fn:
        print(f"[bench] ⚠ unknown checks suite '{checks_name}' — deterministic checks skipped")
    elif checks_fn:
        print(f"[bench] deterministic checks: {checks_name}")

    model, system = load_agent(agent_dir, agent_model)
    print(f"[bench] agent model: {model}" + ("  (override via --agent-model)" if agent_model else ""))
    agent_context = cases_cfg.get("agent_context") or system[:800]

    cases = cases_cfg.get("cases", [])
    if only_case:
        cases = [c for c in cases if c.get("id") == only_case]
        if not cases:
            sys.exit(f"No case with id '{only_case}' in suite '{suite}'.")

    R = max(1, repeats)

    # --continue: load a prior run and re-run ONLY its incomplete (errored / short) cases, then merge.
    # Lets us finish a partially-rate-limited variance run without re-spending on the cases that passed.
    prior = None
    if continue_from:
        cp = pathlib.Path(continue_from)
        if not cp.is_absolute():
            cp = REPO_ROOT / continue_from
        prior = json.loads(cp.read_text())
        prior_by_id = {r["id"]: r for r in prior.get("results", [])}
        incomplete = [c.get("id") for c in cases
                      if _incomplete(prior_by_id.get(c.get("id"), {"reps": []}), R)]
        print(f"[bench] continue from {cp.name}: {len(incomplete)} incomplete case(s) to re-run "
              f"→ {incomplete}  (keeping {len(prior_by_id) - len(incomplete)} passed)")
        cases = [c for c in cases if c.get("id") in incomplete]

    n = len(cases)

    def _safe_run(item: tuple[int, dict, int]) -> tuple[int, dict]:
        """Run one case (one repeat); never raise — a failed run returns a scored-zero stub so the
        batch survives and the report still renders. Returns (case_index, result) for grouping."""
        i, case, rep = item
        cid = case.get("id")
        lbl = f"{i}/{n}" + (f" r{rep}/{R}" if R > 1 else "")
        try:
            print(f"[bench] → ({lbl}) start: {cid}")
            r = _run_case(agent_dir, case, agent_context, judge, readonly=readonly,
                          model_override=agent_model, checks_fn=checks_fn)
            print(f"[bench] ✓ ({lbl}) done:  {cid}  score={r['verdict'].get('weighted', 0):.2f}")
            return i, r
        except Exception as e:  # isolate: one bad run shouldn't kill the batch
            print(f"[bench] ✗ ({lbl}) FAILED: {cid} — {e}")
            return i, {"id": cid, "tags": case.get("tags", []), "turns": 0, "tool_calls": 0,
                       "usage": {}, "verdict": {"axes": {}, "weighted": 0.0,
                                   "critical_failures": [f"case errored: {e}"]},
                       "deterministic": None, "transcript": [], "trace": []}

    # Fan out cases × repeats as a flat work-list — repeats are just more independent runs through the
    # same capped pool. Variance across repeats surfaces flakiness a single shot hides (§9b).
    work = [(i, case, rep) for i, case in enumerate(cases, 1) for rep in range(1, R + 1)]
    if jobs and jobs > 1 and len(work) > 1:
        # Runs are independent (each Conversation owns its own event loop + agent subprocess + MCP
        # connection; the judge's complete() runs its own asyncio.run). Threads parallelize the I/O
        # wait. Cap concurrency: too many simultaneous runs hit subscription / MCP / DB rate limits.
        from concurrent.futures import ThreadPoolExecutor
        workers = min(jobs, len(work))
        print(f"[bench] running {n} cases × {R} repeat(s) = {len(work)} runs, up to {workers} in parallel")
        with ThreadPoolExecutor(max_workers=workers) as ex:
            indexed = list(ex.map(_safe_run, work))
    else:
        if R > 1:
            print(f"[bench] running {n} cases × {R} repeat(s) = {len(work)} runs, sequential")
        indexed = [_safe_run(item) for item in work]

    # Checkpoint the raw per-run results the instant the (expensive) agent runs finish — a bug in
    # aggregation/report below must never discard paid runs (learned the hard way). Overwritten each run.
    RUNS_DIR.mkdir(exist_ok=True)
    try:
        (RUNS_DIR / f"_raw_{pathlib.Path(agent_dir).name}_{suite}.json").write_text(
            json.dumps([r for _, r in indexed], indent=2, default=str))
    except Exception:
        pass

    # Group repeat-runs back by case (preserving case order), then collapse to variance-aware results.
    by_case: dict[int, list[dict]] = {}
    for i, r in indexed:
        by_case.setdefault(i, []).append(r)
    results = [_aggregate(case.get("id"), case.get("tags", []), by_case.get(i, []))
               for i, case in enumerate(cases, 1)]

    # --continue: splice the freshly re-run cases back into the prior run's results (prior order),
    # so the saved report is the complete variance baseline (passed cases + newly-fixed ones).
    if prior:
        merged = {r["id"]: r for r in prior.get("results", [])}
        for r in results:
            merged[r["id"]] = r
        order = [r["id"] for r in prior.get("results", [])]
        order += [rid for rid in (r["id"] for r in results) if rid not in order]
        results = [merged[i] for i in order]

    mean_score = round(sum(r["score_mean"] for r in results) / len(results), 3) if results else 0.0
    worst_mean = round(sum(r["score_worst"] for r in results) / len(results), 3) if results else 0.0
    pass_rate = round(sum(r["pass_rate"] for r in results) / len(results), 3) if results else 0.0
    all_crit = [f"{r['id']}: {c}" for r in results for c in r["verdict"].get("critical_failures", [])]
    all_crit += [f"{r['id']}: {c}" for r in results
                 for c in ((r.get("deterministic") or {}).get("det_failures") or [])]
    det_scores = [r["deterministic"]["det_score"] for r in results
                  if r.get("deterministic") and r["deterministic"].get("det_score") is not None]
    det_mean = round(sum(det_scores) / len(det_scores), 3) if det_scores else None

    # cost / efficiency roll-up — the bench scores latency + cost, so we surface them explicitly
    def _sum(key):
        return sum((r.get("usage", {}).get(key) or 0) for r in results)
    cost = {
        "input_tokens": _sum("input_tokens"),
        "output_tokens": _sum("output_tokens"),
        "cache_read_input_tokens": _sum("cache_read_input_tokens"),
        "cache_creation_input_tokens": _sum("cache_creation_input_tokens"),
        "tool_calls": sum(r["tool_calls"] for r in results),
        "duration_ms": _sum("duration_ms"),
        "sdk_cost_usd": round(_sum("cost_usd"), 6),
        "est_cost_usd": round(sum(_est_cost_usd(model, r.get("usage", {})) or 0 for r in results), 4),
    }

    run_id = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    report = {
        "run_id": run_id,
        "agent": agent_dir,
        "agent_model": model,
        "suite": suite,
        "repeats": R,
        "axes_spec": axes_spec,
        "mean_score": mean_score,
        "worst_mean": worst_mean,
        "pass_rate": pass_rate,
        "det_mean": det_mean,
        "cost": cost,
        "all_critical_failures": all_crit,
        "results": results,
    }

    RUNS_DIR.mkdir(exist_ok=True)
    out = RUNS_DIR / f"{run_id}_{pathlib.Path(agent_dir).name}_{suite}.json"
    out.write_text(json.dumps(report, indent=2, default=str))

    baseline = None
    if compare:
        cp = pathlib.Path(compare)
        if not cp.is_absolute():
            cp = REPO_ROOT / compare
        if cp.is_file():
            baseline = json.loads(cp.read_text())

    _print_report(report, baseline)
    print(f"[bench] saved → {out.relative_to(REPO_ROOT)}")
    return report


def main():
    ap = argparse.ArgumentParser(description="Local mock bench: simulator + judge over a case suite.")
    ap.add_argument("--agent", required=True, help="path to an agent folder (has agent.yaml), e.g. agents/example")
    ap.add_argument("--suite", required=True, help="suite name under suites/, e.g. practice")
    ap.add_argument("--case", default=None, help="run only this case id")
    ap.add_argument("--compare", default=None, help="path to a prior runs/*.json to show deltas against")
    ap.add_argument("--allow-writes", action="store_true",
                    help="DANGER: let the agent call submit_*/action tools (writes to the graded store). "
                         "Default is read-only. Only use when you deliberately want to test real submission.")
    ap.add_argument("--jobs", type=int, default=1,
                    help="run up to N runs in parallel (default 1 = sequential). Each run is an "
                         "independent agent+judge run; keep modest (3-4) to avoid subscription/MCP rate limits.")
    ap.add_argument("--repeats", type=int, default=1,
                    help="run each case N times to measure variance (default 1). Reports worst-case + "
                         "pass-rate across repeats — 'right every time' beats 'right on average' (§9b).")
    ap.add_argument("--agent-model", default=None,
                    help="override the agent model (e.g. claude-sonnet-4-6) for a cost/quality A/B "
                         "without editing agent.yaml")
    ap.add_argument("--continue", dest="continue_from", default=None,
                    help="path to a prior runs/*.json: re-run ONLY its incomplete (errored/short) cases "
                         "and merge into a fresh complete report. Saves credits after a partial run.")
    args = ap.parse_args()
    run(args.agent.rstrip("/"), args.suite, args.case, args.compare,
        allow_writes=args.allow_writes, jobs=args.jobs, repeats=args.repeats,
        agent_model=args.agent_model, continue_from=args.continue_from)


if __name__ == "__main__":
    main()
