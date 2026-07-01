# 0002 — Central model routing; not Opus-only

**Decision.** Route every role (agent / simulator / judge / subagent) through one `models.yaml` via
`harness/models.py`. Default the deployed **agent** to the cheapest model that holds up (start
sonnet-4-6, escalate on evidence), keep the **judge** sharp (opus-4-8), run the **simulator** fast
(sonnet-4-6), and delegate small subtasks to **haiku-4-5**. Precedence: explicit > role default >
fallback.

**Context.** We are not locked to Opus, and cost matters ($50 cap). The lineup: fable-5 ($10/$50),
opus-4-8 ($5/$25), sonnet-4-6 ($3/$15), haiku-4-5 ($1/$5) — all 1M context except Haiku (200K).
Different roles have different quality bars, and only the *deployed agent* actually spends the $50
(simulator/judge run free on the subscription). We also want one-edit global swaps as new models land.

**Consequences.**
- Swap a role globally in `models.yaml`; override per agent/suite/case where needed.
- Agent model choice is an **eval-driven** decision, not a default — don't pay for Opus on faith
  (`docs/models.md`).
- Enables the multi-agent pattern: an opus/sonnet coordinator spawning cheap haiku sub-agents.
- There is no `claude-sonnet-5` — latest Sonnet is `claude-sonnet-4-6`. Use exact IDs, no date suffixes.
