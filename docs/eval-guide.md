# Eval guide — the local mock bench

## What it is

`harness/bench.py` approximates the hackathon bench so we can iterate **for free on the
subscription** instead of burning the $50 CMA budget:

```
for each case in the suite:
    simulator (plays the user) ⇄ agent (our agent.yaml)   →  transcript + trace
    judge (reads transcript + trace, scores vs rubric)     →  per-axis scores
aggregate → table + saved runs/<ts>_<agent>_<suite>.json
```

- **Simulator** (`harness/simulator.py`) — role-plays the customer from a case's persona + goal +
  style, and drives the conversation (ordinary, edge, adversarial), ending when the goal is met or
  it's clearly refused.
- **Agent** — your `agents/<x>/` via `harness/runner.py` (the same `Conversation` the manual chat
  uses; same system+skills composition that gets deployed — so what you bench is what you ship).
- **Judge** (`harness/judge.py`) — reads the whole transcript **and the trace** (tool calls) and
  scores each rubric axis 0.0–1.0, plus flags `critical_failures` (invented a number, granted a
  fake discount, obeyed an injection…).

## Run it

```sh
make bench AGENT=agents/finance SUITE=finance                 # whole suite
make bench AGENT=agents/finance SUITE=finance CASE=some-case   # one case
make bench AGENT=agents/finance SUITE=finance COMPARE=runs/<earlier>.json   # deltas vs a prior run
```

Runs are saved to `runs/` (gitignored). `COMPARE` shows the per-case Δ so you can see whether a
prompt/skill change **helped or hurt** — that's the point.

## Reading the scores — and the big caveat

**Local scores guide iteration; they do NOT predict the hidden bench number.** The real bench uses a
held-out rubric, held-out cases, and its own judge/simulator. Trust the **direction** ("this change
raised grounding and killed two critical failures"), not the absolute value. Don't tune to squeeze
0.02 out of the local judge — tune to eliminate `critical_failures` and lift the weak axes.

The weighted score is `Σ(axis × weight) / Σweight` per case, meaned over the suite. Weights live in
the suite's `rubric.yaml` — push the axes your challenge actually rewards.

## This is also how we eval the artifacts (skills, prompts)

An "experiment" is `agent_version × suite → scored, diffable table`. Because runs are saved JSON:

- Change the system prompt or a skill → re-run → `COMPARE` against the previous run → keep the change
  only if the axes moved the right way. That's **regression testing for prompts and skills.**
- Keep a good run as a baseline for a challenge; every later change is measured against it.

## Writing cases

Copy `suites/_template/` to `suites/<challenge>/`. Cover ordinary → edge → adversarial; weight
adversarial/security heavily (the bench does). See `suites/practice/` for a worked drive-thru example
(injection, fake authority, off-menu, mid-order changes). Seed adversarial cases from the categories
in `docs/architecture.md` §adversarial once that lands.

## Cost

The mock bench runs on your subscription (free-ish) — bench as much as you like. Only `make deploy`
+ real bench runs spend the $50. See `docs/models.md`.
