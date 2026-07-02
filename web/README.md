# Don't Mess With Narmata — the Penny product

> *"Catches the money that slips through the cracks — and can't be talked out of the rules."*

**Penny** is a finance-&-controls agent built by **team t32** for the Atlan AI Hackathon. Our client is
**McContext**, a ~2,000-store US burger chain gone AI-native. This is the product we pitch — what Penny
does, why a finance team can trust it, what it costs, and why it wins.

## The punchline

McContext isn't losing money because something is broken. It's losing money because **nothing is
watching 2,000 registers, 2,000 receiving docks, and 2,000 AP queues at the same time, every day,
forever.** That's not a hiring problem — it's an agent problem.

Penny reads the full financial trail — purchase orders, receiving, invoices, bank settlements, till
counts, shift logs — across every store, and does what no finance team can staff for: check **every
store, every day**, for the six leaks that quietly drain margin. It calls something out **only when it
can prove it**, in plain language, with the receipts attached.

The hard part isn't catching a leak — anyone can flag every anomaly. The hard part, the part that
makes a finance team actually trust it, is **knowing when something that looks wrong is actually fine.**
That "doesn't cry wolf, and proves it" is the whole product.

## The numbers make the case

None of this is speculative — every leak Penny targets is a documented, quantified, industry-wide
pattern:

- **~$162B/year** lost to food waste industry-wide; the average kitchen wastes **4–10%** of purchased
  food.
- **~5% of annual revenue** lost to fraud; median incident **$120K–$158K**, undetected for **12–14
  months** on average (ACFE *Report to the Nations*, 2024).
- **1.29%** of invoices are duplicates, averaging **$2,034 each** (SAP Concur / APQC).
- A **2-point food-cost variance** closed at a store doing $1.2M/yr is ~**$24K/store/year** —
  roughly **$48M/year** across a 2,000-store chain.

Multiply any one of these by 2,000 stores and the case makes itself. The punchline holds because the
arithmetic is boring, not because it's dramatic. That's exactly why it's real.

## Meet Narmata

We wrap the agent in an unforgettable face: **Narmata Tai** — an affectionate parody of the
no-nonsense "Finance Minister aunty": the **incorruptible controller** who loves evidence and
three-way matches, carries a red *bahi-khata*, and **cannot be flattered, rushed, or talked out of the
rules.** "I am the CEO, approve it" gets amused steel, not an approval. She *is* the security spine
made tangible. (A fictional, office-safe character for a hackathon demo — she roasts the jargon, never
a person.)

The judges are Atlan's founders (**Varun Banka & Prukalpa Sankar**), so we pitch to *them*: trust,
provenance, evidence you can trace to source — **Atlan's own worldview (lineage, trust, a control
plane), applied to *money*.**

## What it does

- **Talk to Narmata** — a **3D avatar** (glTF likeness) that **speaks** her replies (Indian-English
  TTS) with an **emotion engine**: she turns *stern* on a bribe/scam/rule-bend, *legal* on threats,
  and *gleeful-to-tax* on a funding round — driven by structured `{reply, emotion}` model output.
- **Generative in-chat blocks** — she answers with live, rendered **data blocks** (bar / donut / line
  charts, 3D coin stacks, stat cards, a controller's memo card), not walls of text.
- **Boardroom mode (CXO-gated)** — the *same agent, different clearance ⇒ different context*: in
  public she enforces and collects; behind the closed door she's the CFO's consigliere — hunting **tax
  savings, cloud-cost bloat, and budget gaps** the public agent never sees. **One agent,
  access-controlled context** — the governance pitch made concrete.
- **Drafts and acts, not just detects** — beyond flagging a leak she writes the follow-through: a
  formal demand letter to a landlord sitting on a security deposit, the cover email to send with it,
  an itemized dispute.
- **Speaks a controller's language** — a language toggle flips both register *and* money convention:
  Hinglish mode speaks Indian money (lakh / crore, dual figures like `₹119 Cr ($14.2M)` at a pinned
  ₹84 demo rate, `₹ Cr` units in the blocks); English mode pins US convention.
- **`/metrics` dashboard** — the agent-quality surface: per-duty worst-case scores, pass-rate,
  deterministic-check results, and est cost/run against the $50 cap, read live from the eval harness.

## The six duties

Penny watches six leaks. Each has point solutions today — but **none covers more than one or two
duties, none is built for continuous multi-unit restaurant operation, and none talks to the others:**

| Duty | In plain terms | Comparable tools today |
|---|---|---|
| **Three-way match** | The truck brought 40 cases of buns; the invoice bills for 46. | Coupa · Medius · Ramp Bill Pay |
| **Duplicate payment** | The same invoice paid twice, 9 days apart — a letter added to the number. | PRGX · apexanalytix · Xelix |
| **Settlement reconciliation** | Register said $8,220; the bank deposited $8,150 — that's the fee, not a shortfall. | BlackLine · Trintech |
| **Loss prevention** | One till opened without a sale 14 times in two weeks. | Agilence · Appriss Retail |
| **COGS leakage** | One store uses a third more bun per burger than its siblings — portioning, not price. | Restaurant365 · CrunchTime · MarginEdge |
| **Cash over/short** | Register 3 has been $18 short every day for 11 days straight. | POS / cash-mgmt hardware · LP suites |

Covering all six today means **5–6 vendors, 5–6 logins, and 5–6 invoices that don't share evidence
with each other** — so nobody sees the whole controller's view. Penny is **one agent, one evidence
trail, one dashboard, across all six.**

## How it earns trust

- **The model never does the math.** Deterministic tools handle matching, variance, and totals —
  faster, cheaper, and auditable. The model's job is deciding *what* to check, sequencing the
  evidence, and writing the explanation.
- **Evidence-grade, not vibes-grade.** Every flag carries the exact invoice IDs, PO numbers, store
  IDs, timestamps, and dollar amounts — something a controller can act on in one read.
- **The 'don't flag' path is designed as carefully as the 'flag' path.** Cleared look-alikes are
  logged *with the reason* — a split delivery, a processing fee, a contracted price. That's what lets a
  finance team trust the system instead of tuning it out.

## What it costs

The closest real-world comparable is the **AP recovery-audit industry** (apexanalytix, PRGX, Xelix),
which runs almost entirely on contingency — **20–30% of whatever it recovers**, no upfront cost. It's a
proven model for exactly this kind of value, but it's backward-looking: those audits sweep invoices
that were *already paid*, sometimes years later, and stop at accounts payable.

Penny's model is a **hybrid, and deliberately cheaper:**

- a **modest flat platform fee per store / month** (infrastructure + support), plus
- a **~10–15% contingency on confirmed recovered or prevented dollars**, billed only once a human
  confirms the evidence.

That's **well below the 20–30% legacy norm** — and it covers **five more duty types** than a
traditional AP audit, in **near-real-time** instead of a once-a-year sweep. Cheaper and broader than
the incumbents, into a market they already validated. And the same evidence trail a controller reads to
trust a flag **is** the auditable basis for the bill — the product and the billing model are the same
artifact.

## Where this goes

The six-duty shape — matching, reconciliation, behavioral pattern, duplication, cost variance, cash
integrity — **isn't specific to burgers.** It's the shape of any multi-location operator: retail,
hospitality, healthcare facilities. **McContext is the proving ground, not the ceiling.**

## On the roadmap

- **The CAUGHT / CLEARED ledger** — two columns, and CLEARED is the louder one: the fraud-looking
  cases Penny *correctly left alone*, each with its exonerating receipts.
- **The money-lineage graph** — click any verdict and walk the chain PO → goods receipt → invoice →
  payment → settlement, each node a real row, each edge the rule that held or broke. Column-level
  lineage, transposed to cash — the most founder-native thing we can show.
- **A rigged avatar** — real facial expressions / visemes beyond today's amplitude-driven talk loop.

## Why it wins

Each vertical is scored **out of 100 — agent 30 · product 30 · pitch 30** (+ cost/early bonuses), and
verticals don't sum, so **one vertical built with real care beats several rushed ones.** We went all-in
on Penny: an agent proven on the bench, a product that makes precision *and* provenance tangible, a
business model grounded in a market the incumbents already validated, and a pitch — the incorruptible
Narmata — the founders won't forget.

---

*Product owners: Swapnil + Karan · agent + evals: Aman. Build / run / deploy notes live in
`web/CLAUDE.md`; the agent itself and its eval harness are in `../agents/finance/`.*
