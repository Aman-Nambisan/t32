# Decision log (ADRs)

Short records of the choices that shape this repo and **why** — so a teammate or a fresh Claude Code
thread can understand a decision before changing it, without reverse-engineering it from the code.

One file per decision: `NNNN-slug.md`, each with **Decision · Context · Consequences**. Keep the
*why* human-authored (don't let it get auto-generated into something plausible-but-wrong). Add one
whenever we make a non-obvious call (a framework/model/structure choice, a scoring-strategy bet).

| # | Decision |
|---|---|
| [0001](0001-local-first-eval.md) | Local-first eval loop (mock bench on the subscription) |
| [0002](0002-model-routing.md) | Central model routing; not Opus-only |
| [0003](0003-finance-flagship.md) | Finance is the flagship product; other 3 are bench-only |
| [0004](0004-deploy-parity.md) | Deploy composes the same system+skills as local (parity) |
