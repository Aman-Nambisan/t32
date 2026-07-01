# 0004 — Deploy composes the same system+skills as local (parity)

**Decision.** `deploy/port.py` builds the CMA's system prompt with the **same**
`harness/runner.load_agent` composition the local harness uses (system + attached skill markdown),
from the same `agent.yaml`. One source, one behavior.

**Context.** The Claude Agent SDK (local) and the CMA deploy surface (`ant` / `client.beta.agents`)
are **different products** — the config *concepts* (model / system / tools / mcp_servers / skills)
carry over, but the agent loop, built-in tools, and auth do not. If we hand-maintained a separate
CMA definition, local bench results wouldn't predict deployed behavior.

**Consequences.**
- What you mock-bench locally is what you ship. Skills compose into `system` on both sides (v1);
  native CMA `skills[]` (progressive disclosure) is a later optimization.
- **MCP wiring (in progress).** A CMA needs an `mcp_servers[]` entry **and** a `tools` `mcp_toolset`
  referencing it by name — unreferenced servers are rejected. Critically, an `mcp_toolset` defaults
  to `permission_policy: always_ask`, which **stalls the unattended bench** (it waits for a
  confirmation nobody sends) — so `port.py` must set it to `always_allow`. MCP **auth** goes on the
  *session* via `vault_ids` (exact URL match), never on the agent def. Wiring this into `port.py` is
  the next deploy task; until then it deploys model+system(+skills) and warns on remote MCP `mctools`.
  Full verified shapes: `docs/research/engineering-brief.md`.
- `deploy/agents.lock.json` (committed) shares one agent id per agent across the team; `update`
  fetches the live version to avoid stale-overwrite 409s.
