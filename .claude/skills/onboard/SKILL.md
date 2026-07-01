---
name: onboard
description: First-run setup + orientation for a t32 teammate. Gets them running the local harness on their own Claude subscription and oriented to the repo, the loop, and the $50 rule. Run this first in a fresh clone.
---

# /onboard — get a teammate running locally

You are onboarding a **team t32** member (Aman, Swapnil, or Karan) into this repo. Goal: they can run
the local mock bench on **their own Atlan Claude subscription** in a few minutes, and understand the
loop + the $50 rule + where things live. Be warm, crisp, and hands-on — actually run the checks and
commands (with their ok), don't just describe them. This repo is a dev tool; be transparent.

## Do this in order

**1. Welcome + frame (2 lines).**
> You're set up as an AI agency for McContext. We build agents, prove them on a bench, and iterate
> **locally on your own Claude subscription (free-ish)** — the CMA workspace is capped at **$50**, so
> we only deploy there to spot-check big pushes. Let's get you running locally.

**2. Check prereqs** (Bash, one command): report what's present/missing.
```sh
python3 --version; uv --version 2>/dev/null || echo "NO uv"; claude --version 2>/dev/null || echo "NO claude cli"; node --version 2>/dev/null || echo "no node (only needed to install the claude CLI)"
```
- Missing `uv` → `brew install uv` (or `curl -LsSf https://astral.sh/uv/install.sh | sh`).
- Missing `claude` → they likely have Claude Code already; if not, `npm install -g @anthropic-ai/claude-code`.

**3. Install deps** (with their ok): `make setup`. This makes `.venv`, installs deps, and copies
`.env.example` → `.env`. Confirm it succeeded.

**4. Verify auth by running one real case** — this is the moment of truth:
```sh
make bench AGENT=agents/drivethru SUITE=practice CASE=ordinary-meal
```
- A scores table = they're authenticated on their subscription and the whole loop works. Celebrate.
- **Auth error?** Walk them through it: run `claude setup-token` in *their* terminal, then
  `export CLAUDE_CODE_OAUTH_TOKEN=<token>` (offer the `! ` prefix so it runs in-session), or
  `claude login`. Never paste the token into chat. Then re-run the bench. (See `docs/setup.md`.)

**5. Show the loop** (the whole game):
> Edit an agent's `agent.yaml`/`skills/` → `make bench AGENT=… SUITE=…` → add `COMPARE=runs/<prev>.json`
> to see if your change helped → repeat. When a push is solid, `make deploy` (spends the $50 — announce
> it in the channel first). Try it: open `agents/drivethru/skills/menu/SKILL.md`, change a price, re-run
> the bench, watch it move.

**6. Orient — point, don't dump:**
- **Rules + commands:** `AGENTS.md` (read it). **Strategy + the 4 challenges:** `docs/challenges.md`.
- **Models (and cost):** `docs/models.md` + `models.yaml`. **How the bench works:** `docs/eval-guide.md`.
- **Why things are the way they are:** `docs/decisions/`. **Tips:** `docs/tips.md`.
- **Working rhythm (do this):** test locally after every change, commit often, post updates to
  `#hack-2026-t32` / the team DM — always announce a deploy.
- Their lane: finance is the flagship (product + pitch); each of us can own an agent+suite. Building a
  brand-new agent for tonight's brief? run **`/new-challenge`**.

**7. Close:** confirm they ran a green bench and know the loop. Hand off to `docs/challenges.md`.

## If they ask something
Answer from the repo (`AGENTS.md`, `docs/*`), briefly. Don't invent. Keep them moving toward a first
green bench — that's the win condition for onboarding.
