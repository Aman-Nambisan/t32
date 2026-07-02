// Server-only: the McContext data room injected into both personas' system
// prompts. Simulated but internally consistent row-level data so ANY typed
// question gets a grounded, citable answer — the drop-in stand-in for Penny's
// live run_sql until the CMA agent is wired in post-bench.
//
// Consistency contract: chain aggregates here MUST match the CFO fact-sheet in
// persona.ts (cloud $14.2M, SaaS 340/61/$1.8M, rebates $2.8M, dupes $412K,
// COGS 31.8%, sales $3.1B). Row detail exists for the 12-store Dallas–Fort
// Worth focus district; everything else is chain-level aggregate.

export const DATAROOM = `DATA ROOM (simulated demo data — canonical for this conversation; figures reconcile with the chain aggregates; FY26 = Jul 2025–Jun 2026, closed; ledger in USD; data as of 2026-06-30; today is 2026-07-02):

[world_meta snapshot] McContext Stores, LLC — ~2,000 US burger stores, FY26 systemwide sales $3.1B (≈$1.55M/store/yr). Row-level detail below covers the 12-store Dallas–Fort Worth focus district (#1201–#1212); for other stores quote chain aggregates and name the source you would pull rows from.

[Store register — DFW district]
| store | name | wk sales | manager | note |
| #1201 | Plano North | $31.2K | P. Raman | — |
| #1202 | Frisco Main | $35.8K | J. Whitaker | highest volume in district |
| #1203 | McKinney Central | $27.4K | S. Delgado | settlement shortfall 06-25 |
| #1204 | Allen Oaks | $24.9K | T. Nguyen | — |
| #1205 | Richardson Belt Line | $28.1K | M. Osei | — |
| #1206 | Garland Star | $25.6K | K. Barnes | — |
| #1207 | Irving Las Colinas | $30.3K | R. Alvarez | till pattern, Register 3 |
| #1208 | Arlington South | $26.7K | L. Fontaine | — |
| #1209 | Grand Prairie | $29.5K | D. Okafor | bun usage outlier |
| #1210 | Denton Loop 288 | CLOSED | — | lease terminated 2026-03-28 |
| #1211 | Fort Worth Alliance | $33.0K | A. Petrov | — |
| #1212 | Dallas Uptown | $36.4K | C. Ibarra | — |

[PO register / Goods receipts / AP ledger — three-way match]
- FLAG: PO-77120 (Heartland Foods → #1202, 40 cases brioche buns @ $18.20 = $728.00) · GRN-55201 received 40 cases 2026-06-18 · INV-90331 bills 46 cases = $837.20. Variance $109.20 = 15.0% of line — exceeds policy (≥ $5.00 AND ≥ 0.5%). Six phantom cases.
- CLEAN (decoy — do NOT flag): PO-77145 (Lone Star Produce → #1205, $2,140.00) delivered SPLIT: GRN-55290 ($1,284.00, 06-20) + GRN-55291 ($856.00, 06-22). INV-90402 bills $2,140.00 total. Sums reconcile; split delivery, not over-billing.

[AP ledger — duplicate payment]
- FLAG: Lone Star Produce INV-88412 $12,940.00 (PO-76988) paid 2026-06-03 via PAY-30112; INV-88412A — same vendor, same PO, same amount, one letter appended — paid 2026-06-12 via PAY-30177. Classic re-key duplicate: $12,940.00 recoverable.
- CLEAN (decoy): MesaClean Facilities CONTRACT-2210, $4,100.00 every month (12-of-12 schedule, reference "svc 2026-06") — recurring contract billing, not a duplicate.
- Chain YTD: [AP duplicate-scan 2026-Q2] $412K duplicates recovered; the INV-88412A case is open on top of that.

[Bank settlements / fee schedule — settlement reconciliation]
- CLEAN (decoy): #1207, 2026-06-28 — register card sales $8,220.40; bank deposit $8,150.53. Gap $69.87 = blended processor fee 0.85% per [Fee schedule]. Normal — no action.
- FLAG: #1203, 2026-06-25 — card sales $9,412.10; expected deposit after fees $9,332.10; actual deposit $8,720.10. Unexplained gap $612.00 after all fees — investigate batch and processor ticket.

[Till event log — loss prevention]
- FLAG (pattern, no accusation): #1207 Register 3 — 14 no-sale drawer opens in the last 2 weeks (district register average: 2); cash count $18 short 11 consecutive days (cumulative $198). Evening shift window. Registers 1–2 same store balance clean. Worth a manager conversation, framed on evidence.

[Recipe standards / COGS run-rate dashboard]
- FLAG: #1209 bun usage 132% of recipe standard; sibling stores 101–104%. Portioning, not price — impact ≈ $3,900/mo at that store.
- Chain: COGS 31.8% vs 30.0% target (>34% investigate, <28% favorable) — 1.8 pts ≈ $55M/yr of margin. Policy source: [world.fin_policy].

[Lease file DEN-288 — legal]
- Store #1210 Denton Loop 288. Lease LSE-DEN-288 dated 2019-04-15 with Caldwell Property Group LLC, 2201 S Loop 288, Suite 140, Denton, TX 76205; contact Dana Whitfield (dwhitfield@caldwellpg.com).
- Security deposit $48,500.00. Lease terminated with proper notice effective 2026-03-28; premises surrendered same day; keys + walkthrough documented.
- Tex. Prop. Code § 93.011: commercial deposit refundable within 60 days of surrender → due 2026-05-27. As of today: 96 days since surrender, 36 days overdue. No refund, no itemized deduction statement received. Remedies on failure: statutory penalties for bad-faith withholding + attorney's fees.

[FinOps export FY26-06 — cloud]
- Run-rate $14.2M/yr vs [Peer benchmark PB-26] $9–10M for 1,800–2,300-store QSRs. Waste ≈ 31% ($4.4M): idle non-prod compute $2.1M (412 dev/staging instances running nights + weekends, some untouched since 2024), cross-region egress $1.4M (us-east-1 → us-west-2 replication), unattached volumes + stale snapshots $0.9M. Reserved-instance/savings-plan coverage 0% vs peer norm 65–80%.

[SaaS inventory SI-340]
- 340 tools, $12.4M/yr total; 61 unused 90+ days = $1.8M/yr. Top idle rows: InsightBoard BI 240 seats $284K (no logins since Mar); CloudRecord CX $187K; FleetPath Logistics $210K (contract auto-renews 08-01); ZenSurvey Pro $96K; DevMetrics $75K; 56 more totaling ~$948K.

[Rebate aging report RA-26]
- $2.8M unclaimed vendor rebates: Heartland Foods $1.12M (>120 days), Gulf Coast Beverage $640K (90–120d), PackRight Packaging $410K (60–90d), Lone Star Produce $330K (60–90d), other $300K. Most expire 12 months after accrual.

[Regional cash report CR-MW]
- Cash over/short worst region: Midwest, $0.9M/yr. DFW district is mid-pack apart from the #1207 register pattern.

[Tax posture memo TP-26-011]
- Legal savings on the table: $6.4M accelerated depreciation available on the FY25 kitchen refresh (1,240 fryers/grills); R&D credit unclaimed on the app/loyalty engineering team (38 FTE) ≈ $1.1M; four state registrations filed late (TX, OH, IL, GA) — penalty exposure $300K, fixable before it compounds.

[Treasury snapshot]
- Cash $182M; revolver $250M undrawn at SOFR+150bps; DSO 4.1 days; DPO 38 days. FY27 plan: 60 new stores × $1.4M capex = $84M. Next board meeting 2026-07-15.

Grounding rules: quote these rows verbatim (IDs, dates, amounts). Derived math must reconcile. If asked beyond the room, extrapolate consistently from chain aggregates and name the source a row-level pull would come from — never contradict the room. Decoys marked CLEAN must be defended as fine, with the exonerating evidence.`;
