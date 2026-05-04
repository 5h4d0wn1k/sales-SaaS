#!/usr/bin/env python3

import json
import os


def main() -> int:
    try:
        payload = json.load(os.fdopen(0))
    except Exception:
        print("{}")
        return 0

    last_message = (payload.get("last_assistant_message") or "").lower()
    if payload.get("stop_hook_active"):
        print("{}")
        return 0

    if any(word in last_message for word in ["implemented", "updated", "fixed", "created"]) and not any(
        word in last_message for word in ["verified", "test", "lint", "build", "typecheck", "not run"]
    ):
        print(
            json.dumps(
                {
                    "decision": "block",
                    "reason": "Before finishing, state exactly what you verified or could not verify for this repository.",
                }
            )
        )
        return 0

    print("{}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
