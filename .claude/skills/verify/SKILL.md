---
name: verify
description: Preflight check — run before you deploy, post an update to the channel, or claim something works. Verifies creds + Postgres + the company MCP + the agent round-trip (read-only), and reports PASS/FAIL. Use this as the "don't post random shit until it's green" gate.
---

# /verify — check it actually works before you act

Purpose: **verify before doing something outward-facing** (deploying to the $50 CMA, posting progress
to `#hack-2026-t32`, telling the team it works). Don't take an action that implies "it works" until
this is green.

## Do this

1. Run the preflight (read-only — it never submits or writes anything):
   ```sh
   make verify                 # defaults to agents/finance
   # or: make verify AGENT=agents/<x>
   ```
   It checks: harness imports · model routing · `.env` creds (MCP url/token, WORLD_DB_URL) · Postgres
   `world.*` reachable · Claude subscription + company MCP working (one real `run_sql` round-trip).

2. **Read the result:**
   - **PASS** → the plumbing is real. Safe to proceed (bench, deploy, or post an update).
   - **FAIL** → do NOT proceed. Fix what's red first:
     - missing `.env` creds → paste them from the team DM (`MCCTX_MCP_URL`, `MCP_AUTH_TOKEN`,
       `WORLD_DB_URL`).
     - live round-trip failed → likely subscription auth: `claude setup-token` (or `claude login`),
       then re-run.
     - agent called a write tool → a prompt/skill bug; fix before it can touch graded state.

3. **If the user asked you to post/deploy off the back of this,** only do it once verify is PASS —
   and for anything that spends the $50 or posts to a channel, show the exact command/message and get
   a quick confirm first. Verify proves it *works*; it doesn't replace the user's go-ahead to *act*.

## Note
`make verify` is read-only by design: the one live agent turn is told to use only `run_sql` and no
`submit_*`/action tool, and the preflight fails loudly if the agent calls a write tool anyway.
