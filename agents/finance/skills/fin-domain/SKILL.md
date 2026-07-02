---
name: fin-domain
description: McContext finance data map (world.* tables + verified columns), the live policy thresholds (materiality, price tolerance, COGS band), how to record a verdict, and the machine-readable FINDINGS block. Load this for ANY finance-controls task — it is the shared reference the six duty skills build on.
---
# Finance domain — shared reference

McContext: US burger chain, ~2,000 stores, all money **USD in CENTS**. "Today" = `world_meta.now`
(read it, don't assume). **The tools/data are ground truth** — re-derive every figure from a tool call.

## Data map (world.* — query these columns directly; don't probe schema)

- **Three-way match:** `fin_suppliers`, `fin_purchase_orders` (ordered_at, status), `fin_po_lines`
  (sku_id, ordered_qty, **agreed_unit_cost_cents**), `fin_goods_receipts` (**received_qty**, received_at),
  `fin_invoices` (subtotal/tax/**freight**/**total_cents**, status), `fin_invoice_lines` (**billed_qty**,
  **billed_unit_cost_cents**), `fin_price_list` (contracted prices), `fin_credit_memos`.
- **Payments:** `fin_payments_out` (invoice_id, amount_cents, method, **reference**, paid_at).
- **Settlement:** `fin_register_totals` (store/business_date: cash_cents, card_cents, txn_count,
  card_txn_count), `fin_card_mix`, `fin_fee_schedule`, `fin_bank_settlements` (gross/fee/net_deposit,
  deposit_date vs **covers_date**), `fin_settlement_adjustments`.
- **Registers:** `fin_register_txns` (**store_id, staff_id, business_date, txn_type** ∈
  {`sale`,`void`,`refund`,`no_sale`}**, amount_cents, card_last4, note**), `fin_staff` (**id, name, role, status**).
- **Cash:** `fin_cash_counts` (counted_cash_cents) vs `fin_register_totals.cash_cents`.
- **Context:** `stores` (**id, name, market, city** — find via `name ILIKE '%…%'`), `fin_policy`, `world_meta`.

> These columns are verified — query them directly; don't spend calls on `information_schema`,
> `SELECT *`, or `SELECT DISTINCT` just to learn the schema.

## Policy thresholds — READ `fin_policy` LIVE and apply what it says

Always query `fin_policy` (and `fin_fee_schedule`) at run time; the live table wins over the numbers below.

- **Materiality — the AND is load-bearing:** a variance is immaterial (skip) **only if under $5.00 AND
  under 0.5% of the line — *both*.** If **either** bar is breached, it is material → flag. A small
  absolute amount is not a free pass: e.g. a **$3.00** charge that is **13.9%** of a $21.60 line clears
  the $5 floor but blows past 0.5% → **material → flag**.
- **Unauthorized charges:** any freight/fee/line the invoice bills that **no PO line, price list, or
  credit memo authorizes** is unauthorized — flag it once it breaches the 0.5% bar, regardless of the
  $5 floor. (A lone freight charge no other invoice carries and no PO authorizes is the classic decoy.)
- **Price tolerance:** a billed unit price within **0.5%** of contract is within tolerance — not an
  exception even if the absolute diff exceeds $5. Flag a price variance only past **BOTH** bars.
- **COGS band:** purchasing cost ≈ **30%** of net sales; **>34%** unexplained = investigate; **<28%** favorable.

## Recording a verdict

Investigate with read tools, then **record each flag (or explicit clear) through the action tool** —
that submission is what's graded. State the evidence + exact rule before recording. When the data can't
support a verdict, record "cannot conclude" rather than guessing. **Points for real issues caught, minus
false alarms** — decoys punish the trigger-happy; a look-alike you *correctly leave alone* is a result too.

### Close with a machine-readable FINDINGS block

End your final message with ONE fenced ```json block (every number an integer in cents, each figure from
a tool result):

```json
{"findings": [
  {"duty": "three-way-match", "entity": "invoice 4821 line 3", "decision": "flag",
   "figures_cents": {"billed": 128900, "agreed": 121000, "line_total": 121000},
   "variance_cents": 7900, "variance_pct": 6.53,
   "threshold": "materiality $5 AND 0.5%", "rule": "price variance exceeds both bars"}
]}
```
`decision` ∈ `flag` | `clear` | `cannot_conclude`. Set `variance_*` null when N/A. Emit clears too.

## Work efficiently (latency + cost are scored)
Let the query do the work (aggregate in SQL); read `fin_policy`/`fin_fee_schedule` once; batch look-ups
(joins / `IN (...)`); stop once the evidence settles the verdict.
