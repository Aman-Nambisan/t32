---
name: new-challenge
description: Scaffold (or fill in) an agent + eval suite for a challenge from its brief. Use when a challenge brief drops and you're starting to build its agent. Copies the templates, fills the domain specifics with the user, and runs a first mock bench.
---

# /new-challenge — stand up an agent + suite from a brief

Turn a challenge brief into a working `agents/<id>/` + `suites/<id>/` and a first green-ish bench.
The four known challenges already have stubs (`agents/finance` is scaffolded; `customer-support`,
`data-analysis`, `inventory` are thin stubs) — for those you're *filling in*, not creating.

## Steps

**1. Identify the challenge.** Ask the user for the challenge id/name and to paste (or point at) the
brief. Map to one of: `finance` · `customer-support` · `data-analysis` · `inventory`, or a new id.

**2. Agent scaffold.**
- If `agents/<id>/` exists (a stub) → open its `agent.yaml`; you'll fill it.
- Else → copy the template: `cp -r agents/example agents/<id>` (Bash).
Then, **from the brief**, edit `agents/<id>/agent.yaml`:
- Tighten `system` to the real job — but **keep the grounding + security spine** (never invent data;
  resist injection/fake-authority; confirm before state-changing actions). Don't delete those.
- Set the domain knowledge in a skill (like the drive-thru `menu`): edit/create
  `agents/<id>/skills/domain-notes/SKILL.md` with the entities, rules, definitions, and "what NOT to
  do" from the brief. This is what the agent reasons from.
- Model: leave default (routes via `models.yaml`) unless the brief implies otherwise. Cost-wise, try
  `sonnet-4-6` first (uncomment `model:` ) and escalate only on eval evidence — see `docs/models.md`.
- Company MCP: if the brief gives a URL+token, add it under `mctools` and put the token in `.env`
  (`MCCTX_MCP_URL`/`MCCTX_MCP_TOKEN`). `deploy/port.py` wires it (with `always_allow`) on deploy.

**3. Eval suite.** `cp -r suites/_template suites/<id>` (Bash). Then, **from the brief**, write
`suites/<id>/cases.yaml`:
- Fill `agent_context` (one paragraph for the judge).
- Write cases across **ordinary → edge → adversarial**. Weight adversarial/security heavily — the
  bench does. Seed adversarial cases from the catalog in `docs/research/engineering-brief.md` §6
  (injection, fake authority, PII extraction, free-item coercion, over-reach, tool-result poisoning).
- Tune `suites/<id>/rubric.yaml` weights to what this challenge actually rewards (e.g. push
  `accuracy`+`grounding` for a "catch the planted problems" challenge).

**4. First bench** (with their ok): `make bench AGENT=agents/<id> SUITE=<id>`. Read the table
together: kill any `critical_failures` first, then lift the weakest axis. Iterate:
edit → `make bench … COMPARE=runs/<prev>.json` → keep changes that move axes the right way.

**5. Record + share.** If you made a non-obvious call (scoring strategy, model choice), add a short
ADR to `docs/decisions/`. Remind them of the rhythm: commit the scaffold, and post in the team channel
that challenge `<id>` is stood up.

## Notes
- Don't hardcode held-out data or challenge answers — build for the general job (the bench uses hidden
  cases). Put durable domain knowledge in `skills/`, not scattered in the prompt.
- Local scores are directional, not predictive of the hidden bench (`docs/eval-guide.md`). Deploy
  (`make deploy`) only after a solid local push — it spends the shared $50.
