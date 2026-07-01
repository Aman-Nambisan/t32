"""Model routing — resolve which Claude model a role should use.

Single source of truth is models.yaml at the repo root. Everything (agent, simulator, judge,
sub-agents) resolves its model through here so the team can swap models — including down to cheaper
Sonnet/Haiku — in one place. See models.yaml and docs/models.md for the rationale.

Precedence: explicit override > role default (models.yaml) > FALLBACK.
"""
from __future__ import annotations

import pathlib

import yaml

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
FALLBACK = "claude-opus-4-8"


def _config() -> dict:
    p = REPO_ROOT / "models.yaml"
    return yaml.safe_load(p.read_text()) if p.is_file() else {}


def resolve(role: str, explicit: str | None = None) -> str:
    """Model id for a role. `explicit` (from agent.yaml/rubric/case) wins; else the role default in
    models.yaml; else FALLBACK."""
    if explicit:
        return explicit
    return (_config().get("roles") or {}).get(role) or FALLBACK


def price(model: str) -> dict:
    """{input, output, context, use} per 1M tokens from the catalog, or {} if unknown."""
    return (_config().get("catalog") or {}).get(model, {})
