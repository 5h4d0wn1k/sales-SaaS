#!/usr/bin/env python3

import json
import os


def main() -> int:
    try:
        payload = json.load(os.fdopen(0))
    except Exception:
        print("{}")
        return 0

    tool_input = payload.get("tool_input", {})
    command = tool_input.get("command", "") if isinstance(tool_input, dict) else ""
    if isinstance(command, list):
        command = " ".join(str(part) for part in command)
    command = str(command).lower()

    if any(marker in command for marker in ["test", "lint", "typecheck", "build"]):
        print(
            json.dumps(
                {
                    "hookSpecificOutput": {
                        "hookEventName": "PostToolUse",
                        "additionalContext": "If this validation failed, distinguish change-caused failures from pre-existing ones before continuing.",
                    }
                }
            )
        )
        return 0

    print("{}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
