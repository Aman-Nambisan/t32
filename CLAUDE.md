# CLAUDE.md

@AGENTS.md

## Claude Code

The line above imports `AGENTS.md` — the single source of truth (rules, commands, structure,
boundaries). This section is Claude-Code-specific only. Don't duplicate `AGENTS.md` here.

- **Start here:** read `AGENTS.md`, then `docs/challenges.md` for what we're building. New to the
  agent loop? there's a runnable example at `agents/drivethru/` — `make chat AGENT=agents/drivethru`.
- **The loop:** edit `agents/<x>/agent.yaml` + `skills/` → `make bench AGENT=agents/<x> SUITE=<x>` →
  `COMPARE=` against the last run to see if it helped → when good, `make deploy` (spends the $50).
- **Models:** route in `models.yaml` (`harness/models.py resolve()`); try `sonnet-4-6` before
  `opus-4-8` on cost grounds and escalate only on eval evidence. `docs/models.md` has the lineup +
  the two API gotchas (adaptive thinking only; no `temperature`).
- **Local scores are directional, not predictive** of the hidden bench — tune to kill
  `critical_failures` and lift weak axes, not to game the number (`docs/eval-guide.md`).
- **Deploy details** (MCP `always_allow`, versioning, multiagent) and the full cited research are in
  `docs/architecture.md` and `docs/research/engineering-brief.md`.
- **Record decisions:** made a non-obvious call? add a short ADR under `docs/decisions/`.
- **Rhythm (see AGENTS.md → Working rhythm):** test locally after *every* change (required), commit
  frequently in small working commits, and post a short update to `#hack-2026-t32` / the team DM after
  a meaningful push — always announce a `make deploy` (it spends the shared $50).
