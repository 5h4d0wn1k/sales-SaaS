#!/usr/bin/env python3

import json
import os
import re


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

    for pattern, reason in [
        (r"\bgit\s+reset\s+--hard\b", "Blocked destructive git reset."),
        (r"\bgit\s+clean\s+-f[dxff]*\b", "Blocked destructive git clean."),
        (r"\bcurl\b[^|\\n]*\|\s*(sh|bash)\b", "Blocked piping a remote script into the shell."),
    ]:
        if re.search(pattern, command):
            print(
                json.dumps(
                    {
                        "hookSpecificOutput": {
                            "hookEventName": "PreToolUse",
                            "permissionDecision": "deny",
                            "permissionDecisionReason": reason,
                        }
                    }
                )
            )
            return 0

    print("{}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
