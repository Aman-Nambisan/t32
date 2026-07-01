# 0003 — Finance is the flagship; the other three are bench-only

**Decision.** Build the full **product + pitch** around the **finance** agent only. For customer
support, data analysis, and inventory, ship a solid agent for bench points but no product.

**Context.** Four problem statements; the grade is bench + product + pitch, and product/pitch carry
the most weight (bench is one input). Team of three (Aman: agent + eval infra; Swapnil: product +
video; Karan: product + approach) can't polish four products. We're confident finance is the one we
build (team call, 2026-07-01).

**Consequences.**
- `agents/finance/` is scaffolded further (house-rules + domain-notes skills); the other three are
  thin stubs with the grounding/security spine, filled when their briefs drop.
- Product work (UI/site/walkthrough/deck) attaches to finance; deploy target Railway.
- We still register + bench all four agents — depth on finance, coverage on the rest.
- Revisit if tonight's briefs make a different PS clearly stronger for a product.
