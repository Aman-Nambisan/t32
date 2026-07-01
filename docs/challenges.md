# Challenges & strategy

## The 4 problem statements

McContext (our client) has four back-office jobs. We submit an agent against each on the bench, but
we build **one full product + pitch** — and that's **finance**.

| Challenge | Agent | We build the product? | Status |
|---|---|---|---|
| **Finance** 🏦 | `agents/finance/` | **YES — flagship.** UI, website, walkthrough, deck, the pitch. | building |
| Customer support | `agents/customer-support/` | No — agent + bench only | stub |
| Data analysis | `agents/data-analysis/` | No — agent + bench only | stub |
| Inventory | `agents/inventory/` | No — agent + bench only | stub |

**Why this split:** the grade is bench + product + pitch (see `evaluation` in the onboarding docs).
The bench is one input; a sellable product and a strong pitch carry the most weight. We can't build
four polished products, so we go deep on **finance** — the agent, the product around it, and the
story — and still submit solid agents on the other three for bench points.

> The real briefs drop at the **9 PM IST kickoff**. Everything here is scaffolded ahead of them —
> when a brief lands, fill that agent's `system` + `skills/` and write its eval suite. Nothing here
> hardcodes challenge answers; the bench uses held-out cases.

## How the repo maps to a challenge

For each challenge `X`:
1. **Agent** — `agents/X/agent.yaml` (+ `skills/`). Iterate locally: `make chat AGENT=agents/X`.
2. **Eval suite** — `suites/X/` (copy `suites/_template/`). Write cases from the brief; run
   `make bench AGENT=agents/X SUITE=X`. Iterate against the scores.
3. **Deploy** — `make deploy AGENT=agents/X` → agent id + version → register on the platform → bench.

## Finance flagship — the product

The agent is the engine; the product is what we sell. Around `agents/finance/` we build the
customer-facing thing (a UI / SaaS / walkthrough) and the pitch. Deploy target: **Railway** (invite
already created — ask Aman). Product work lives in `product/` (create when we start it) or a separate
repo — decide as a team. Swapnil is driving product/video; Karan on product/approach; Aman on the
agent + eval infra.

## Owner notes

- Keep each challenge's domain knowledge in that agent's `skills/` (like the drive-thru `menu`
  skill), not hardcoded in prompts scattered around.
- When you learn something non-obvious about a challenge (a scoring quirk, a data gotcha), add it to
  that agent's `domain-notes` skill so the next person — or the next Claude thread — picks it up.
