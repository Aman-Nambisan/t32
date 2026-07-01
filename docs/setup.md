# Team setup — run the harness on your own Claude subscription

The whole loop runs **locally on your Atlan-provided Claude subscription** (via the Claude Agent
SDK) — free-ish, high quota. The **$50 CMA workspace is scarce and won't grow much**, so we deploy
there only to spot-check a big push (see below). Day to day: **local only.**

> New teammate? The fastest path is to open this repo in Claude Code and run **`/onboard`** — it
> checks your setup, installs deps, and runs the worked example with you. This doc is the reference.

## One-time setup (each teammate)

1. **Prereqs:** Claude Code (you already have it via Atlan), `git`, `python3`, and
   [`uv`](https://docs.astral.sh/uv/) (`brew install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh`).
2. **Clone + install:**
   ```sh
   git clone https://github.com/Aman-Nambisan/t32 && cd t32
   make setup          # creates .venv, installs deps, copies .env.example → .env
   ```
3. **Authenticate your subscription** (the harness's Agent SDK uses your Claude login — no API key):
   - If you're already logged into Claude Code with your **Atlan** account, it usually just works.
   - Headless / if the harness errors on auth: run **`claude setup-token`**, then
     `export CLAUDE_CODE_OAUTH_TOKEN=<the token>` in your shell (add to `~/.zshrc` to persist).
     Or run **`claude login`** for the interactive flow.
4. **Verify:**
   ```sh
   make bench AGENT=agents/drivethru SUITE=practice CASE=ordinary-meal
   ```
   A scores table means you're set. (Uses your subscription; costs no CMA budget.)

## Daily loop (local, free-ish)

```sh
make chat  AGENT=agents/<x>                       # talk to an agent
make bench AGENT=agents/<x> SUITE=<x>             # mock bench (simulator + judge)
make bench AGENT=agents/<x> SUITE=<x> COMPARE=runs/<prev>.json   # did my change help?
```

Edit `agents/<x>/agent.yaml` + `skills/`, re-bench, compare. That's the inner loop. Do it as much as
you want — it's your subscription, not the $50.

## When to touch the CMA ($50 — sparingly)

Only **after a meaningful push**, to confirm the agent really works deployed (not just locally):

```sh
make deploy-dry AGENT=agents/<x>     # preview the ant command, spends nothing
make deploy     AGENT=agents/<x>     # creates/updates the managed agent — SPENDS the $50
```

Deploy prereqs (one-time): install the `ant` CLI (`brew install anthropics/tap/ant`) and put your
**participant** Anthropic key from 1Password into `.env` (`ANTHROPIC_API_KEY=`). **Use your key,
never the judge key.** Check remaining spend in the Console after each run — we get only 3 bench
lives per challenge, so validate locally first.

## Divide the work

Each person can own an agent+suite and iterate independently on their own subscription — no shared
quota to fight over. Only deploys touch the shared $50. Coordinate deploys in the team DM.

## Trouble?

- **Auth error from the harness** → `claude setup-token` + export `CLAUDE_CODE_OAUTH_TOKEN` (step 3).
- **`ant: command not found`** → only needed for deploy; `brew install anthropics/tap/ant`.
- **Import errors** → re-run `make setup`; confirm `.venv` exists.
- Anything else → team DM, or `#atlan-ai-hackathon-2026`.
