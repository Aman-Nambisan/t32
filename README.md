# t32 — Atlan AI Hackathon

Team **t32** ("AI has SKILLS what do u have"). We're an AI agency; **McContext** (a 2,000-store
burger chain gone AI-native) is our client. We build agents for its back-office jobs, prove them on a
graded **bench**, and build a product + pitch around the **finance** one.

## The idea in one picture

```
 build agent.yaml + skills ─► chat / mock-bench LOCALLY (Claude subscription, free-ish)
        │                            edit → bench → compare, until it's good
        ▼
 make deploy ─► Claude Managed Agent (id + version) ─► platform bench (3 lives) ─► submit
                    spends the $50 CMA cap
```

**Why it's built this way:** the CMA workspace is capped at **$50**, so we iterate for free on the
subscription and spend the cap only on real bench runs. What you mock-bench locally is what you ship.

## Get started

Fastest path: open this repo in **Claude Code** and run **`/onboard`** — it checks your setup,
installs deps, verifies your subscription auth, and runs the worked example with you. Or manually:

```sh
make setup                          # uv venv + deps
claude setup-token                  # one-time: auth your Claude subscription (no API key)  [or: claude login]
make chat  AGENT=agents/drivethru   # play with the worked example
make bench AGENT=agents/drivethru SUITE=practice   # run the local mock bench
```

Then read **`AGENTS.md`** (rules + commands), **`docs/setup.md`** (team setup detail),
**`docs/challenges.md`** (the 4 problem statements and our strategy), and **`docs/tips.md`**.
Standing up an agent for a new brief? run **`/new-challenge`**.

## What's here

| Path | What it is |
|---|---|
| `agents/` | Our agents. `example/` = template, `drivethru/` = worked example, `finance/` = flagship (Penny), plus stubs for the other 3 challenges |
| `suites/` | Eval suites (cases + rubric). `_template/` to copy; `finance/` covers all 6 duties + adversarial (injection / authority-spoof) cases |
| `harness/` | Local loop on your subscription: `runner` (agent), `simulator`+`judge`+`bench` (mock bench), `checks` (deterministic finance verification), `models` (routing), `verify` (preflight) |
| `web/` | The **product** — "Don't Mess With Narmata" (Next.js 16): a 3D controller persona fronting Penny at `/`, and a live metrics dashboard at `/metrics`. Deploys to Railway |
| `deploy/` | `port.py` (`agent.yaml` → Claude Managed Agent) and `cma_smoke.py` (rare, deliberate platform smoke test — `make cma-check`) |
| `models.yaml` | Central model routing (one place). Now: agent `sonnet-4-6`, judge `sonnet-5`, simulator `sonnet-4-6`, subagents `haiku-4-5` |
| `traces/` | Local OTLP trace sink (HyperDX) for debugging agent behavior |
| `docs/` | Guides (`models`, `eval-guide`, `architecture`, `tips`, `challenges`), the decision log (`decisions/`), and the full cited research brief (`research/`) |

## The mock bench

`make bench SUITE=finance` runs each case through the **simulator** (plays the user, including
adversarial turns) → the **agent** (investigates the live data via the company MCP) → a **judge** (scores
the transcript + trace on the rubric axes). It runs in **review mode**: the harness blocks every
state-changing tool (`submit_*` and friends, matched by shape) so a local run can never write to the
graded store.

Beyond the judge, the finance suite adds **deterministic checks** (`harness/checks.py`) — grounding
(every cited figure traces to a real query result), structured-output, decision-consistency, and
retrieve-before-claim — an un-foolable signal alongside the LLM judge. Results save to `runs/*.json`
(plus a `_raw_*` checkpoint, so a crash never discards paid runs).

Knobs (optional, combine freely):

| Flag | Does |
|---|---|
| `COMPARE=runs/<f>.json` | per-case deltas (worst-case) vs a prior run |
| `CASE=<id>` | run a single case (cheap smoke) |
| `JOBS=4` | run N cases/repeats in parallel (capped to spare rate limits) |
| `REPEATS=3` | run each case N times → **worst-case + pass-rate** variance |
| `CONTINUE=runs/<f>.json` | re-run only that run's errored/short cases and merge (saves credits) |
| `MODEL=claude-…` | override the agent model for a cost/quality A/B |

Each run also reports **cost/latency** — est $/full pass against the $50 CMA cap, tokens, tool-calls,
wall time. Local scores are a *direction*, not the hidden bench number — see `docs/eval-guide.md`.

## Credentials (never commit)

- **Local dev + mock bench** → your **Claude subscription** (`claude setup-token`). No API key.
- **Deploy to the CMA** → your **participant Anthropic key** from 1Password → into the gitignored
  `.env` (`ANTHROPIC_API_KEY=`). Use *your* key, never the judge key.
- **Company MCP** (McContext data) → URL + token → `.env` (`MCCTX_MCP_URL` / `MCP_AUTH_TOKEN`),
  referenced from `agent.yaml`. Keep tokens out of committed files and out of chats.
- **Read-only Postgres** (the `world.*` data, for exploration + the product) → `.env` (`WORLD_DB_URL`).
  All three company creds are in the team DM; `make verify` checks them end-to-end.
