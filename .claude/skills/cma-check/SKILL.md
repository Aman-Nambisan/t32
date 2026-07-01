---
name: cma-check
description: RARE, deliberate one-off smoke test that our deployed agent runs on the Claude Managed Agents platform. SPENDS CMA CREDITS — do not run routinely. Use only to confirm the platform path after a major change, mindful of the credit budget.
---

# /cma-check — confirm the platform path (spends credits, use rarely)

⚠️ **This spends CMA credits, and credits are scored:** under $50 = **+5**, $50–100 = **0**, over $100
= **−5** (Shubhankar, #atlan-ai-hackathon-2026). So this is a **rare, deliberate** check — NOT a
routine or scheduled thing. Local iteration is free (`make bench SUITE=finance`); do essentially all
work there. Only reach for this to confirm the platform can still run our agent after a big change,
and stay well under $50.

## Before running — gate it

1. Confirm with the user that they want to spend credits on a platform check right now. If not, stop.
2. Run **`/verify`** first (free, read-only) — if the local path is broken, fix that before spending
   anything on CMA.
3. Ensure `ANTHROPIC_API_KEY` (participant key) is in `.env`, and `ant` is installed
   (`brew install anthropics/tap/ant`).

## Run it (once)

```sh
make cma-check CONFIRM=1        # defaults to agents/finance
```

It deploys the latest agent (cheap config write), creates **one** session, sends **one tool-free**
message (no `run_sql`, no `submit_*` — so it needs no MCP/vault and never touches the graded store),
prints the agent's reply, then archives the session. A reply back = the platform path works.

## Interpret

- **Reply captured + "Platform path works"** → good; the deployed agent runs on CMA. Note the spend.
- **No reply / error** → open the printed Console session link and inspect. Don't retry blindly (each
  attempt costs) — diagnose first.

## After

Post a one-line note in the team DM that the platform check passed (or what broke) and roughly what it
cost, so the team tracks the budget. Then go back to local iteration.

> Full data runs on CMA (with the company MCP + a vault for the token) are a separate, heavier step —
> not part of this smoke. See docs/architecture.md §deploy and the research brief §8.
