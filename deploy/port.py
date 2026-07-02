"""One-command port: local agent.yaml  →  Claude Managed Agent in the workspace.

    python deploy/port.py agents/example                 # create or update; prints id + version
    python deploy/port.py agents/example --dry-run        # show the exact `ant` command, run nothing
    python deploy/port.py agents/example --name "Fin Agent"

WHY THIS EXISTS: the whole team iterates locally on the Claude subscription (free-ish), then spends
the $50 CMA budget only to validate on the real bench. This script is the bridge — it turns the
*same* agent.yaml the local harness runs into a real deployed agent, so what you tested is what you
ship.

PARITY: it composes the system prompt with `harness.runner.load_agent` — the exact same
system+skills composition the local runner uses — so the deployed agent behaves like your local one.

STATE: the deployed agent id per agent folder is recorded in deploy/agents.lock.json (committed, so
the team shares one agent id and versions accumulate under it). First deploy = create; later deploys
= update (a new version). `--version` for update is fetched live from the workspace to avoid stale
overwrites.

AUTH: needs ANTHROPIC_API_KEY (your participant key) in the repo-root .env. Never printed.

TOOLS / COMPANY MCP: composes model + system(+skills), and wires any remote MCP `mctools` from
agent.yaml into the CMA — each becomes an `mcp_servers` entry + a `mcp_toolset` tool referencing it,
with permission_policy `always_allow` (the default `always_ask` STALLS the unattended bench). Set
`builtin_tools: true` in agent.yaml to also enable the built-in toolset (bash/read/…; off by default).
MCP AUTH (the token) attaches at session/bench time via a vault, not on the agent def — configure it
on the platform/Console. Verified shapes: docs/research/engineering-brief.md §2.2; see docs/architecture.md §deploy.
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import subprocess
import sys
import yaml

# import the SAME composition the local harness uses → deployed system == local system
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from harness.runner import REPO_ROOT, _load_env, load_agent  # noqa: E402

ANT = "ant"
LOCK = pathlib.Path(__file__).resolve().parent / "agents.lock.json"


def _lock_read() -> dict:
    return json.loads(LOCK.read_text()) if LOCK.is_file() else {}


def _lock_write(d: dict) -> None:
    LOCK.write_text(json.dumps(d, indent=2) + "\n")


def _run_ant(args: list[str], dry: bool) -> dict:
    redacted = " ".join(a if not a.startswith("sk-ant") else "sk-ant-***" for a in args)
    print(f"  $ {redacted}")
    if dry:
        return {}
    proc = subprocess.run(args, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.exit(f"[port] `ant` failed (exit {proc.returncode}):\n{proc.stderr.strip()}")
    out = proc.stdout.strip()
    try:
        return json.loads(out) if out else {}
    except json.JSONDecodeError:
        print(out)
        return {}


def _current_version(agent_id: str) -> int | None:
    proc = subprocess.run([ANT, "beta:agents", "retrieve", "--agent-id", agent_id, "--format", "json"],
                          capture_output=True, text=True)
    if proc.returncode != 0:
        return None
    try:
        return int(json.loads(proc.stdout).get("version"))
    except (json.JSONDecodeError, TypeError, ValueError):
        return None


def deploy(agent_dir: str, name: str | None, dry: bool) -> None:
    _load_env(agent_sdk=False)  # deploy needs ANTHROPIC_API_KEY in env for `ant` (unlike the harness)
    agent_dir = agent_dir.rstrip("/")
    base = pathlib.Path(agent_dir)
    if not (base / "agent.yaml").is_file():
        sys.exit(f"[port] no agent.yaml in {agent_dir}")

    cfg = yaml.safe_load((base / "agent.yaml").read_text()) or {}
    model, system = load_agent(agent_dir)          # composes system + attached skills, like local
    display_name = name or cfg.get("name") or base.name

    # Wire remote MCP servers (e.g. the company MCP). Verified rules (docs/research/engineering-brief.md
    # §2.2): every mcp_servers entry MUST be referenced by a `mcp_toolset` tool or the API rejects the
    # def; and the mcp_toolset defaults to permission_policy `always_ask`, which STALLS the unattended
    # bench (it waits for a confirmation nobody sends) — so we force `always_allow`. MCP AUTH (the
    # token) attaches at session/bench time via a vault, not on the agent def — set that up separately.
    remote_mcp = [e for e in (cfg.get("mctools") or []) if isinstance(e, dict) and e.get("url")]
    tool_flags: list[str] = []
    mcp_flags: list[str] = []
    if cfg.get("builtin_tools"):   # opt-in: bash/read/write/edit/glob/grep/web_* (off by default)
        tool_flags += ["--tool", "{type: agent_toolset_20260401}"]
    for e in remote_mcp:
        mname = e.get("name")
        url = os.path.expandvars(str(e.get("url", "")))
        if not mname or not url or "$" in url:
            print(f"  [port] ⚠ skipping MCP entry {e!r} — needs name + resolvable url "
                  f"(is the ${{VAR}} set in .env?)")
            continue
        mcp_flags += ["--mcp-server", f'{{type: url, name: {mname}, url: "{url}"}}']
        tool_flags += ["--tool", (f"{{type: mcp_toolset, mcp_server_name: {mname}, "
                                   f"default_config: {{permission_policy: {{type: always_allow}}}}}}")]
        print(f"  [port] wiring MCP '{mname}' → {url.split('://')[0]}://…  (permission: always_allow)")
    if remote_mcp:
        print("  [port] note: MCP auth (the token) attaches at session/bench time via a vault, not "
              "here — set it up in the Console (docs/architecture.md §deploy).")

    lock = _lock_read()
    key = str(base)
    existing_id = lock.get(key, {}).get("agent_id")

    if existing_id:
        cur = _current_version(existing_id)
        if cur is None and not dry:
            print(f"  [port] lock has {existing_id} but couldn't retrieve it — creating fresh.")
            existing_id = None

    if existing_id:
        print(f"[port] updating {display_name}  (id={existing_id}, current v{cur}) → new version")
        args = ([ANT, "beta:agents", "update", "--agent-id", existing_id, "--version", str(cur),
                 "--model", f"{{id: {model}}}", "--system", system, "--name", display_name]
                + tool_flags + mcp_flags + ["--format", "json"])
        res = _run_ant(args, dry)
    else:
        print(f"[port] creating {display_name}  (model={model})")
        args = ([ANT, "beta:agents", "create", "--name", display_name,
                 "--model", f"{{id: {model}}}", "--system", system]
                + tool_flags + mcp_flags + ["--format", "json"])
        res = _run_ant(args, dry)

    if dry:
        print("[port] dry run — nothing deployed.")
        return

    agent_id = res.get("id") or existing_id
    version = res.get("version")
    if agent_id:
        lock[key] = {"agent_id": agent_id, "name": display_name, "last_version": version}
        _lock_write(lock)

    print("\n[port] ✅ deployed")
    print(f"       agent id : {agent_id}")
    print(f"       version  : {version}")
    print(f"       → paste the agent id into the McContext platform's Deploy page (Register → Resolve).")
    print(f"       → validate on the bench (3 lives), then submit. Check spend in the Console (the $50 cap).")


def main():
    ap = argparse.ArgumentParser(description="Port a local agent.yaml to a Claude Managed Agent.")
    ap.add_argument("agent_dir", help="path to an agent folder (has agent.yaml), e.g. agents/example")
    ap.add_argument("--name", default=None, help="override the display name")
    ap.add_argument("--dry-run", action="store_true", help="print the ant command, deploy nothing")
    args = ap.parse_args()
    deploy(args.agent_dir, args.name, args.dry_run)


if __name__ == "__main__":
    main()
