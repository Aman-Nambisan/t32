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
import sys

import yaml

from .judge import DEFAULT_AXES, Judge
from .models import price, resolve
from .runner import REPO_ROOT, Conversation, load_agent
from .simulator import Simulator

RUNS_DIR = REPO_ROOT / "runs"


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
              readonly: bool = True, model_override: str | None = None) -> dict:
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
    return {
        "id": case.get("id"),
        "tags": case.get("tags", []),
        "turns": len(transcript),
        "tool_calls": len(trace),
        "usage": usage,
        "verdict": verdict,
        "transcript": transcript,
        "trace": trace,
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
    table.add_column("case", style="cyan", no_wrap=True)
    for ax in axes:
        table.add_column(ax[:5], justify="right")
    table.add_column("score", justify="right", style="bold")
    table.add_column("Δ", justify="right")
    table.add_column("tc", justify="right")     # tool-calls (latency + cost proxy)
    table.add_column("$est", justify="right")   # projected per-case CMA cost
    table.add_column("crit", justify="left", style="red")

    model = report.get("agent_model", "")
    for r in report["results"]:
        v = r["verdict"]
        ax_cells = [f"{float(v.get('axes', {}).get(a, 0)):.2f}" for a in axes]
        score = v.get("weighted", 0.0)
        delta = ""
        if r["id"] in base_by_id:
            prev = base_by_id[r["id"]]["verdict"].get("weighted", 0.0)
            d = score - prev
            delta = f"[green]+{d:.2f}[/]" if d > 0.001 else (f"[red]{d:.2f}[/]" if d < -0.001 else "0")
        crit = "; ".join(v.get("critical_failures", []))[:40]
        ec = _est_cost_usd(model, r.get("usage", {}))
        table.add_row(str(r["id"]), *ax_cells, f"{score:.2f}", delta,
                      str(r.get("tool_calls", "")), f"${ec:.4f}" if ec is not None else "-", crit)

    console.print(table)
    console.print(f"[bold]mean weighted score:[/] {report['mean_score']:.3f}"
                  + (f"   (baseline {baseline['mean_score']:.3f}, "
                     f"Δ {report['mean_score'] - baseline['mean_score']:+.3f})" if baseline else ""))
    c = report.get("cost", {})
    cost_line = (f"[bold]cost/efficiency:[/] {c.get('input_tokens', 0):,} in / {c.get('output_tokens', 0):,} out tok · "
                 f"~${c.get('est_cost_usd', 0):.4f} per full pass ({report.get('agent_model', '?')}) · "
                 f"{c.get('tool_calls', 0)} tool-calls · {c.get('duration_ms', 0) / 1000:.1f}s wall")
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
    for r in report["results"]:
        v = r["verdict"]
        ec = _est_cost_usd(model, r.get("usage", {}))
        ec_s = f"${ec:.4f}" if ec is not None else "-"
        print(f"  {r['id']:<28} score={v.get('weighted', 0):.2f}  tc={r.get('tool_calls', 0)}  "
              f"{ec_s}  crit={v.get('critical_failures', [])}")
    print(f"mean weighted score: {report['mean_score']:.3f}")
    c = report.get("cost", {})
    print(f"cost/efficiency: {c.get('input_tokens', 0):,} in / {c.get('output_tokens', 0):,} out tok · "
          f"~${c.get('est_cost_usd', 0):.4f}/full pass ({model}) · {c.get('tool_calls', 0)} tool-calls · "
          f"{c.get('duration_ms', 0) / 1000:.1f}s")
    if baseline:
        print(f"  baseline {baseline['mean_score']:.3f}  Δ {report['mean_score'] - baseline['mean_score']:+.3f}")


def run(agent_dir: str, suite: str, only_case: str | None = None,
        compare: str | None = None, allow_writes: bool = False,
        agent_model: str | None = None) -> dict:
    readonly = not allow_writes
    print(f"[bench] mode: {'READ-ONLY (write/submit tools blocked)' if readonly else '⚠ WRITES ENABLED — action tools can write to the graded store'}")
    suite_data = _load_suite(suite)
    cases_cfg = suite_data["cases_cfg"]
    rubric_cfg = suite_data["rubric"]

    axes_spec = rubric_cfg.get("axes") or DEFAULT_AXES
    judge = Judge(axes=axes_spec, model=resolve("judge", rubric_cfg.get("model")))

    model, system = load_agent(agent_dir, agent_model)
    print(f"[bench] agent model: {model}"
          + (f"  (override via --agent-model)" if agent_model else ""))
    agent_context = cases_cfg.get("agent_context") or system[:800]

    cases = cases_cfg.get("cases", [])
    if only_case:
        cases = [c for c in cases if c.get("id") == only_case]
        if not cases:
            sys.exit(f"No case with id '{only_case}' in suite '{suite}'.")

    results = []
    for i, case in enumerate(cases, 1):
        print(f"[bench] ({i}/{len(cases)}) running case: {case.get('id')} …")
        try:
            results.append(_run_case(agent_dir, case, agent_context, judge,
                                     readonly=readonly, model_override=agent_model))
        except Exception as e:
            # A transient SDK/rate-limit error on ONE case shouldn't discard the whole run's work —
            # record it as a failed case (score 0, flagged) and keep going so we still get a report.
            print(f"[bench] ⚠ case {case.get('id')} errored ({type(e).__name__}: {str(e)[:120]}) — "
                  f"recording as failed, continuing")
            results.append({
                "id": case.get("id"), "tags": case.get("tags", []), "turns": 0, "tool_calls": 0,
                "usage": {}, "transcript": [], "trace": [],
                "verdict": {"axes": {}, "weighted": 0.0,
                            "critical_failures": [f"case errored: {type(e).__name__}"]},
            })

    scores = [r["verdict"].get("weighted", 0.0) for r in results]
    mean_score = round(sum(scores) / len(scores), 3) if scores else 0.0
    all_crit = [f"{r['id']}: {c}" for r in results for c in r["verdict"].get("critical_failures", [])]

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
        "axes_spec": axes_spec,
        "mean_score": mean_score,
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
    ap.add_argument("--agent-model", default=None,
                    help="override the agent model (e.g. claude-sonnet-4-6) for a cost/quality A/B "
                         "without editing agent.yaml")
    args = ap.parse_args()
    run(args.agent.rstrip("/"), args.suite, args.case, args.compare,
        allow_writes=args.allow_writes, agent_model=args.agent_model)


if __name__ == "__main__":
    main()
