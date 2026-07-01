# 0005 — Don't hardcode; lean on the model's intelligence + live data

**Decision.** Build Penny (and any agent) to **reason and read live**, not to hardcode answers,
values, or thresholds it can fetch. Prefer "read `fin_policy` / `fin_fee_schedule` and apply it" over
baking `$5 / 0.5% / 30%` into the prompt. Skills carry *how to think* and *where to look*, not frozen
facts the world owns.

**Context.** The challenge data is messy and seeded with decoys; the grade rewards investigation,
method, and generalization. Hardcoded values (a) go stale if the world's numbers differ from what we
saw, (b) likely score negatively as brittle/over-fit, and (c) waste the model's actual strength —
reasoning over real data. We want maximum retained intelligence and generalization.

**Consequences.**
- `agents/finance/skills/domain-notes` should frame thresholds/fee-schedules as "read these live; the
  numbers here are an orientation map, re-derive from the tools" — not as the source of truth. (Light
  pass done; a fuller generalization sweep of the prompts is a tracked follow-up.)
- Cases/suites must not encode expected answers; the agent earns the verdict by investigating.
- Review any prompt/skill for baked-in specifics before shipping — if the agent could look it up, it
  should. This is a standing review item, not a one-time cleanup.
