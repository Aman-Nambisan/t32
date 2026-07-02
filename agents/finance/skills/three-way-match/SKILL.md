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
fee no PO or price list authorizes), tax errors — **only past materiality AND tolerance** (see `fin-domain`).
A within-tolerance price diff is NOT an exception. Watch the decoy: a small ($3-ish) but unauthorized
freight charge that clears the $5 floor yet breaches the 0.5% bar — **flag it**, don't wave it through.
