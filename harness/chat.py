"""Terminal chat with one of our agents — the fast manual loop.

    python -m harness.chat agents/example

Multi-turn until you exit (Ctrl-C / Ctrl-D). Tool calls the agent makes print under each reply, so
you can watch it stay grounded (or not). This is the manual companion to `harness.bench`.
"""
import json
import sys

from .runner import Conversation


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: python -m harness.chat <agent-folder>   e.g. python -m harness.chat agents/example")
    agent = sys.argv[1].rstrip("/")
    conv = Conversation(agent)
    print(f"Chatting with {agent}  (model: {conv.model}).  Ctrl-C to exit.\n")
    seen = 0
    try:
        while True:
            msg = input("you › ").strip()
            if not msg:
                continue
            reply = conv.send(msg)
            print(f"\nagent › {reply}\n")
            for a in conv.tool_calls[seen:]:
                print(f"   ⎿ {a['tool']}({json.dumps(a['input'], default=str)})")
            seen = len(conv.tool_calls)
    except (KeyboardInterrupt, EOFError):
        print("\nbye 👋")
    finally:
        conv.close()


if __name__ == "__main__":
    main()
