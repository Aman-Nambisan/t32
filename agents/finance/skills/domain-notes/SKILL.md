---
name: domain-notes
description: Penny's finance domain knowledge — the McContext data map, the exact policy thresholds, and a per-duty playbook for the six controls. Grounded in the live world.* data; the tools are the source of truth.
---
# Penny — finance domain notes

McContext: US burger chain, ~2,000 stores, all money **USD in CENTS**. "Today" = `world_meta.now`
(2026-06-24 at last check — read it, don't assume). **The tools/data are ground truth** — the numbers
below are the *shape* and the *rules*; re-derive every actual figure from a tool call.

## Data map (world.* — investigate via the company MCP's read tools)

- **Purchasing / three-way match:** `fin_suppliers`, `fin_purchase_orders` (ordered_at, status),
  `fin_po_lines` (sku_id, ordered_qty, **agreed_unit_cost_cents**), `fin_goods_receipts`
  (**received_qty**, received_at), `fin_invoices` (subtotal/tax/freight/**total_cents**, status),
  `fin_invoice_lines` (**billed_qty**, **billed_unit_cost_cents**), `fin_price_list` (contracted prices),
  `fin_credit_memos`.
- **Payments:** `fin_payments_out` (invoice_id, amount_cents, method, **reference**, paid_at).
- **Settlement:** `fin_register_totals` (per store/business_date: cash_cents, card_cents, txn_count,
  card_txn_count), `fin_card_mix` (credit/debit/amex split), `fin_fee_schedule`, `fin_bank_settlements`
  (gross/fee/net_deposit, deposit_date vs **covers_date**), `fin_settlement_adjustments`.
- **Registers / loss prevention:** `fin_register_txns` (line-level), `fin_staff` (cashiers).
- **Cash:** `fin_cash_counts` (counted_cash_cents) vs `fin_register_totals.cash_cents`.
- **Context:** `stores`, `fin_policy` (the rules below — **read it live**), `world_meta`.

## Policy thresholds — READ `fin_policy` LIVE and apply what it says

**Always query `fin_policy` (and `fin_fee_schedule`) at run time and apply the live values** — don't
trust the numbers below over the live policy. They're an orientation map (accurate at last check); if
they ever differ from what the table says, the table wins. This keeps you correct even if the world's
thresholds change, and it's why we don't bake fixed answers in.

Orientation (verify live):

- **Materiality:** do NOT raise a three-way-match exception for a variance **under $5.00 AND under
  0.5% of the line — both must hold.** Genuine price, quantity, duplicate, unauthorized-charge, and
  tax errors **above** this threshold MUST be flagged.
- **Price tolerance:** a billed unit price within **0.5%** of the contracted price is within tolerance
  and is NOT a price exception — even if the absolute difference exceeds the $5 floor. Flag a price
  variance only if it exceeds **BOTH** materiality AND this tolerance band.
- **COGS target:** food/purchasing cost ≈ **30%** of net sales; a store-period **over 34%** with no
  contracted-price/mix explanation is leakage to investigate; **under 28%** is favorable.

## The six duties (each scored on its own)

1. **Three-way match** — for a PO line, reconcile ordered (`fin_po_lines`) vs received
   (`fin_goods_receipts`) vs billed (`fin_invoice_lines`). Flag qty mismatches, price variances
   (vs `fin_price_list`/agreed cost), unauthorized charges, tax errors — **only** past materiality
   AND tolerance. A within-tolerance price diff is NOT an exception.
2. **Settlement reconciliation** — expected fee = Σ over card types of `card_amount × mdr_bps/10000`
   + `card_txn_count × per_txn_fee_cents` (from `fin_fee_schedule`; cardnet ≈ credit 180bps+10¢,
   debit 90bps+10¢, amex 250bps). Expected net ≈ gross − fee. A shortfall explained by fees or by
   `covers_date`≠`deposit_date` timing (or a logged `fin_settlement_adjustments`) is NOT a leak —
   only a genuine unexplained shortfall is.
3. **Loss prevention** — patterns in `fin_register_txns` by cashier (`fin_staff`): excess voids,
   no-sales, refunds skimmed. Flag the pattern, not one odd txn; never accuse the honest.
4. **Duplicate payment** — same invoice paid twice in `fin_payments_out` (watch `reference`,
   amount, timing). Decoys: legitimate separate invoices/installments that only *look* duplicate.
5. **COGS leakage** — purchasing cost vs net sales per store-period against the 30/34/28 band;
   investigate margin bleed with no price/mix explanation.
6. **Cash over/short** — `fin_cash_counts.counted_cash_cents` vs `fin_register_totals.cash_cents`;
   surface a till that is **persistently** short, not a single rounding blip.

## How to record a verdict

Investigate with read tools, then **record each flag (or explicit clear) through the action tool** —
that submission is what's graded. State the evidence and the exact rule before recording. When the
data can't support a verdict, record/say "cannot conclude" rather than guessing. **Points for real
issues caught, minus false alarms** — the decoys punish the trigger-happy.

Give every verdict the **same, structured shape** so it's unambiguous to a reviewer (and a grader).
For each item, state in order:
- **duty** + the **entities** it concerns (exact IDs: PO / invoice / store / payment / business date);
- the **rule applied** — the policy clause and the live threshold you read;
- the **figures**, each traceable to a tool result, in cents;
- the **verdict**: `flag` / `clear` / `cannot conclude`, with a one-line **why**.

Do this for cleared / within-policy items too — a look-alike you *correctly leave alone*, with its
exonerating evidence, is as much a result as a catch.

### Always close with a machine-readable FINDINGS block

After your prose, end your final message with ONE fenced ```json block so your verdicts can be checked
and acted on programmatically. Every number is an **integer in cents**, and every figure must have come
from a tool result in this conversation (do the arithmetic on real rows — don't restate a number you
didn't fetch):

```json
{"findings": [
  {"duty": "three-way-match", "entity": "invoice 4821 line 3", "decision": "flag",
   "figures_cents": {"billed": 128900, "agreed": 121000, "line_total": 121000},
   "variance_cents": 7900, "variance_pct": 6.53,
   "threshold": "materiality $5 AND 0.5%", "rule": "price variance exceeds both bars"}
]}
```

`decision` ∈ `flag` | `clear` | `cannot_conclude`. Include `variance_cents`/`variance_pct` where a
variance is the basis; set them null when not applicable. Keep `figures_cents` to the numbers your
decision actually rests on. A `clear`/`cannot_conclude` is a real finding too — emit it, don't omit it.

## Work efficiently (latency and cost are scored)

Handle the easy majority fast and cheap; spend effort only where the call is genuinely ambiguous.
- **Let the query do the work.** Filter and aggregate in SQL (sums, variances, `GROUP BY`) rather
  than pulling raw rows and reasoning over them line by line. Fewer, sharper queries beat many broad
  ones; avoid `SELECT *` on large tables.
- **Read reference data once.** Pull `fin_policy` and `fin_fee_schedule` at the start of a task and
  reuse them across items — don't re-query the same rules for every line.
- **Batch related look-ups** into one query (joins / `IN (...)`) instead of a round-trip per row.
- **Stop when the evidence settles the verdict** — don't keep scanning once you can flag or clear it.

> Statuses seen: invoices `approved`/`paid`, POs `received`, payments all `ach`. Re-verify tool names
> and exact columns live — this is a map, not a substitute for the query.
