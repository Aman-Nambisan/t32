# Tracing / observability

**Why:** the bench scores efficiency and penalizes going off-task, and "why did the agent do that?"
is otherwise invisible. Claude Code **and** the Claude Agent SDK share one telemetry engine (the SDK
runs the CLI as a child process), so pointing them at an OTLP sink traces *both* our harness runs and
our own Claude Code sessions — same config, nothing extra to instrument.
([Agent SDK observability](https://code.claude.com/docs/en/agent-sdk/observability))

## Quick start

```sh
make trace-up                     # start HyperDX (one container) → UI at http://localhost:8080
# then load the OBSERVABILITY vars from .env into the shell that runs claude / the harness:
set -a && . ./.env && set +a      # (after uncommenting the OTEL_* block in .env)
make bench AGENT=agents/finance SUITE=finance     # spans show up in HyperDX
make trace-down                   # stop it
```

## What you get

- **Span tree** (beta — needs `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1`): `claude_code.interaction`
  (root) → `llm_request` / `tool` / `hook`; Task-subagents nest under their parent `tool` span.
- **Metrics** (GA): cost, tokens, session counts — watch spend against the $50 cap.
- **Free security/efficiency events**: `claude_code.tool_decision`, `claude_code.api_refusal`
  (on `stop_reason: refusal`), `claude_code.mcp_server_connection`, `claude_code.skill_activated`.

## Rules that bite

- **Use `http/protobuf` on port 4318** (the `.env` default). Claude Code's own examples default to
  gRPC/4317, which **silently fails** against Langfuse. 4318 works with HyperDX, Langfuse, and a
  plain collector. ([Langfuse OTel](https://langfuse.com/integrations/native/opentelemetry))
- **Never use the `console` exporter with the Agent SDK** — stdout is the SDK's message channel;
  console telemetry corrupts it. (That's why the harness never sets it.)
- **Keep content-logging OFF** (`OTEL_LOG_USER_PROMPTS` / `OTEL_LOG_TOOL_DETAILS` /
  `OTEL_LOG_TOOL_CONTENT` / `OTEL_LOG_RAW_API_BODIES`) — turn on only to debug a specific failure.
- Short agent runs drop spans on exit unless you flush fast — the `.env` sets
  `OTEL_*_EXPORT_INTERVAL=1000`.
- Set `OTEL_SERVICE_NAME` per agent to separate them on the sink.

## Optional: Langfuse as an LLM-trace lens

HyperDX is the default all-in-one sink. For a purpose-built LLM/agent trace view, add **Langfuse
Cloud** (free tier) — but it ingests **traces only** (no metrics/logs) and **no gRPC**. Set only
`OTEL_TRACES_EXPORTER=otlp`, endpoint `https://cloud.langfuse.com/api/public/otel` (EU) /
`https://us.cloud.langfuse.com/api/public/otel` (US), and
`OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic $(echo -n 'pk-lf-...:sk-lf-...' | base64),x-langfuse-ingestion-version=4"`.
([Langfuse OTel](https://langfuse.com/integrations/native/opentelemetry))

Full rationale + citations: `../docs/research/engineering-brief.md` §5 and `../docs/research/dossier.md`.
