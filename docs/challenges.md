# Our challenge: Penny (Finance & Controls)

We're going **all-in on Penny** — the finance challenge — and building the product + pitch around it.
The other three challenges (Patty/support, Pivot/data, Stock/inventory) exist on the platform but
**we're not building them**; if we ever pivot, `/new-challenge` regenerates a stub in minutes.

## What Penny is

McContext's finance detection agent across ~2,000 US stores (all money **USD, in cents**). It reads
the finance trail and flags what's genuinely wrong — **precision AND recall**: real leaks caught,
minus false alarms. The data is messy and seeded with **decoys** (the obvious read is wrong) and
**clean cases that must be left alone**. Six duties, each scored on its own:

1. Three-way match · 2. Settlement reconciliation · 3. Loss prevention · 4. Duplicate payment ·
5. COGS leakage · 6. Cash over/short.

Full data map, the exact policy thresholds, and per-duty playbooks live in
`agents/finance/skills/domain-notes/SKILL.md` (grounded in the live data).

## How we access it (verified)

- **Company MCP** (`${MCCTX_MCP_URL}` + `${MCP_AUTH_TOKEN}` in `.env`), wired into `agents/finance`:
  - **`run_sql`** — read/investigate the `world.*` data.
  - **action tools** — `submit_match_exception`, `submit_duplicate_payment`, `submit_loss_flag`,
    `submit_cogs_variance`, `submit_cash_variance`. **What you submit through these IS the graded
    outcome.**
- **Read-only Postgres** (`${WORLD_DB_URL}`) — the same `world.*` data over plain SQL, for exploration
  and for building the product/demo. Safe, read-only.

## Scoring (dimensions given, not weights)

Investigation, method, tool use, communication, efficiency — spine is precision + recall. Policy is
explicit and must be applied exactly: three-way-match exception needs variance **≥ $5.00 AND ≥ 0.5%**
of the line (both); price variance must also exceed the **0.5%** tolerance; COGS band **30% target /
>34% investigate / <28% favorable**. 3 lives per challenge (Run = partial + trace; Submit = full,
hidden). **The bench isn't open yet — organizers said build agents first.**

## The two lanes (both count)

- **Agent quality** — the bench score.
- **Product + pitch** — a **10–15 min video** + links (deck / site / walkthrough). Build **SLC**
  (Simple, Lovable, Complete), not MVP — packaging is a real criterion. **You're not tied to
  McContext's data** for the product; any open finance-controls dataset is fair game. Deploy on
  Railway if we ship a live product.

**Scoring per vertical (out of 100, scored independently — we go deep on ONE):** agent/bench **30**,
product **30**, pitch **30**, cost efficiency **+5 under $50 / 0 / −5 over $100**, early (by 4 PM IST)
**+5**, pre-hackathon warm-up **+10**. Top 7 individual verticals present — one built with real care
beats several rushed. **So: nail Penny, and mind the CMA credits (every run costs points).**

**Deadlines (IST):** final submission **6:00 PM** (early **4:00 PM** for +5); **top 7 teams** present
live to Varun & Prukalpa at 9:00 PM.

## How the repo maps to Penny

1. **Agent** — `agents/finance/` (system + `house-rules` + `domain-notes` skills + the wired MCP).
   Iterate: `make chat` / `make bench SUITE=finance`.
2. **Eval** — `suites/finance/` runs in **review mode** (investigate + propose verdicts; no `submit_*`
   so we don't touch graded state). Judge scores the method. `docs/eval-guide.md`.
3. **Deploy** — `make deploy AGENT=agents/finance` when the bench opens (spends the $50; announce it).

## Owners

Aman — agent + eval infra. Swapnil — product + video. Karan — product + approach. Put durable
finance knowledge in `agents/finance/skills/domain-notes` so it compounds for everyone.
