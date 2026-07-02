---
name: duplicate-payment
description: Find an invoice paid twice in payments_out (by reference, amount, and timing), past decoys that only look duplicate — installments and legitimate separate invoices. Use for duplicate-payment sweeps, "paid more than once" checks.
---
# Duty: duplicate payment

Scan `fin_payments_out` grouped by `invoice_id` / `reference` / `amount_cents`. A **true duplicate** =
the *same invoice* paid twice (same `invoice_id`, or same `reference`, with near-identical amount + close
timing).

Decoys that only *look* duplicate — **do NOT flag**: distinct invoices with similar amounts, installments
(e.g. 2-of-2), and separate references. Match on the invoice/reference identity, not just a repeated amount.
