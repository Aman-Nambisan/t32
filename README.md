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
| `agents/` | Our agents. `example/` = template, `drivethru/` = worked example, `finance/` = flagship, plus stubs for the other 3 challenges |
| `suites/` | Eval suites (cases + rubric). `_template/` to copy; `practice/` is worked |
| `harness/` | Local loop: run an agent, and the mock bench (simulator + judge) — on your subscription |
| `deploy/port.py` | One command: `agent.yaml` → Claude Managed Agent |
| `models.yaml` | Central model routing (swap models in one place) |
| `traces/` | Local OTLP trace sink (HyperDX) for debugging agent behavior |
| `docs/` | Guides (`models`, `eval-guide`, `architecture`, `tips`, `challenges`), the decision log (`decisions/`), and the full cited research brief (`research/`) |

## Credentials (never commit)

- **Local dev + mock bench** → your **Claude subscription** (`claude setup-token`). No API key.
- **Deploy to the CMA** → your **participant Anthropic key** from 1Password → into the gitignored
  `.env` (`ANTHROPIC_API_KEY=`). Use *your* key, never the judge key.
- **Company MCP** (McContext data) → URL + token → `.env` (`MCCTX_MCP_URL` / `MCCTX_MCP_TOKEN`),
  referenced from `agent.yaml`. Keep tokens out of committed files and out of chats.
