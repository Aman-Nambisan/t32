"""Tiny stateless completion helper on the Claude Agent SDK (your subscription).

The simulator and judge are one-shot LLM calls — they don't need the persistent multi-turn client
that `runner.Conversation` uses. This wraps `query()` behind a plain sync `complete()`.

Runs on your Claude subscription (same auth as runner.py), so simulating + judging is free-ish —
that's the whole point: burn the subscription locally, save the $50 CMA budget for the real bench.
"""
import asyncio

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    TextBlock,
    query,
)

from .runner import _use_subscription


async def _acomplete(system: str, prompt: str, model: str) -> str:
    opts = ClaudeAgentOptions(
        model=model,
        system_prompt=system,
        mcp_servers={},
        allowed_tools=[],
        tools=[],
        setting_sources=[],
    )
    out: list[str] = []
    async for msg in query(prompt=prompt, options=opts):
        if isinstance(msg, AssistantMessage):
            for block in msg.content:
                if isinstance(block, TextBlock):
                    out.append(block.text)
    return "".join(out).strip()


def complete(system: str, prompt: str, model: str = "claude-opus-4-8") -> str:
    """Blocking single-turn completion. Safe to call between `Conversation.send()` calls — each
    invocation runs its own event loop and returns before the next SDK call starts."""
    _use_subscription()  # simulator/judge run on the subscription too, never the paid API key
    return asyncio.run(_acomplete(system, prompt, model))
