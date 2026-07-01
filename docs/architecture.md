# Architecture — how this repo works and why

Read this when you need the shape of the system or the reasoning behind a choice. Standing rules live
in `AGENTS.md`; per-decision rationale lives in `docs/decisions/`. This is the map that ties them
together.

## The core idea: local-first, one-command port

The CMA workspace is capped at **$50**, but local dev on the Claude **subscription** is free-ish.
So we do everything we can locally and spend the $50 only to validate on the real bench:

```
 build agent.yaml + skills ──► chat / mock-bench locally (subscription, free)
        │                              │  iterate: edit → bench → compare
        │                              ▼
        └──────────────► deploy/port.py ──► Claude Managed Agent (id + version)  ──► platform bench (3 lives) ──► submit
                          (same agent.yaml)        spends the $50
```

Local and deployed share **one `agent.yaml`** and the **same system+skills composition**
(`harness/runner.load_agent`, reused by `deploy/port.py`), so what you bench is what you ship.

## Repo layout (pointers, not prose)

- `agents/<x>/` — an agent: `agent.yaml` (model + system + skills + mctools) and `skills/<name>/SKILL.md`.
  `agents/example/` is the template; `agents/drivethru/` is a runnable worked example.
- `suites/<x>/` — an eval suite: `cases.yaml` + `rubric.yaml`. `suites/_template/` to copy.
- `harness/` — the local loop: `runner.py` (the agent), `simulator.py` + `judge.py` + `bench.py`
  (the mock bench), `chat.py` (manual REPL), `models.py` (model routing).
- `deploy/port.py` — one-command `agent.yaml → CMA`. `deploy/agents.lock.json` maps agent → id.
- `models.yaml` — central model routing. `docs/` — these guides. `runs/` — saved bench results (gitignored).

## The harness

`harness/runner.py` is vendored from the onboarding repo's `localdev/runner.py` (adapted to read the
repo-root `.env`) — we build on it rather than reinvent it. `Conversation(agent_dir)` runs an agent
on the subscription via the Claude Agent SDK and records `.transcript` + `.tool_calls`. The mock
bench wraps that with a simulator + judge. See `docs/eval-guide.md`.

## Deploy / port  §deploy

`deploy/port.py` composes model + system(+skills) exactly as the local runner does, then calls
`ant beta:agents create` (first time) or `update` (later, fetching the current version live to avoid
stale overwrites). The agent id is recorded in `deploy/agents.lock.json` (committed) so the team
shares one id per agent and versions accumulate.

**Company MCP wiring (done).** `port.py` reads remote MCP entries from `agent.yaml` `mctools` and emits
both an `mcp_servers` entry and a `tools` `mcp_toolset` referencing it by name (an unreferenced server
is rejected), with `permission_policy: always_allow` — the default `always_ask` **stalls the
unattended bench**, so this is the single highest-value deploy fix. MCP **auth** (the token) attaches
at session/bench time via a **vault** (exact URL match), never on the agent def — configure it on the
platform/Console (open item; `docs/research/engineering-brief.md` §8). `builtin_tools: true` in
agent.yaml adds the `agent_toolset_20260401` built-in tools (off by default). See
`docs/decisions/0004-deploy-parity.md` and the brief §2.2.

**Multi-agent / sub-agents (the "final thing").** A CMA can be a `multiagent` coordinator that
delegates to a roster of other agents (each its own thread, model, tools) — one level deep. This is
how "one agent with sub-agents for smaller tasks" maps onto the platform: a coordinator on
opus/sonnet spawning `haiku-4-5` sub-agents (the `subagent` role in `models.yaml`) for cheap subtasks.
`port.py` will grow a `--multiagent` path once we need it; the verified topology shape is in
`docs/research/`.

## Model routing

One place — `models.yaml` — routes every role, so we can run cheaper models (Sonnet/Haiku) where they
suffice and swap globally in one edit. Full rationale + the cost model in `docs/models.md` and
`docs/decisions/0002-model-routing.md`.

## Observability  §tracing

Claude Code and the Agent SDK share one telemetry engine (OTLP), so one config traces both our
harness runs and our own Claude Code sessions. Sink: **HyperDX** (one container, all three signals) —
`make trace-up`, then the `OTEL_*` block in `.env`. Setup + gotchas (use `http/protobuf` on 4318, not
gRPC; keep content-logging off) in `traces/README.md`; rationale in `docs/research/engineering-brief.md` §5.

## Adversarial suite seed  §adversarial

The bench scores security + grounding hardest. A cited catalog of adversarial categories (prompt
injection, fake authority, PII extraction, free-item coercion, over-reach, tool-result poisoning)
with example turns is in `docs/research/engineering-brief.md` §6 and `docs/research/dossier.md`
(`adversarial` lane); `suites/practice/` has a starter set. Seed each challenge's suite from these.

## Decisions

The "what we chose and why" lives in `docs/decisions/` (ADR log). Start there to understand a choice
before changing it.
