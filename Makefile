# t32 — common commands. Local dev + mock bench run on your Claude subscription (free-ish);
# only `deploy` spends the $50 CMA budget. Run `make setup` once.

PY := .venv/bin/python
AGENT ?= agents/finance      # we're all-in on Penny; override AGENT= for the drivethru example
SUITE ?= finance

.PHONY: help setup verify chat bench deploy deploy-dry cma-check trace-up trace-down clean

help:
	@echo "make setup                     # create .venv and install deps (uv)"
	@echo "make verify                    # preflight: check creds + Postgres + MCP work (read-only)"
	@echo "make chat  AGENT=agents/x       # terminal chat with an agent"
	@echo "make bench AGENT=agents/x SUITE=y   # run the mock bench (simulator + judge)"
	@echo "make bench COMPARE=runs/<f>.json    # ...and show deltas vs a prior run"
	@echo "make deploy AGENT=agents/x      # port agent.yaml -> Claude Managed Agent (spends CMA \$)"
	@echo "make deploy-dry AGENT=agents/x  # show the ant command, deploy nothing"
	@echo "make cma-check CONFIRM=1        # ⚠ SPENDS CREDITS: rare one-off platform smoke test"
	@echo "make trace-up / trace-down      # start/stop the local OTLP trace sink (HyperDX)"
	@echo ""
	@echo "First-time auth (once):  claude setup-token   (or: claude login)"

setup:
	uv venv .venv --python 3.12
	uv pip install --python .venv/bin/python -r requirements.txt
	@[ -f .env ] || cp .env.example .env
	@echo "✓ setup done. Authenticate your subscription once:  claude setup-token"
	@echo "  then paste the creds into .env (team DM) and run:  make verify"

verify:
	$(PY) -m harness.verify $(AGENT)


chat:
	$(PY) -m harness.chat $(AGENT)

bench:
	$(PY) -m harness.bench --agent $(AGENT) --suite $(SUITE) $(if $(CASE),--case $(CASE),) $(if $(COMPARE),--compare $(COMPARE),)

deploy:
	$(PY) deploy/port.py $(AGENT)

deploy-dry:
	$(PY) deploy/port.py $(AGENT) --dry-run

cma-check:   # ⚠ SPENDS CMA CREDITS — rare, deliberate platform smoke test. Needs --confirm.
	$(PY) deploy/cma_smoke.py $(AGENT) $(if $(CONFIRM),--confirm,)

trace-up:
	docker compose -f traces/docker-compose.yml up -d
	@echo "✓ HyperDX at http://localhost:8080 . Uncomment the OTEL_* block in .env, then: set -a && . ./.env && set +a"

trace-down:
	docker compose -f traces/docker-compose.yml down

clean:
	rm -rf __pycache__ */__pycache__ */*/__pycache__
