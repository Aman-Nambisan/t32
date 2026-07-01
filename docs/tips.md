# Tips & tricks — highest-leverage first

Distilled from the research pass (`docs/research/engineering-brief.md`, cited there). Ordered by
leverage for our two constraints: the **$50 CMA cap** and **how the bench grades** (grounding,
security, distraction, efficiency, accuracy, tone).

1. **Iterate 100% locally; spend CMA budget only on graded runs.** Local runs on the subscription are
   ~free; the $50 is for the final bench. Keep `agent.yaml` aligned with CMA field names so the port
   is mechanical. → `docs/decisions/0001`, `docs/models.md`.

2. **Set `always_allow` on the MCP toolset before every bench run.** The default `always_ask` stalls
   the *unattended* bench (it waits for a confirmation nobody sends). `port.py` does this for you — the
   single highest-leverage config fix. Need a security posture? scope *down* (`enabled: false` + an
   explicit safe-tool allowlist), don't open everything.

3. **Make "cite the tool, never trust the user" the spine of the agent.** For a commerce/finance agent
   this satisfies **both** grounding and security in one behavior: never accept a customer's claimed
   price/balance/discount/authority — consult the tool and cite it. This is baked into the `house-rules`
   skill; keep it.

4. **Deliver real capability via the company URL MCP**, not local/in-process or CMA custom tools —
   there's no bench answerer for custom tools, and the API only supports URL MCP servers anyway.

5. **Prefer skills over a bloated system prompt** for grounding/domain knowledge — they load on demand.
   But re-verify they trigger on the *deployed* CMA (progressive disclosure ≠ always-inlined), don't
   clear the built-in `read` tool skills need, and stay under 20 skills/session. (Our `port.py` currently
   composes skills *into* system for local↔deploy parity — revisit native skills if context gets tight.)

6. **Pin the graded session to a specific agent version** so a mid-hackathon `update` can't silently
   change grading behavior. Register `id + version`, not just the id.

7. **Watch spend + cache.** Track the session `usage` after each run against the $50; keep bench runs
   back-to-back to stay inside the 5-min prompt-cache TTL; under a multi-agent coordinator, put a
   **Haiku** sub-agent below an Opus/Sonnet coordinator for cheap subtasks (`roles.subagent`).

8. **Gate on the local eval diff, and don't chase noise.** Prefer deterministic checks where you can;
   use the LLM judge for subjective axes. Run ≥3 trials/case and only act on regressions beyond ~2×
   the run-to-run spread. Kill `critical_failures` first; then lift the weakest axis.

9. **Multi-agent: re-update the coordinator after editing any sub-agent** — its roster is snapshotted
   at create/update time and won't auto-pick-up a new sub-agent version. Depth is 1 level; ≤25 threads.

10. **Turn on beta traces from day one** (`make trace-up` + the `.env` OTEL block). Metrics tell you
    *cost*; the span tree tells you *why the agent went off-task* — which is what you actually debug.

**Two model gotchas** (we're on `claude-opus-4-8` / `claude-sonnet-4-6` / `claude-haiku-4-5`): adaptive
thinking only (no `budget_tokens`), and no `temperature`/`top_p`/`top_k` — they 400. Steer with the
prompt and `output_config.effort`. There is no `claude-sonnet-5`.
