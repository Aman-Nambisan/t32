---
name: three-way-match
description: Reconcile a supplier invoice against its PO and goods receipt — catch quantity mismatches, price variances, unauthorized charges, and tax errors. Use for supplier-invoice reviews, overcharge checks, "did they bill us correctly", three-way-match tasks.
---
# Duty: three-way match

For each PO line, reconcile **ordered** (`fin_po_lines.agreed_unit_cost_cents`, `ordered_qty`) vs
**received** (`fin_goods_receipts.received_qty`) vs **billed** (`fin_invoice_lines.billed_qty`,
`billed_unit_cost_cents`), and check the invoice header (`fin_invoices.freight`, tax, `total_cents`)
against `fin_price_list` and any `fin_credit_memos`.

Flag: quantity mismatches, price variances vs contracted/agreed cost, **unauthorized charges** (freight/
fee no PO or price list authorizes), tax errors — but **only when the amount is above the materiality
floor** in `fin_policy` (and, for price variances, past the tolerance %). A within-tolerance price diff
is not an exception.

Watch the decoy: a lone freight/fee that no PO authorizes but whose **amount is below the materiality
floor**. The obvious read is "unauthorized → flag" — the correct read is "below the floor → immaterial →
**clear it**." A tiny sub-floor charge is bait; leave it. (Read the floor from `fin_policy`; don't assume.)
