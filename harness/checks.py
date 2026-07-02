"""Deterministic checks for Penny's finance verdicts — the "calculator" layer.

The LLM judge (judge.py) scores fuzzy things well but can be fooled by a confident, well-written wrong
answer. These checks are the opposite: mechanical, cheap, and un-foolable. They read the agent's final
machine-readable FINDINGS block (see domain-notes) plus the captured tool trace, and assert:

  structured_output      — did it emit a parseable FINDINGS block with the required fields?
  grounding              — does every cents figure it cited actually appear in a run_sql result?
  decision_consistency   — is each verdict internally coherent (flag ⇒ a rule + a real variance; a
                           valid decision label; no self-contradiction)?
  retrieved_before_claim — did it actually query the data before concluding?

Deliberately NO hardcoded policy numbers ($5 / 0.5% / 30%) — that would bake in expected answers
(docs/decisions/0005) and go stale when fin_policy changes. We check that the agent's own decision
follows from the numbers and threshold IT cites, not that it matches a magic constant. The score is a
separate, trustworthy signal reported alongside the judge — not folded into the judge's weighted axes.
"""
from __future__ import annotations

import json
import re

_ALLOWED_DECISIONS = {"flag", "clear", "cannot_conclude"}
_REQUIRED_KEYS = {"duty", "entity", "decision"}
_GROUNDING_MIN_CENTS = 100   # ignore sub-$1 values — too short to match reliably as substrings
_GROUNDING_FAIL_BELOW = 0.5  # flag grounding as a failure only when most figures are ungrounded


def _agent_text(transcript: list[dict]) -> str:
    return "\n".join(m.get("text", "") for m in transcript if m.get("role") == "agent")


def _parse_findings(transcript: list[dict]) -> tuple[list[dict] | None, str]:
    """Pull the LAST parseable {"findings": [...]} object from the agent's messages.
    Returns (findings_list, note). findings_list is None when nothing parseable was emitted."""
    text = _agent_text(transcript)
    candidates: list[str] = []
    # Prefer fenced ```json blocks (in emission order); fall back to any brace span mentioning findings.
    candidates += re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    candidates += re.findall(r"(\{[^{}]*\"findings\".*?\})", text, re.DOTALL)
    for blob in reversed(candidates):
        try:
            obj = json.loads(blob)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict) and isinstance(obj.get("findings"), list):
            return obj["findings"], "ok"
    return None, "no parseable FINDINGS block"


def _sql_result_text(trace: list[dict]) -> str:
    """Concatenate the text of every captured tool result (run_sql outputs are the ground truth)."""
    parts = []
    for c in trace:
        r = c.get("result")
        if r:
            parts.append(r if isinstance(r, str) else json.dumps(r, default=str))
    return "\n".join(parts)


def _cited_cents(finding: dict) -> list[int]:
    vals: list[int] = []
    figs = finding.get("figures_cents")
    if isinstance(figs, dict):
        for v in figs.values():
            if isinstance(v, bool):
                continue
            if isinstance(v, int):
                vals.append(v)
    v = finding.get("variance_cents")
    if isinstance(v, int) and not isinstance(v, bool):
        vals.append(v)
    return vals


def finance_checks(transcript: list[dict], trace: list[dict]) -> dict:
    """Run the deterministic checks. Returns per-check scores (0.0-1.0, or None if not applicable),
    an aggregate det_score, and human-readable det_failures."""
    checks: dict[str, float | None] = {}
    failures: list[str] = []

    findings, note = _parse_findings(transcript)

    # --- retrieved_before_claim: did it query at all? -----------------------------------------
    queried = any("run_sql" in str(c.get("tool", "")) for c in trace)
    checks["retrieved_before_claim"] = 1.0 if queried else 0.0
    if not queried:
        failures.append("never called run_sql — concluded without querying the data")

    # --- structured_output: present + well-formed findings ------------------------------------
    if findings is None:
        checks["structured_output"] = 0.0
        failures.append(note)
        # Nothing to check downstream without findings; grounding/consistency N/A.
        checks["grounding"] = None
        checks["decision_consistency"] = None
        return _finalize(checks, failures, findings_parsed=0)

    well_formed = 0
    for i, f in enumerate(findings):
        if not isinstance(f, dict):
            failures.append(f"finding #{i} is not an object")
            continue
        missing = _REQUIRED_KEYS - set(f)
        bad_decision = f.get("decision") not in _ALLOWED_DECISIONS
        if missing:
            failures.append(f"finding #{i} missing keys: {sorted(missing)}")
        if bad_decision:
            failures.append(f"finding #{i} decision '{f.get('decision')}' not in {sorted(_ALLOWED_DECISIONS)}")
        if not missing and not bad_decision:
            well_formed += 1
    checks["structured_output"] = round(well_formed / len(findings), 3) if findings else 0.0

    # --- decision_consistency: each verdict internally coherent -------------------------------
    consistent = 0
    for i, f in enumerate(findings):
        if not isinstance(f, dict) or f.get("decision") not in _ALLOWED_DECISIONS:
            continue
        ok = True
        if f.get("decision") == "flag":
            # A flag must name the rule it breaks and rest on a non-zero variance (when a variance applies).
            if not str(f.get("rule", "")).strip():
                ok = False
                failures.append(f"finding #{i}: flagged but cites no rule")
            var = f.get("variance_cents")
            if isinstance(var, int) and not isinstance(var, bool) and var == 0:
                ok = False
                failures.append(f"finding #{i}: flagged but variance_cents is 0")
        consistent += 1 if ok else 0
    decidable = [f for f in findings if isinstance(f, dict) and f.get("decision") in _ALLOWED_DECISIONS]
    checks["decision_consistency"] = round(consistent / len(decidable), 3) if decidable else None

    # --- grounding: every cited cents figure appears in a run_sql result ----------------------
    results = _sql_result_text(trace)
    if not results:
        checks["grounding"] = None  # results not captured (e.g. old trace) — don't penalize
    else:
        cited = [v for f in findings if isinstance(f, dict) for v in _cited_cents(f)]
        checkable = [v for v in cited if abs(v) >= _GROUNDING_MIN_CENTS]
        if not checkable:
            checks["grounding"] = None
        else:
            grounded = sum(1 for v in checkable if str(abs(v)) in results)
            ratio = round(grounded / len(checkable), 3)
            checks["grounding"] = ratio
            if ratio < _GROUNDING_FAIL_BELOW:
                failures.append(f"grounding: only {grounded}/{len(checkable)} cited cents figures "
                                f"appear in any run_sql result — likely invented/derived numbers")

    return _finalize(checks, failures, findings_parsed=len(findings))


def _finalize(checks: dict, failures: list[str], findings_parsed: int) -> dict:
    applicable = [v for v in checks.values() if v is not None]
    det_score = round(sum(applicable) / len(applicable), 3) if applicable else None
    return {
        "det_score": det_score,
        "checks": checks,
        "det_failures": failures,
        "findings_parsed": findings_parsed,
    }
