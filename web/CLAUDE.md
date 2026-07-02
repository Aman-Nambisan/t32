# web/ — "Don't Mess With Nirmala" · the Penny product (team t32)

This is the **product** we build around **Penny**, our finance-&-controls agent, for the Atlan AI
Hackathon. The agent + eval harness live in the parent repo (`../`); this folder is the site/app
we demo and pitch. Deploys to **Railway** (project already created). Product owners: Swapnil + Karan;
Aman owns the agent + evals.

> **Blank slate on purpose.** The app is a fresh Next.js scaffold. This file is the *context* so a
> new Claude Code thread can start building immediately. Read it top to bottom before writing code.

@AGENTS.md

## Parent repo — read these, don't duplicate them

Everything about the agent itself is one level up:
- `../AGENTS.md` — team rules, the local-first eval loop, working rhythm.
- `../docs/challenges.md` — the Penny challenge + scoring strategy.
- `../agents/finance/agent.yaml` + `../agents/finance/skills/domain-notes/SKILL.md` — **the actual
  agent**: its six duties, the policy thresholds, how it investigates. The product must tell the
  truth about what Penny does — read this so the UI/pitch matches the real behavior.
- `../docs/decisions/` — why we chose what we chose (ADRs).

## The mission (what we're selling)

We're an **AI agency**; **McContext** — a ~2,000-store US burger chain — is our **client**. We don't
just build an agent, we sell them a product. Penny is a continuously-running **finance & controls**
agent that watches the money trail across every store and flags what's genuinely wrong — **catching
real leaks while leaving honest activity alone**. Six duties: three-way match, settlement
reconciliation, loss prevention, duplicate payment, COGS leakage, cash over/short.

The judges are **Atlan's founders, Varun Banka & Prukalpa Sankar** — a **data-lineage / trust /
active-metadata** company. Pitch to *them*: trust, provenance, "a control plane," evidence you can
walk back to source. Top 7 individual-vertical submissions present live to them.

## Scoring (know it cold — from the organizers, #atlan-ai-hackathon-2026)

Each vertical is scored **out of 100, on its own** (totals do NOT add across verticals — one vertical
built with real care beats several rushed ones, so we go **all-in on Penny**):
- **Agent quality (bench): 30**
- **Product: 30**  ← this app is a big chunk of it
- **Pitch: 30**  ← the 10–15 min walkthrough video
- **Cost efficiency: +5 if CMA spend < $50 · 0 if $50–100 · −5 if > $100**
- **Early submission: +5 if in by 4 PM IST** (hard deadline 6 PM IST)
- **Pre-hackathon warm-up bonus: +10**

**Product + Pitch = 60 of the 90 core points, and they're founder-judged (subjective).** Deliverable
is a **Doc with a 10–15 min walkthrough video + links** (this live site, a deck, ad campaign, etc.).
Mandate: **build SLC — Simple, Lovable, Complete — not a thin MVP.** Packaging is an explicit
criterion; organizers reward real UI/UX, AI-generated videos, ad campaigns, and a proper website.

## What we're building (the product direction)

Our wedge is **precision made visible + provenance you can walk** — Atlan's own worldview, applied to
money. Two hero surfaces:

1. **The CLEARED ledger (two columns — CAUGHT vs CLEARED, and CLEARED is the louder one).** Every
   finance-team tool shows a "caught" list. Almost nobody shows the fraud-looking cases the agent
   *correctly did NOT flag*, each with receipts. That "doesn't cry wolf, and proves it" surface is
   the trust story. A cleared card shows: the case that screams fraud → the exonerating evidence
   (e.g. installment `2-of-2` reference, `covers_date` timing, a contracted price) → "left alone, $0
   billed."
2. **The money-lineage graph.** Click any verdict (flag *or* clear) and see the chain — PO → goods
   receipt → invoice → payment → settlement — each node a real row in cents, each edge the rule that
   held or broke, drillable to the source row. This is *column-level lineage transposed to cash* —
   the single most founder-native thing we can show Varun & Prukalpa. It must be a real, row-backed
   graph, not a static flowchart, or it's just decoration.

**The signature hook: "Don't Mess With Nirmala."** A chatbot fronted by an animated **3D model of
Nirmala (the Indian finance minister persona)** — the incorruptible controller who can't be talked
out of the rules and watches every store. Fun, memorable, on-theme. (V1 = the app + context; the 3D
model comes later — see next steps.)

## Differentiation — READ THIS, the finance vertical is contested

Competitive intel from the channel (2026-07-02):
- **"Penny" + "no cry-wolf / receipts / evidence trail / look-alikes" is SATURATED.** At least two
  rival finance teams pitch almost exactly that: **Age of Context** (`ageofcontext.vercel.app`, "six
  quiet leaks, half are honest activity in disguise," AND-logic to kill false positives) and
  **Builder Tribe** (also named their agent "Penny", doing live email outbound).
- **The Nirmala idea is partly taken:** Builder Tribe already brand theirs "the Nirmala Madam to sit
  inside your orgs" — but only as a static gif. **Our animated 3D Nirmala is a far more distinct
  execution**, so it's still a strong hook; just know we're not first to the reference.
- **So our edge is HOW, not what:** the walkable **money-lineage graph** (buildable, founder-native),
  the **3D Nirmala** product, and airtight, evidence-grade precision — not the "doesn't cry wolf"
  tagline everyone is already using. Differentiate on craft and the demo, not the category.

## UX expectations

- **SLC, not MVP.** Lovable and complete beats broad and shallow. One unforgettable interaction >
  ten half-built ones.
- **Not a chat box.** Judges reward a real product surface (the two-column ledger, the lineage graph,
  a controller's brief), a branded identity, and a produced launch/ad video.
- **The video is the primary artifact.** Design the app so a 10–15 min walkthrough sells itself to a
  CFO/founder: open on Nirmala clearing a fraud-looking case with receipts, then a real catch.
- Organizers run **review calls that help with product direction** — book one.

## Data & cost rules

- **Company MCP is READ-ONLY** — the DB never mutates; the *trace of the tool call* is what's scored.
- **You may use made-up / open finance data for the product demo** as long as you disclose it in the
  video. You're **not** tied to McContext's data for the product. (The bench still uses the real
  `world.*` data via the MCP — that's the agent's job, in `../`.)
- **Cost efficiency is scored.** Keep the app cheap to run; if it calls a model, route the cheapest
  one that clears the bar (the agent side already does this — see `../models.yaml`).

## Tech & how to run

- **Next.js 16** (App Router, TypeScript, Tailwind v4, `src/`). ⚠ **Next 16 has breaking changes vs
  your training data — read `node_modules/next/dist/docs/` before writing code** (see `AGENTS.md`).
- **node is via nvm and lazy-loaded.** In a non-interactive shell run this prelude first, or node
  resolves to a broken stub:
  ```sh
  unset -f node npm npx nvm 2>/dev/null   # then node/npm/npx work (node v22 at ~/.local/bin)
  ```
- Local dev: `npm install` (done) → `npm run dev` → http://localhost:3000
- Build: `npm run build && npm run start` (Railway runs this; `next start` honors `$PORT`).

## Deploy (Railway)

The site deploys from **this `web/` folder inside the t32 repo** (monorepo, not a separate repo):
- Railway project is created; connect the **`Aman-Nambisan/t32`** GitHub repo.
- Set the service **Root Directory = `web/`** and **Watch Paths = `web/**`** so agent/eval commits
  don't trigger web rebuilds. `railway.json` here pins the build/start.
- One interactive step is on Aman: `railway login` (browser) to link the CLI, or connect via the
  Railway dashboard's GitHub integration.

## Immediate next steps (for the product thread)

1. Landing page for "Don't Mess With Nirmala" — the pitch above the fold (precision + lineage +
   Nirmala), aimed at a CFO.
2. The **two-column CAUGHT / CLEARED ledger** with drill-through cards (seeded/disclosed demo data is
   fine).
3. The **money-lineage graph** component (row-backed, clickable to source).
4. The **3D Nirmala** chatbot: pick an approach (e.g. a glTF/Three.js avatar with lip-sync/idle
   animation) wired to a chat that speaks in Penny's grounded, can't-be-talked-out-of-it voice.
5. Produced assets: a short ad + the 10–15 min walkthrough video.

Keep the app honest about what Penny actually does — the source of truth is `../agents/finance/`.
