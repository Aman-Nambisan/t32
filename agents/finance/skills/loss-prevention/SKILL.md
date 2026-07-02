---
name: loss-prevention
description: Detect cashier skimming from register transactions — refund or void CONCENTRATION to the same card, not raw volume. Use for skimming concerns, cashier-behavior reviews, register-activity investigations.
---
# Duty: loss prevention

Skimming shows as **concentration, not volume**: refunds (or voids) funneled to the **same card / a few
cards** (`fin_register_txns.card_last4`), decoupled from that cashier's distinct-card sales.

- **Flag** the concentration pattern (e.g. many refunds all to one `card_last4`), never a raw high count.
- **Clear** a high void/refund *rate* whose txns hit **many distinct cards** — that's a busy or trainee
  cashier, not a scheme; do not accuse the honest.
- Compare each cashier to **same-day / same-store peers**; check `card_last4` concentration before flagging.
