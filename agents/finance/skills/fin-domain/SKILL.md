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

## Policy thresholds — READ `fin_policy` LIVE, then apply judgment

Query `fin_policy` (and `fin_fee_schedule`) at run time and apply the **exact thresholds it states** —
never assume or restate numbers from memory; the live table is the source of truth. It gives you an
absolute **materiality floor**, a **price-tolerance %**, and the **COGS band**. Apply them like this:

- **The materiality floor is a HARD floor.** A variance or added charge whose **absolute amount is below
  the floor is immaterial — clear it** — *even if* it is a large percentage of a small line, and *even
  if* it looks "unauthorized." Don't let a big-%-of-a-small-line reading override the absolute floor.
- **The price-tolerance %** is a second bar for **price variances at/above the floor**: a billed unit
  price within tolerance of contract is not an exception, even when the dollar gap clears the floor.
- **Above the floor**, genuine price / quantity / duplicate / unauthorized-charge / tax errors MUST be flagged.

Learn the calls from patterns (always compute against the *live* thresholds, never fixed numbers):
- A lone freight/fee that no PO authorizes but whose amount is **below the materiality floor** → **clear**.
  The obvious read is "unauthorized → flag"; the correct read is "below the floor → immaterial." This is
  a classic **decoy** — a tiny sub-floor charge that baits a false alarm. Leave it.
- A unit price off by **more than the tolerance %** *and* a dollar gap **above the floor** → **flag** (price variance).
- Billed qty ≠ received qty by an amount **above the floor** → **flag** (quantity variance).

**COGS band:** compute purchasing cost ÷ net sales for the store-period and compare to the band in
`fin_policy` (target / investigate-above / favorable-below). An *implausibly* favorable ratio usually
means incomplete purchasing data for the window — say `cannot_conclude` / flag the gap, don't declare
"favorable."

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
   "threshold": "per fin_policy: above materiality floor + price tolerance", "rule": "price variance exceeds both bars"}
]}
```
`decision` ∈ `flag` | `clear` | `cannot_conclude`. Set `variance_*` null when N/A. Emit clears too.

## Work efficiently (latency + cost are scored)
Let the query do the work (aggregate in SQL); read `fin_policy`/`fin_fee_schedule` once; batch look-ups
(joins / `IN (...)`); stop once the evidence settles the verdict.
