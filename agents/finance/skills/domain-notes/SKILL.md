---
name: domain-notes
description: Finance domain knowledge the agent works from — the entities, rules, and definitions specific to McContext's books. Fill from the brief + the company data.
---
# Finance domain notes

> PLACEHOLDER — fill this once the finance brief drops and you've explored the company data (the MCP).
> This is where the agent's *domain knowledge* lives (the `menu` skill's role in the drive-thru
> example): the concepts, definitions, and rules it should treat as ground truth for the challenge.

Capture here, from the brief and the data:

- **Entities** — what objects exist (accounts, invoices, ledgers, transactions, vendors…) and how
  they relate. What each field means.
- **Rules that must hold** — reconciliation rules, approval thresholds, what "a problem" looks like,
  what's in vs out of policy. Be exact; the bench scores precision.
- **Definitions** — any term the challenge uses in a specific way (what counts as a duplicate, a
  mismatch, an anomaly).
- **What NOT to do** — actions beyond the agent's remit; things that look like problems but aren't.

Keep it factual and tight. Everything here is composed into the agent's system prompt, and shipped
to the CMA on deploy — so what you write is what it reasons from.
