"""ONE-TIME Claude Managed Agent smoke test — confirm the platform can run our deployed agent.

    python deploy/cma_smoke.py agents/finance --confirm

⚠️ THIS SPENDS CMA CREDITS. Scoring: under $50 = +5, $50–100 = 0, over $100 = −5. So run this
RARELY and deliberately — not on a schedule. It refuses to run without --confirm.

To keep it cheap and safe it sends ONE short, TOOL-FREE message (no run_sql, no submit_*), so it
neither needs the company MCP/vault wired on CMA nor touches the graded store. It only answers:
"can the platform create a session for our agent and get a reply back?"

Needs ANTHROPIC_API_KEY (your participant key) in .env, and an environment (CMA_ENVIRONMENT_ID in
.env, else it reuses an existing workspace environment). Archives the session afterwards.
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import subprocess
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from harness.runner import _load_env  # noqa: E402
import deploy.port as port  # noqa: E402

ANT = "ant"


def _ant(args: list[str]) -> dict:
    proc = subprocess.run([ANT, *args], capture_output=True, text=True)
    if proc.returncode != 0:
        sys.exit(f"[cma-smoke] `ant {' '.join(args[:2])}` failed:\n{proc.stderr.strip()}")
    out = proc.stdout.strip()
    try:
        return json.loads(out) if out else {}
    except json.JSONDecodeError:
        return {"_raw": out}


def _resolve_env() -> str:
    env_id = os.environ.get("CMA_ENVIRONMENT_ID", "").strip()
    if env_id:
        return env_id
    envs = _ant(["beta:environments", "list", "--format", "json"])
    items = envs if isinstance(envs, list) else envs.get("data", [])
    if not items:
        sys.exit("[cma-smoke] no environment found. Set CMA_ENVIRONMENT_ID in .env "
                 "(the hackathon-participant environment id from the Console).")
    # prefer a hackathon/participant env, else the first
    pick = next((e for e in items if "hack" in (e.get("name", "").lower())
                 or "participant" in (e.get("name", "").lower())), items[0])
    print(f"[cma-smoke] using environment: {pick.get('name')} ({pick.get('id')})")
    return pick["id"]


def main() -> int:
    ap = argparse.ArgumentParser(description="ONE-TIME CMA smoke test (spends credits — use rarely).")
    ap.add_argument("agent_dir", nargs="?", default="agents/finance")
    ap.add_argument("--confirm", action="store_true", help="required — acknowledges this spends CMA credits")
    args = ap.parse_args()

    if not args.confirm:
        print("⚠️  This spends CMA credits (scoring: under $50 = +5, over $100 = −5). It's a rare,\n"
              "    deliberate check — not routine. Re-run with --confirm if you really mean to.\n"
              "    Local iteration is free: use `make bench SUITE=finance`.")
        return 2

    _load_env()
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("[cma-smoke] ANTHROPIC_API_KEY not set in .env — need your participant key to reach CMA.")

    agent_dir = args.agent_dir.rstrip("/")
    print("[cma-smoke] deploying latest (create/update — cheap; the session run is the spend)…")
    port.deploy(agent_dir, name=None, dry=False)
    agent_id = port._lock_read().get(agent_dir, {}).get("agent_id")
    if not agent_id:
        sys.exit("[cma-smoke] no agent id after deploy — check deploy/agents.lock.json")

    env_id = _resolve_env()
    print("[cma-smoke] creating ONE session…")
    sess = _ant(["beta:sessions", "create", "--agent", agent_id, "--environment-id", env_id,
                 "--title", "cma-smoke (t32)", "--format", "json"])
    sid = sess.get("id")
    if not sid:
        sys.exit(f"[cma-smoke] session create returned no id: {sess}")
    print(f"[cma-smoke] session {sid} — sending one tool-free message…")

    _ant(["beta:sessions:events", "send", "--session-id", sid,
          "--event", ("{type: user.message, content: [{type: text, text: \"Smoke test. Reply with "
                      "exactly 'PENNY OK' then one short line naming your six finance duties. Do NOT "
                      "call any tool.\"}]}")])

    reply = ""
    for _ in range(20):  # poll ~60s for the agent's reply
        time.sleep(3)
        evs = _ant(["beta:sessions:events", "list", "--session-id", sid,
                    "--type", "agent.message", "--format", "json"])
        items = evs if isinstance(evs, list) else evs.get("data", [])
        texts = [b.get("text", "") for e in items for b in (e.get("content") or []) if b.get("type") == "text"]
        if texts:
            reply = "\n".join(texts)
            break

    print("\n[cma-smoke] agent reply:\n  " + (reply.strip()[:400] if reply else "(no reply within 60s — check the Console)"))
    ws = os.environ.get("CMA_WORKSPACE_SLUG", "default")
    print(f"[cma-smoke] session in Console: https://platform.claude.com/workspaces/{ws}/sessions/{sid}")

    _ant(["beta:sessions", "archive", "--session-id", sid])  # clean up
    print("[cma-smoke] session archived.")
    print("\n✅ Platform path works" if reply else "\n⚠️ No reply captured — inspect in the Console before trusting it.")
    print("   Reminder: CMA spends credits — keep total under $50 (+5). Iterate locally from here.")
    return 0 if reply else 1


if __name__ == "__main__":
    sys.exit(main())
