"""Run an agent (its agent.yaml + attached skills) locally via the **Claude Agent SDK**, on your
**Claude subscription** — the fast, free-ish local loop for iterating before you push a real Claude
Managed Agent to the $50-capped workspace.

Vendored and lightly adapted from the hackathon onboarding repo's `localdev/runner.py` so this repo
stands alone. The only change: `_load_env` reads the **repo-root** `.env` (not a localdev/.env).

Auth: your own Claude subscription. Authenticate the Claude Code CLI once —
  claude setup-token   (sets CLAUDE_CODE_OAUTH_TOKEN — good for headless), or
  claude login         (interactive)
— and the Agent SDK uses it. No Anthropic API key here (that's only for pushing to the CMA
workspace via `deploy/port.py`).

An agent gets exactly the tools it declares in `mctools`: your own function tools (mctools/<name>/
tool.py) and/or remote MCP servers you wire yourself (e.g. the company MCP). Declare nothing and it
is a pure conversational agent.

`Conversation` wraps the async SDK client behind a plain sync `.send(text)`.
"""
import asyncio
import json
import os
import pathlib

import yaml
from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    SystemMessage,
    TextBlock,
    ToolUseBlock,
    create_sdk_mcp_server,
    tool,
)

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent


def _load_env() -> None:
    """Load repo-root `.env` (yours) or `.env.example` (fallback) into the environment without
    overriding anything already set. Keeps the company-MCP token and workspace key out of git;
    reference them from agent.yaml as ${MCCTX_MCP_URL} etc."""
    for fn in (".env", ".env.example"):
        p = REPO_ROOT / fn
        if not p.is_file():
            continue
        for line in p.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())
        break  # your own .env wins; fall back to .env.example only when there's no .env


def load_agent(agent_dir: str):
    """Compose the system prompt: agent.yaml `system` + each attached skill's SKILL.md body
    (read from <agent_dir>/skills/<name>/SKILL.md). Path-agnostic — point it at any agent folder.

    This mirrors how a deployed CMA composes model + system + skills, so what you tune locally is
    what you ship."""
    from .models import resolve
    base = pathlib.Path(agent_dir)
    cfg = yaml.safe_load((base / "agent.yaml").read_text())
    model = cfg.get("model") or resolve("agent")
    system = (cfg.get("system") or "").strip()
    for name in cfg.get("skills") or []:
        skill = base / "skills" / name / "SKILL.md"
        if skill.exists():
            system += f"\n\n---\n# Attached skill: {name}\n\n{skill.read_text()}"
    return model, system


def _load_function_tools(agent_dir: str, names: list[str]):
    """Each STRING entry in `mctools` is a function tool at mctools/<name>/tool.py
    (NAME / DESCRIPTION / INPUT_SCHEMA + run(args)). Wrap each as an in-process SDK tool.
    Skips anything malformed (never crash the chat)."""
    import importlib.util
    sdk_tools, tool_names = [], []
    for name in names:
        tp = pathlib.Path(agent_dir) / "mctools" / name / "tool.py"
        if not tp.is_file():
            print(f"  [harness] mctools '{name}': no mctools/{name}/tool.py — skipped")
            continue
        try:
            spec = importlib.util.spec_from_file_location(f"_mctool_{name}", tp)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
        except Exception as e:
            print(f"  [harness] mctools '{name}': failed to load ({e}) — skipped")
            continue
        if not hasattr(mod, "run"):
            print(f"  [harness] mctools '{name}': no run(args) function — skipped")
            continue
        tname = str(getattr(mod, "NAME", name))
        desc = str(getattr(mod, "DESCRIPTION", "") or tname)
        schema = getattr(mod, "INPUT_SCHEMA", None) or {"type": "object", "properties": {}}

        @tool(tname, desc, schema)
        async def _wrapped(args: dict, _run=mod.run):
            res = _run(args)
            text = res if isinstance(res, str) else json.dumps(res, default=str)
            return {"content": [{"type": "text", "text": text}]}

        sdk_tools.append(_wrapped)
        tool_names.append(tname)
        print(f"  [harness] loaded custom tool '{tname}' from mctools/{name}/tool.py")
    return sdk_tools, tool_names


def _remote_mcp_servers(entries: list[dict]):
    """DICT entries in `mctools` are remote MCP servers ({name, url}); the agent connects directly.
    (A {name, command, ...} stdio form is also accepted.) `${VARS}` in url/command/args/env are
    expanded from the environment (and .env), so you can keep a token out of a committed file."""
    servers: dict = {}
    allowed: list[str] = []
    ex = os.path.expandvars
    for entry in entries:
        name = entry.get("name")
        if not name:
            print(f"  [harness] skipping mctools entry (mapping needs `name`): {entry!r}")
            continue
        if entry.get("url"):
            servers[name] = {"type": entry.get("transport", "http"), "url": ex(str(entry["url"]))}
        elif entry.get("command"):
            servers[name] = {"type": "stdio", "command": ex(str(entry["command"])),
                             "args": [ex(str(a)) for a in (entry.get("args") or [])],
                             "env": {k: ex(str(v)) for k, v in (entry.get("env") or {}).items()}}
        else:
            print(f"  [harness] skipping mctools '{name}' — needs `url` (remote MCP) or `command`")
            continue
        allowed += ([f"mcp__{name}__{t}" for t in entry["tools"]] if entry.get("tools")
                    else [f"mcp__{name}"])
        print(f"  [harness] loaded remote MCP server '{name}' from mctools")
    return servers, allowed


def build_options(agent_dir: str) -> ClaudeAgentOptions:
    model, system = load_agent(agent_dir)
    cfg = yaml.safe_load((pathlib.Path(agent_dir) / "agent.yaml").read_text()) or {}
    entries = cfg.get("mctools") or []
    fn_tools, _ = _load_function_tools(agent_dir, [e for e in entries if isinstance(e, str)])
    servers, allowed = _remote_mcp_servers([e for e in entries if isinstance(e, dict)])

    # No tools are injected for you. The agent gets exactly what it declares in `mctools`.
    if fn_tools:
        servers["custom"] = create_sdk_mcp_server(name="custom", version="1.0.0", tools=fn_tools)
        allowed.append("mcp__custom")

    return ClaudeAgentOptions(
        model=model,
        system_prompt=system,
        mcp_servers=servers,
        # scoped to exactly what the agent declares — deliberately NOT the ambient/built-in tools
        # a deployed managed agent wouldn't have either.
        allowed_tools=allowed,
        tools=[],
        setting_sources=[],
    )


class Conversation:
    """A multi-turn chat with one agent. `.send(text)` returns the agent's reply text; conversation
    state persists for the life of the object. `.tool_calls` is the running trace (what the judge
    reads). `.transcript` is the full [{role, text}] history."""

    def __init__(self, agent_dir: str):
        _load_env()
        self.agent_dir = agent_dir
        self.options = build_options(agent_dir)
        self.model = self.options.model
        self.tool_calls: list[dict] = []      # every tool the agent calls — the "trace"
        self.transcript: list[dict] = []       # [{role: "user"|"agent", text: str}]
        self._loop = asyncio.new_event_loop()
        self._client = ClaudeSDKClient(options=self.options)
        self._loop.run_until_complete(self._client.connect())
        if any(isinstance(s, dict) and s.get("type") in ("http", "sse")
               for s in self.options.mcp_servers.values()):
            print("  [harness] connecting to your remote MCP tools…")
            self._loop.run_until_complete(self._warm_up())

    def send(self, text: str) -> str:
        self.transcript.append({"role": "user", "text": text})
        reply = self._loop.run_until_complete(self._turn(text))
        self.transcript.append({"role": "agent", "text": reply})
        return reply

    async def _warm_up(self, timeout_s: float = 25.0) -> None:
        import time as _t
        deadline = _t.monotonic() + timeout_s
        while _t.monotonic() < deadline:
            await self._client.query("(harness warmup — reply OK)")
            pending = False
            async for msg in self._client.receive_response():
                if isinstance(msg, SystemMessage):
                    servers = (getattr(msg, "data", {}) or {}).get("mcp_servers") or []
                    pending = any(s.get("status") == "pending" for s in servers)
            if not pending:
                return
            await asyncio.sleep(1)

    async def _turn(self, text: str) -> str:
        await self._client.query(text)
        out: list[str] = []
        async for msg in self._client.receive_response():
            if isinstance(msg, AssistantMessage):
                for block in msg.content:
                    if isinstance(block, TextBlock):
                        out.append(block.text)
                    elif isinstance(block, ToolUseBlock):
                        self.tool_calls.append({"tool": block.name, "input": block.input})
        return "".join(out).strip()

    def close(self):
        try:
            self._loop.run_until_complete(self._client.disconnect())
        finally:
            self._loop.close()
