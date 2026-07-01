---
name: onboard
description: First-run setup + orientation for a t32 teammate. Gets them running the finance (Penny) agent locally on their own Claude subscription, wired to the live company data, and oriented to the loop, the review-mode safety, and the $50 rule. Run this first in a fresh clone.
---

# /onboard — get a teammate running on Penny

You are onboarding a **team t32** member (Aman, Swapnil, or Karan). We're all-in on **Penny** (the
finance & controls challenge). Goal: they can run the finance agent locally against the live data on
**their own Claude subscription** in a few minutes, and understand the loop, the review-mode safety,
and the $50 rule. Be warm, crisp, hands-on — actually run the checks (with their ok), don't just
describe them. This is a dev tool; be transparent.

## Do this in order

**1. Welcome + frame (2 lines).**
> We're an AI agency; our client is McContext. We're going deep on **Penny** — the finance detection
> agent — and building the product + pitch around it. You iterate **locally on your own Claude
> subscription (free-ish)**; the $50 CMA workspace is only for the occasional platform check.

**2. Prereqs** (Bash): `python3 --version; uv --version 2>/dev/null || echo NO-uv; claude --version 2>/dev/null || echo NO-claude`.
- Missing `uv` → `brew install uv`. Missing `claude` → they likely have Claude Code; else `npm install -g @anthropic-ai/claude-code`.

**3. Install:** `make setup` (creates `.venv`, installs deps, copies `.env.example` → `.env`). Confirm it succeeded.

**4. Creds — the one manual step.** The finance agent needs three values in the gitignored `.env`,
shared in the **team DM** (`#hack-2026-t32` team channel / our group DM):
- `MCCTX_MCP_URL` and `MCP_AUTH_TOKEN` — the company MCP (read + action tools).
- `WORLD_DB_URL` — the read-only Postgres (the `world.*` data).
Have them paste those into `.env`. (Never commit `.env`; never paste creds into chat.) Auth for the
agent itself is their Claude subscription — if step 5 hits an auth error, run `claude setup-token`
(or `claude login`).

**5. Verify against the live data** — the moment of truth (read-only, safe):
```sh
make verify
```
It checks creds + Postgres (`world.*`) + a real `run_sql` round-trip through the finance agent + MCP.
**PASS** = they're fully set up on live data. **FAIL** = fix what's red (usually a missing cred or
subscription auth). This is also the "don't post/deploy until green" gate — see `/verify`.

**6. Show the loop** (the whole game):
> Edit `agents/finance/agent.yaml` or its `skills/` (esp. `domain-notes`) → `make bench SUITE=finance`
> → add `COMPARE=runs/<prev>.json` to see if your change helped → repeat. The mock bench runs in
> **review mode**: the agent investigates via `run_sql` and proposes verdicts, but the harness
> **blocks the `submit_*` action tools** so local runs never touch the graded store. When the bench
> opens, `make deploy` ships to CMA (spends the $50 — announce it first).

**7. Orient — point, don't dump:**
- **The challenge + strategy:** `docs/challenges.md` (Penny; 6 duties; precision + recall; the two
  lanes — agent + product/video; deadlines). **Rules + commands:** `AGENTS.md`.
- **The agent:** `agents/finance/` — `system` + `house-rules` + `domain-notes` skills. Domain knowledge
  and *how to run each duty* live in `domain-notes` (read `fin_policy` live — **we don't hardcode**).
- **How eval works + the score caveat:** `docs/eval-guide.md`. **Models + cost:** `docs/models.md`.
- **Rhythm (do this):** test locally after every change, commit often, post updates to the team DM,
  and **`/verify` before you deploy or post**.
- **⚠️ Mind the CMA credits — they're scored.** Under $50 = **+5**, $50–100 = **0**, over $100 = **−5**.
  Every CMA session/bench run spends real credits, so do **essentially all work locally** (free) and
  touch the platform only rarely and deliberately (`/cma-check`, or the real bench when it opens).
  Never run CMA things casually. When in doubt, iterate with `make bench SUITE=finance`.
- **Fine-tuning Penny** (Swapnil): iterate the `system` prompt + `domain-notes`, run `make bench
  SUITE=finance`, and use Claude to research finance-controls patterns to sharpen the duties. Keep it
  general — don't hardcode answers or values (`docs/decisions/0005`).

**8. Close:** confirm they got a green `make verify` and know the loop. Hand off to `docs/challenges.md`.

## If they ask something
Answer from the repo (`AGENTS.md`, `docs/*`, `agents/finance/`), briefly. Don't invent. Keep them
moving toward a green `make verify` — that's the win condition for onboarding.
