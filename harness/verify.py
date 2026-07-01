"""Preflight — verify the setup actually works before you rely on it (deploy, post an update, etc.).

    make verify              # full check (finance agent)
    python -m harness.verify [agents/<x>]

Runs a read-only checklist and exits non-zero if anything critical fails. Never writes anything: the
one live agent turn is instructed to use only read tools (run_sql) and no submit_*/action tool.

Checks: imports · model routing · .env creds · Postgres (world.*) · Claude subscription + company MCP
(one real read-only round-trip). Use it as the "don't post random shit until it's green" gate.
"""
from __future__ import annotations

import os
import sys

OK = "\033[32m✓\033[0m"
X = "\033[31m✗\033[0m"
WARN = "\033[33m!\033[0m"


def _p(sym, msg):
    print(f"  {sym} {msg}")


def main() -> int:
    agent_dir = (sys.argv[1] if len(sys.argv) > 1 else "agents/finance").rstrip("/")
    crit_fail = 0
    print(f"t32 preflight — {agent_dir}\n")

    # 1. imports
    try:
        from . import bench, judge, models, runner, simulator  # noqa: F401
        _p(OK, "imports (harness.*)")
    except Exception as e:
        _p(X, f"imports failed: {e}")
        return 1

    # 2. model routing
    try:
        roles = {r: models.resolve(r) for r in ("agent", "simulator", "judge", "subagent")}
        _p(OK, "model routing: " + ", ".join(f"{k}={v}" for k, v in roles.items()))
    except Exception as e:
        _p(X, f"model routing failed: {e}"); crit_fail += 1

    # 3. .env creds
    runner._load_env()
    for k, critical in (("MCCTX_MCP_URL", True), ("MCP_AUTH_TOKEN", True), ("WORLD_DB_URL", False)):
        v = os.environ.get(k, "")
        if v and "$" not in v:
            _p(OK, f".env {k} set")
        else:
            _p(X if critical else WARN, f".env {k} missing"); crit_fail += int(critical)

    # 4. Postgres (read-only)
    db = os.environ.get("WORLD_DB_URL", "")
    if db and "$" not in db:
        try:
            import psycopg
            with psycopg.connect(db, connect_timeout=15) as c, c.cursor() as cur:
                cur.execute("select value from world.world_meta where key='now'")
                now = cur.fetchone()
                cur.execute("select count(*) from information_schema.tables where table_schema='world'")
                ntab = cur.fetchone()[0]
            _p(OK, f"Postgres world.* reachable ({ntab} tables; now={now[0] if now else '?'})")
        except Exception as e:
            _p(WARN, f"Postgres check failed (non-blocking): {e}")
    else:
        _p(WARN, "Postgres check skipped (WORLD_DB_URL not set)")

    # 5. Claude subscription + company MCP — one real read-only round-trip
    try:
        from .runner import Conversation
        conv = Conversation(agent_dir, readonly=True)   # hard-blocks write tools regardless of prompt
        reply = conv.send("Preflight check. Using ONLY the run_sql read tool (never any submit_*/action "
                          "tool), return the value of world_meta.now, then stop. If you cannot reach a "
                          "tool, say so plainly.")
        conv.close()
        called = [t["tool"] for t in conv.tool_calls]
        wrote = [t for t in called if any(w in t for w in ("submit_", "issue_", "escalate", "create_ticket"))]
        if wrote:
            _p(X, f"agent called a WRITE tool during preflight (should not): {wrote}"); crit_fail += 1
        elif any("run_sql" in t or "company" in t for t in called):
            _p(OK, f"subscription + company MCP working (agent ran read tools: {called or 'none'})")
            print(f"     ↳ agent said: {reply[:120].strip()}")
        else:
            _p(WARN, f"agent replied but didn't call the company MCP — check wiring. reply: {reply[:120]}")
    except Exception as e:
        _p(X, f"live agent/MCP round-trip failed: {e}"); crit_fail += 1

    print()
    if crit_fail:
        print(f"\033[31mFAIL\033[0m — {crit_fail} critical check(s) failed. Fix before you deploy or post.")
        return 1
    print("\033[32mPASS\033[0m — setup verified. Safe to proceed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
