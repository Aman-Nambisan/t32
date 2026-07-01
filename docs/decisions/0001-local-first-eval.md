# 0001 — Local-first eval loop

**Decision.** Build the whole iterate loop — agents + a mock bench (simulator + judge) — to run
locally on the Claude **subscription**, and treat the deployed CMA purely as validation. Spend the
$50 CMA budget only on real bench runs, not on exploration.

**Context.** The `hack-2026-t32` workspace is capped at **$50** (organizers, confirmed in Slack:
*"$50 is just for Claude-managed agents; do most dev locally using the Agent SDK powered by your
Claude Code login"*). The real bench is a simulator agent + judge agent over held-out cases, 3 lives
per challenge. Burning budget to find out a prompt regressed is the expensive failure mode.

**Consequences.**
- We can iterate as much as we want for free; the mock bench (`harness/`) mirrors the real one
  (simulator + judge, same axes) so local signal is meaningful.
- Local scores are **directional, not predictive** — the real rubric/cases/judge are hidden. We tune
  to kill critical failures and lift weak axes, not to game the local number (see `docs/eval-guide.md`).
- Deploy is a deliberate, validated step (`make deploy`), not part of the inner loop.
