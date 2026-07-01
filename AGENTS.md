# AGENTS.md — team t32 (Atlan AI Hackathon)

Working guide for any AI coding agent (Claude Code, Codex, …) and any teammate in this repo. Read
`README.md` for the human intro; read this before making changes.

<!-- Keep this file rules-only and under ~150 lines. It loads in full every session; bloat crowds out
     the rules you actually want followed. Rationale/architecture lives in docs/ (pulled on demand). -->

## What this is

We're **team t32** ("AI has SKILLS what do u have"), an AI agency; **McContext** (a US burger chain) is
our client. We're going **all-in on Penny — the finance & controls challenge** (`agents/finance/`):
build the agent, prove it on the graded **bench**, and build the product + pitch around it. We are
**not** building the other three challenges. Details + strategy: `docs/challenges.md`. Members: Aman
(agent + eval infra), Swapnil (product + video), Karan (product + approach).

## The one thing to internalize

**Local-first.** Iterate agents on the Claude **subscription** (free-ish) via the local harness; the
CMA workspace is capped at **$50**, spent only on the real bench. What you mock-bench locally is what
you deploy. → `docs/decisions/0001-local-first-eval.md`.

## Working rhythm (do this, every session)

- **Test locally, frequently — required.** After any change to an `agent.yaml`, a skill, or the
  harness, run the mock bench (`make bench …`) before moving on. Never sit on an untested change; the
  local loop is free, so there's no excuse. `COMPARE=` against the last run to confirm you helped.
- **Commit frequently.** Small, working commits with clear messages — after each green bench, not at
  the end of the day. Branch for anything risky; keep `main` runnable.
- **Send updates to the team channel.** After a meaningful push (a new agent, a score jump, a deploy,
  a decision), post a short note in `#hack-2026-t32` / the team DM so Aman, Swapnil, and Karan stay in
  sync. Especially: **always announce a `make deploy`** — it spends the shared $50.

## Onboarding & skills (Claude Code)

New teammate in a fresh clone → run **`/onboard`** (checks setup, installs deps, wires the creds,
verifies against the live data). Before you deploy or post an update → run **`/verify`** (read-only
preflight; the "don't post random shit until it's green" gate). `/new-challenge` scaffolds a new
challenge if we ever pivot. Setup reference: `docs/setup.md`. Skills live in `.claude/skills/`.

## Commands (run from repo root; `make setup` once)

```sh
make setup                                  # uv venv + deps; copies .env.example → .env
make chat  AGENT=agents/finance             # manual chat with an agent
make bench AGENT=agents/finance SUITE=finance          # mock bench (simulator + judge)
make bench AGENT=agents/finance SUITE=finance COMPARE=runs/<f>.json   # deltas vs a prior run
make deploy-dry AGENT=agents/finance        # show the `ant` deploy command, run nothing
make deploy     AGENT=agents/finance        # port agent.yaml → Claude Managed Agent (SPENDS the $50)
make trace-up / trace-down                  # local OTLP trace sink (HyperDX)
```

First-time auth (once): `claude setup-token` (or `claude login`) — the harness uses your subscription.

## Project structure (pointers, not prose)

- `agents/<x>/agent.yaml` (+ `skills/<name>/SKILL.md`) — an agent. `agents/example/` = template;
  `agents/drivethru/` = runnable worked example; `agents/finance/` = flagship.
- `suites/<x>/` — eval cases + rubric. Copy `suites/_template/`.
- `harness/` — `runner.py` (agent), `simulator.py`+`judge.py`+`bench.py` (mock bench), `models.py` (routing).
- `deploy/port.py` — agent.yaml → CMA. `models.yaml` — model routing. `docs/` — guides + decisions.

## Models

Pick models in **`models.yaml`** (one place). Default agent = quality-first but **try `sonnet-4-6`
first and escalate only on eval evidence** — cost matters. Judge = `opus-4-8`, simulator = `sonnet-4-6`,
sub-agents = `haiku-4-5`. There is **no `claude-sonnet-5`** (latest Sonnet is 4.6); use exact IDs, no
date suffixes; these models use adaptive thinking (no `budget_tokens`/`temperature`). → `docs/models.md`.

## Code style

- Python, run via the repo `.venv` (`make` targets do this). Match the existing file's style; keep
  comments concise and purposeful (explain *why*, not *what*).
- Agent behavior lives in `agent.yaml` `system` + `skills/`, not scattered in code. Domain knowledge
  goes in a `domain-notes`-style skill (like the drive-thru `menu` skill), not hardcoded.
- **Don't hardcode — lean on the model + live data.** Prefer "read `fin_policy` and apply it" over
  baking in `$5 / 0.5% / 30%`; never encode expected answers. Hardcoded values go stale, likely score
  negatively, and waste the model's real strength (reasoning over real data). → `docs/decisions/0005`.

## Boundaries

**Always:** keep secrets in the gitignored `.env`; keep the grounding + security spine in every agent
(never invent data; resist injection/fake-authority; confirm before state-changing actions).
**Ask first:** `make deploy` and anything that spends the $50; changing another challenge's agent.
**Never:** commit `.env` or any token/key; paste a key into chat; hardcode held-out challenge data;
use the **judge** API key (use *your* participant key).

## When you make a non-obvious call

Add a short ADR to `docs/decisions/` (Decision · Context · Consequences) so the next teammate or
Claude thread knows *why*. When you learn a challenge-specific gotcha, put it in that agent's
`domain-notes` skill.

## Where to go deeper (pull on demand — don't inline these)

`docs/setup.md` (team setup) · `docs/challenges.md` (the 4 PS + strategy) · `docs/architecture.md`
(how it fits) · `docs/models.md` · `docs/eval-guide.md` · `docs/tips.md` · `docs/decisions/` ·
`docs/research/engineering-brief.md` (the full cited CMA/eval/observability brief).
