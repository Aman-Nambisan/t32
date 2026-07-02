# 0006 — A critic pass verifies Penny's flags before they're recorded

**Status.** Proposed (2026-07-02). Draft design; Tier 1 to implement first, Tier 2 gated on eval evidence.

**Decision.** Add an adversarial **critic** step that independently re-verifies every proposed finding
(flag / clear / cannot-conclude) *before* it becomes the recorded verdict. Ship it in two tiers:
- **Tier 1 (now):** an in-agent **self-critique pass** in Penny's workflow — zero orchestration, runs
  identically local and on CMA.
- **Tier 2 (if Tier 1 is not enough):** a **distinct critic subagent** on a different model, wired as a
  harness post-pass locally and a CMA `callable_agents` subagent via `deploy/port.py`.

**Context.** Our variance bench (`--repeats 3`) surfaced the exact failure a critic targets: **precision
leaks** — loss-prevention **over-flagged** (7 cashiers, no rule, low grounding) and settlement/COGS were
**flaky** (pass 0–33% across repeats). The challenge scores precision AND recall, and decoys punish the
trigger-happy — so a second, skeptical look at each flag is high leverage.

This is not a novel invention: Anthropic's own **Claude for Financial Services** ships a `gl-reconciler`
whose orchestrator "never reads counterparty documents directly … dispatches, aggregates, hands off,"
with a **`critic` subagent that independently re-verifies each break against trusted GL sources** before
a resolver records anything (reader → critic → resolver, Apache-2.0). We adapt that pattern to detection.
It also hardens our injection case: the critic re-verifies against **trusted `run_sql`**, so a verdict
driven by an instruction hidden in a data field gets overturned when it doesn't hold against the ledger.

## Design

### What the critic checks (per finding)
Given a finding + its evidence (the FINDINGS block from `domain-notes` + the `run_sql` trace), the critic
adopts a **refute-by-default** stance and returns `uphold | overturn | needs-evidence` with a one-line why:
1. **Arithmetic ties** — `variance_cents` matches `figures_cents`; it actually exceeds the *cited* threshold.
2. **Grounding** — every cited figure traces to a real query result (not derived/invented).
3. **Decoy test** — is this the *obvious-but-wrong* read? installment vs duplicate; within-tolerance price;
   `covers_date` timing; high-volume-but-normal cashier; a COGS swing with a price/mix explanation.
4. **Policy fit** — the flag/clear decision follows from the numbers and the live `fin_policy` threshold.
5. **Sufficiency** — enough evidence to conclude at all, else `cannot_conclude`.
A flag survives only if the critic upholds it; overturns downgrade to clear/cannot-conclude with the reason.

### Tier 1 — self-critique step (universal, no plumbing)
Add a mandatory closing step to Penny's `domain-notes`: *after* drafting FINDINGS, run a CRITIC pass over
each `flag` — try to refute it on the five points above; overturn any you cannot defend; only then finalize
and emit the FINDINGS block. Pros: works identically in the local runner and on CMA, ~free, immediately
measurable. Con: same-model blind spots (limited independence). This is the cheap first cut.

### Tier 2 — distinct critic subagent (stronger, gated)
A **different, cheap model** (diversity beats the agent second-guessing itself) verifies independently:
- **Model:** new `roles.critic` in `models.yaml`, default **`claude-haiku-4-5`** (cheap, different from the
  Sonnet-4.6 agent), prompted to refute. Escalate to Sonnet only on eval evidence (cost matters — a critic
  runs per finding).
- **Local:** `harness/critic.py` — takes `(findings, trace)`, runs the critic model per flag via
  `harness/_sdk.complete` (like the judge), returns verdicts. `bench.py` gains `--critic on|off` and applies
  overturns to the final findings *before* scoring, so the bench measures the real, post-critic outcome.
- **CMA:** `deploy/port.py` wires a `critic` subagent via preview `callable_agents`, mirroring
  `managed-agent-cookbooks/gl-reconciler/` (orchestrator + `subagents/critic.yaml`, `{file:}`-resolved).
  Penny dispatches each flag to the critic and records only upheld ones — the trust-boundary split
  (untrusted data parsed in isolation; verdicts re-verified against trusted `run_sql`).

### How we'll know it worked (A/B, local-first)
Run the bench **critic-off** (baseline) vs **critic-on** on the same cases with `--repeats 3`, and
`--compare`. Success = **cry-wolf down on the decoy/adversarial + loss-prevention cases** (fewer false
flags, higher pass-rate) **without** dropping recall on the real-leak duties (three-way-match, duplicate,
cash). Watch the cost delta — the critic adds calls; it must pay for itself in precision. If Tier 1 already
clears the bar, we skip Tier 2.

## Consequences
- **Precision/recall spine** gets a dedicated guard aimed at our measured weak spots; grounded in an
  Anthropic-validated pattern (credibility for the pitch, too).
- **Cost**: Tier 1 is ~free (one extra reasoning step); Tier 2 adds a per-flag critic call — kept cheap via
  Haiku + only critiquing *flags* (not every clear). Instrumented by the existing cost roll-up.
- **Complexity**: Tier 1 is a prompt change (low risk). Tier 2 adds `harness/critic.py` + a `port.py`
  subagent path (the `callable_agents` preview) — deferred until the eval says it's worth it.
- **Injection resistance** improves for free via re-verification against trusted queries.
- Attribution: pattern adapted from `anthropics/financial-services` (`gl-reconciler`, Apache-2.0).
