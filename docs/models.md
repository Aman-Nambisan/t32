# Models — lineup, routing, and cost

## Where models are set

**`models.yaml`** at the repo root is the one place to pick models. Everything resolves through
`harness/models.py` → `resolve(role, explicit)` with this precedence:

```
explicit setting  >  models.yaml role default  >  fallback (claude-opus-4-8)
```

- **agent** — `agents/<x>/agent.yaml` `model:` wins, else `roles.agent`.
- **judge** — `suites/<x>/rubric.yaml` `model:` wins, else `roles.judge`.
- **simulator** — a case's `sim_model:` wins, else `roles.simulator`.
- **subagent** — for multi-agent CMAs that delegate subtasks (`roles.subagent`).

Swap a role globally by editing `models.yaml`. Override one agent/suite/case by setting it there.

## Current lineup (verified against the Anthropic catalog, 2026-06)

| Model | ID | Context | $/1M in | $/1M out | Use it for |
|---|---|---|---:|---:|---|
| Fable 5 | `claude-fable-5` | 1M | $10 | $50 | The hardest long-horizon reasoning only — priciest |
| **Opus 4.8** | `claude-opus-4-8` | 1M | $5 | $25 | Quality-critical: the **judge**, tough agents |
| **Sonnet 4.6** | `claude-sonnet-4-6` | 1M | $3 | $15 | Best balance: **simulator**, most agents |
| **Haiku 4.5** | `claude-haiku-4-5` | 200K | $1 | $5 | Cheap/fast: simple subtasks, routers, **sub-agents** |

> There is **no `claude-sonnet-5`** — the latest Sonnet is **4.6**. Use these exact IDs; don't append
> date suffixes. (`claude-opus-4-8` uses adaptive thinking only — no `budget_tokens`, no
> `temperature`/`top_p`. Details when we hit the API directly.)

## The cost model — this is the whole reason routing matters

Two different meters:

1. **Local dev + the mock bench** run on your **Claude subscription** (via the Claude Code CLI) —
   effectively free / high-quota. So the `simulator` and `judge` model choice is about **quality and
   speed, not dollars**. Use a sharp judge (opus-4-8); a fast simulator (sonnet-4-6) is plenty.
2. **The deployed CMA** (what the bench runs) spends the **$50 workspace cap**. Here the **agent's
   model is the cost lever.** Every bench run and every Console session burns real budget.

## How to route (default → escalate)

- **Iterate locally for free.** Build and mock-bench on the subscription as much as you want. Don't
  spend CMA budget to explore.
- **Pick the agent model per challenge by evidence.** Start the deployed agent on **sonnet-4-6**
  (3×/5× cheaper than opus). Only escalate to **opus-4-8** — or **fable-5** for the very hardest —
  if a *real eval regression* shows the cheaper model actually loses points. Don't pay for Opus on
  faith.
- **Delegate small work to small models.** In a multi-agent CMA, a coordinator (opus/sonnet) can
  spawn **haiku-4-5** sub-agents for classification, extraction, routing — cheap and fast. This is
  the `subagent` role. (Multi-agent CMA topology: see `docs/architecture.md` §deploy.)
- **Lean on prompt caching + `effort`.** On the deployed agent, a large stable system prompt caches
  at ~0.1× on reads; lower `output_config.effort` cuts tokens on routine turns. Both stretch the $50.
- **Batch, when it fits.** The Batch API is 50% off for non-latency-sensitive work (not the bench,
  but useful for offline eval-dataset generation).

## Watch the $50 — it's scored

Cost efficiency is a graded line: **under $50 = +5 · $50–100 = 0 · over $100 = −5** (Shubhankar,
#atlan-ai-hackathon-2026). So every CMA session and bench run spends points, not just dollars. Rules:

- Do **essentially all work locally** (free on the subscription). Touch CMA only for the real bench
  and the occasional deliberate `/cma-check` — never casually.
- Check remaining spend in the Console (workspace `hack-2026-t32`). 3 lives per challenge — never
  spend one on a config you haven't validated locally first.
- If a run costs more than expected, drop the agent to a cheaper model or lower `effort` before the
  next one. Staying under $50 is worth a full +5.
