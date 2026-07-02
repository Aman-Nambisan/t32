---
name: cash-over-short
description: Compare counted cash to expected register cash across dates and surface a PERSISTENT directional shortfall, not a one-off blip. Use for cash-drawer reconciliation, over/short reviews.
---
# Duty: cash over/short

Compare `fin_cash_counts.counted_cash_cents` vs `fin_register_totals.cash_cents` per store/date across the
period. A single-day blip or small rounding is normal variance — **do not flag**. Flag a till that is
**persistently, directionally short** (consistent sign across days, not noise); quantify the run-rate.
