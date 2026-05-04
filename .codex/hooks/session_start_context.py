#!/usr/bin/env python3

import json


def main() -> int:
    output = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": (
                "Read this repository's AGENTS.md before editing. Use the repo runbook and quality gates, "
                "keep changes scoped, and finish with explicit verification notes. For product or architecture "
                "work, use the product, architecture, reliability, business, roadmap, and platform docs in this repo when relevant."
            ),
        }
    }
    print(json.dumps(output))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
