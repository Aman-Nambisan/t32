---
name: duplicate-payment
description: Find an invoice paid twice in payments_out (by reference, amount, and timing), past decoys that only look duplicate — installments and legitimate separate invoices. Use for duplicate-payment sweeps, "paid more than once" checks.
---
# Duty: duplicate payment

Scan `fin_payments_out` for the *same underlying order* paid more than once — look across
`invoice_id`, `reference`, `amount_cents`, invoice number, and timing.

**A shared supplier invoice number + equal amount is a duplicate ONLY if it's the same underlying
order.** Before flagging, verify it maps to **one PO and one goods receipt**. Two invoices that share an
invoice number and amount but sit on **two distinct POs, each with its own goods receipt**, are **two
real deliveries** — legitimate separate payments, **not** a duplicate (the supplier just reused a number).
Clear it.

Other decoys — do NOT flag: installments (e.g. 2-of-2), and distinct invoices with similar amounts and
separate references. Match on the underlying order (PO + goods receipt), not just a repeated number or amount.
