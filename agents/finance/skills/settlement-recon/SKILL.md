---
name: settlement-recon
description: Tie a store's register card sales to the bank deposit — expected processor fee, covers_date timing, and logged adjustments — to separate a genuine shortfall from ordinary fees and timing. Use for card settlement, bank deposit reconciliation, "did the deposit come up short" tasks.
---
# Duty: settlement reconciliation

Expected fee = Σ over card types of `card_gross × mdr_bps / 10000` + `card_txn_count × per_txn_fee_cents`
(from `fin_fee_schedule`; cardnet ≈ credit 180bps+10¢, debit 90bps+10¢, amex 250bps). Expected net ≈
gross − fee, matched to `fin_bank_settlements.net_deposit`.

A shortfall **explained** by fees, by `covers_date` ≠ `deposit_date` timing, or by a logged
`fin_settlement_adjustments` row is **NOT a leak** — clear it. Only a genuine, unexplained shortfall is a flag.
