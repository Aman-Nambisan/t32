---
name: cogs-leakage
description: Check food/purchasing cost as a share of net sales per store-period against the 30/34/28 band — aggregate first, drill only if over-band. Use for margin reviews, COGS/food-cost checks, "are we spending more on ingredients than sales require" tasks.
---
# Duty: COGS leakage

Compute it **cheaply at the aggregate first**: total purchasing cost ÷ net sales for the store-period,
compared to the **band in `fin_policy`** (target / investigate-above / favorable-below — read the live
values, don't assume).

**Only if it is above the investigate line** drill into a price/mix explanation (contracted-price change,
product mix). Do **not** reconstruct recipe-level theoretical cost unless the band is breached AND the
cause is genuinely unclear. Stop once the band call is settled — no spiral.

An **implausibly favorable** ratio (far below the favorable line) almost always means **incomplete
purchasing data** for the window, not a real win — report `cannot_conclude` / flag the data gap rather
than declaring "favorable."
