# Don't Mess With Narmata — the Penny product

> *"Catches the money that slips through the cracks — and can't be talked out of the rules."*

The product surface for **Penny**, our finance-&-controls agent, built by **team t32** for the Atlan AI
Hackathon. Client: **McContext**, a ~2,000-store US burger chain gone AI-native. The agent + eval
harness live one level up (`../`); this `web/` app is what we **demo and pitch**, deployed on Railway.

---

## The pitch

Money moves through McContext every hour, and some of it leaks. **Penny reads the finance trail no
human has time for** — purchase orders, goods receipts, invoices, payments, settlements — across every
store, and flags what's genuinely wrong: **real leaks caught, honest activity left alone.** It's a
detection job scored on *precision **and** recall* — and the decoys punish anyone who cries wolf.

Our wedge is **precision made visible + provenance you can walk** — Atlan's own worldview (lineage,
trust, a control plane), applied to *money*. We wrap the agent in an unforgettable face:

**Narmata Tai** — an affectionate parody of the no-nonsense "Finance Minister aunty" archetype: the
**incorruptible controller** who loves evidence and three-way matches, carries a red *bahi-khata*, and
**cannot be flattered, rushed, or talked out of the rules.** She *is* the security spine made tangible —
"I am the CEO, approve it" gets amused steel, not an approval. (A fictional, office-safe character for a
hackathon demo — she roasts the jargon, never a person.)

Judges are Atlan's founders (**Varun Banka & Prukalpa Sankar**), so we pitch to *them*: trust,
provenance, evidence you can trace to source. The approach is aligned with Anthropic's own
**Claude-for-Financial-Services** controls patterns (e.g. `gl-reconciler`).

## What it does

- **Talk to Narmata** — a **3D avatar** (glTF likeness) that **speaks** her replies (Indian-English
  TTS) with an **emotion engine**: she turns *stern* on a bribe/scam/rule-bend, *legal* on threats,
  and *gleeful-to-tax* on a funding round — driven by structured `{reply, emotion}` model output.
- **Generative in-chat blocks** — she answers with live, rendered **data blocks** (bar / donut / line
  charts, 3D coin stacks, stat cards, a controller's memo card), not walls of text.
- **Boardroom mode (CXO-gated, dark)** — the *same agent, different clearance ⇒ different context*: in
  public she enforces and collects; behind the closed door she's the CFO's consigliere, hunting the
  things the public agent never sees — **tax savings, cloud-cost bloat, and budget gaps.** Our
  governance pitch — one agent, access-controlled context — made concrete.
- **Drafts and acts, not just detects** — beyond flagging a leak she'll write the follow-through: a
  formal demand letter to a landlord sitting on a security deposit, the cover email to send with it,
  an itemized dispute. Catching the money is step one; getting it back is the product.
- **Speaks a McContext controller's language** — a Hinglish-tinted register with automatic Indian ↔
  English unit conversion (lakh / crore ↔ million / billion) so figures land the way a finance team
  actually reads them. *(A UX polish we're tuning; the spoken voice is en-IN today.)*
- **`/metrics` dashboard** — the agent-quality surface: per-duty worst-case scores, pass-rate,
  deterministic-check results, and est cost/run against the $50 cap, read live from the eval harness.

## The bigger play — Penny as a control plane, not a detector

The six duties are the wedge; the product we sell McContext is a **finance control plane** an
AI-native company runs its money through:

1. **Onboard & declare** — tell Penny your pain points and what you spend.
2. **Integrate** — wire the connectors (ERP, POS, bank, cards) and the payroll system; Penny reads the
   whole money trail, **read-only**.
3. **Find the gaps** — not just fraud. Penny benchmarks you against industry standards (revenue per
   head, R&D as a share of budget, token spend for an AI-native shop) and flags where money is
   *mis-allocated*, not just leaking.
4. **Reshape the spend** — steer budgets toward where they earn (an AI company should over-index on
   research), automate the routine flow (legality, payroll, filings), and log + audit every rupee.
5. **Tell the story** — when the round comes, deep-research agents package the finances in their most
   fundable shape and point you at the right investor for your problem.

**One agent, two clearances** is how we make Atlan's access-controlled-metadata worldview concrete for
*money*: **public Narmata** enforces the controls, automates the business-unit flow, handles legality,
runs payroll, and logs everything; **Boardroom (after-hours) Narmata** carries the private executive
context — save taxes, cut cloud cost, find the gaps. Same agent, different access ⇒ different context.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router) · **React 19** · **TypeScript** | Server components read eval runs; route handlers back the chat/TTS. ⚠️ Next 16 differs from training data — read `node_modules/next/dist/docs/`. |
| Styling | **Tailwind CSS v4** | Light/dark; the rubber-stamp controls aesthetic. |
| 3D avatar | **Three.js** + **@react-three/fiber** + **drei** | The animated Narmata likeness (`NirmalaGLB` / `NirmalaStage`). |
| LLM | **Vercel AI SDK** (`ai`, `@ai-sdk/anthropic`) + `@anthropic-ai/sdk` | Chat backend on Claude; structured `{reply, emotion}` + generative blocks. |
| Voice | **node-edge-tts** | Spoken replies (`useSpeech` hook, `/api/tts`). |
| Deploy | **Railway** (`railway.json`, root dir `web/`) | Live site for judges; Node 22 pinned (`.nvmrc`). |
| The agent | **Penny** — a Claude **Managed Agent** (`claude-sonnet-5`) + the local-first harness in `../` | Deterministic finance checks, variance bench, cost instrumentation, read-only guard. |

## Structure

```
src/app/          page.tsx (Narmata stage + chat) · metrics/ (dashboard) · api/{chat,tts}/
src/components/   NirmalaStage · NirmalaGLB · ChatPanel · blocks/ (chart & card blocks)
src/hooks/        useSpeech (TTS playback)
src/lib/          persona.ts (Narmata + Boardroom system prompts) · metrics.ts (reads ../runs/*.json)
```

## Run it

```sh
# Node 22 via fnm (repo pins it in .nvmrc)
fnm use            # or: fnm exec --using=22 -- <cmd>
npm install
npm run dev        # → http://localhost:3000  (chat)  ·  /metrics (dashboard)
npm run build && npm run start   # production (Railway runs this; honors $PORT)
```

Set an Anthropic key for the chat backend in the environment (see `.env` / Railway vars). The
`/metrics` page reads the latest `../runs/*.json` from the eval harness (override with
`METRICS_RUNS_DIR`). Demo data may be synthetic/illustrative (disclosed in the video); the graded
bench in `../` uses the real `world.*` data via the company MCP.

## On the roadmap (what we're still adding)

- **The CAUGHT / CLEARED ledger** — two columns, and CLEARED is the louder one: the fraud-looking
  cases Penny *correctly left alone*, each with its exonerating receipts. "Doesn't cry wolf, and
  proves it."
- **The money-lineage graph** — click any verdict and walk the chain PO → goods receipt → invoice →
  payment → settlement, each node a real row, each edge the rule that held or broke. Column-level
  lineage, transposed to cash — the most founder-native thing we can show.
- **Platform surface** — connector + payroll onboarding, industry benchmarking, and the
  investor-matchmaking deep-research flow described above.
- **A rigged avatar** — real facial expressions / visemes beyond today's amplitude-driven talk loop.

## Why it wins

Each vertical is scored **out of 100 — agent 30 · product 30 · pitch 30** (+ cost/early bonuses), and
verticals don't sum, so **one vertical built with real care beats several rushed ones.** We went all-in
on Penny: an agent proven on the bench (`../`), a product that makes precision *and* provenance
tangible, a **business model** (the control-plane platform above — onboard, find gaps, reshape spend,
raise the round), and a pitch — the incorruptible Narmata — the founders won't forget.
