# 0007 — Boardroom mode: clearance-gated persona + in-chat generative blocks

**Decision.** The web product gets a second, PIN-gated mode ("The Boardroom"): the same Narmata
agent with CXO clearance. Different system prompt (consigliere: tax optimization, cloud-cost audit,
benchmarks — legal-only, fraud still refused), different theme/voice register (darker, slower,
pitched down), and an isolated chat thread. The model may attach `blocks` (bar/line/donut charts,
KPI stats, letterhead memos, a 3D coin-stack render) to any reply; the client renders them in-chat.

**Context.** The pitch angle is governance: *some context exists only for some people* — the same
agent answers differently depending on who's cleared to ask. Rather than a second app, one toggle
demonstrates context-scoped access on the exact same route (`/api/chat` takes a `mode`; boardroom
model is env-swappable via `NIRMALA_DARK_MODEL` independent of the public one). Blocks ride the
JSON contract the emotion engine already used, so the future CMA-agent swap stays a provider change.

**Why not a second 3D mesh for the dark mode.** Regenerating a likeness (fal.ai re-roll) is
30–60 min of stochastic risk on deadline day for marginal gain. Same mesh + scene restyle
(crimson/violet rims, villain underlight, embers, sunglasses prop, slower idle) reads instantly
as "after hours" and can't fail the demo.

**Consequences.** Boardroom numbers are a fixed simulated CFO fact-sheet in the system prompt
(disclosed in the demo) — consistent across turns, replaced by live MCP data when Penny proper is
wired in. Block payloads are server-sanitized (type whitelist, count/length clamps) so a malformed
model reply can never break the UI.
