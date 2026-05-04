#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


NEXT_ACTIONS_BY_ID = {
    "agents": "Customize `AGENTS.md` with repo-specific commands, architecture boundaries, and definition of done.",
    "codex_config": "Add `.codex/config.toml` defaults for this repository so local behavior does not depend only on global config.",
    "codex_hooks": "Add repo-local hooks for validation, risky-command policy, and finish gates.",
    "codex_rules": "Add `.codex/rules/default.rules` so command policy is visible and versioned with the repository.",
    "ci": "Add or harden `.github/workflows/*` so lint, typecheck, tests, and release-safe checks run automatically.",
    "prfaq": "Write `docs/product/prfaq-template.md` with the customer problem, critical user journey, success metric, and scope.",
    "cuj": "Document `docs/product/critical-user-journeys-template.md` and use it to prioritize tests and SLOs.",
    "adr": "Create `docs/architecture/adr-template.md` entries for meaningful technical decisions and migrations.",
    "slo": "Define `docs/reliability/slo-sli-template.md` around customer-critical workflows, not just component uptime.",
    "prr": "Fill out `docs/reliability/production-readiness-review-template.md` before shipping risky changes.",
    "postmortem": "Keep `docs/reliability/postmortem-template.md` ready so incidents produce lasting operating improvements.",
    "ownership": "Document `docs/platform/service-ownership-template.md` with owners, runbooks, dashboards, and escalation paths.",
    "deploy_policy": "Create `docs/platform/deploy-and-rollback-policy-template.md` with rollout, canary, and rollback rules.",
    "scorecard": "Use `docs/platform/engineering-operating-system-scorecard-template.md` to review maturity quarter over quarter.",
    "monetization": "Capture pricing, entitlements, quotas, and enterprise controls in `docs/business/monetization-and-entitlements-template.md`.",
    "economics": "Track `docs/business/unit-economics-scorecard-template.md` so cost-to-serve and margin are visible early.",
    "roadmap": "Use `docs/roadmap/year-one-engineering-roadmap-template.md` to sequence MVP, reliability, and monetization investments.",
    "codeowners": "Add CODEOWNERS coverage so review responsibility is explicit.",
    "pr_template": "Add a pull request template that asks for verification, rollout notes, and risk summary.",
    "tests_surface": "Create a visible `tests/` surface and replace placeholders with real automated coverage.",
}

CATEGORY_LABELS = {
    "guidance": "Guidance",
    "delivery": "Delivery",
    "product": "Product",
    "architecture": "Architecture",
    "reliability": "Reliability",
    "ownership": "Ownership",
    "business": "Business",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render a repository operating-system audit as an actionable markdown report."
    )
    parser.add_argument(
        "target",
        nargs="?",
        default=".",
        help="Repository path to audit. Defaults to the current working directory.",
    )
    parser.add_argument(
        "--audit-json",
        dest="audit_json",
        help="Optional path to precomputed audit JSON. If omitted, the sibling audit script is run.",
    )
    parser.add_argument(
        "--output",
        dest="output",
        help="Optional path to write the markdown report.",
    )
    return parser.parse_args()


def load_audit(target: Path, audit_json: Path | None) -> dict:
    if audit_json is not None:
        return json.loads(audit_json.read_text(encoding="utf-8"))

    audit_script = Path(__file__).with_name("repo_operating_system_audit.py")
    result = subprocess.run(
        ["python3", str(audit_script), str(target)],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


def format_categories(categories: dict[str, dict[str, int]]) -> list[str]:
    lines = []
    for key in ["guidance", "delivery", "product", "architecture", "reliability", "ownership", "business"]:
        stats = categories.get(key, {"mature": 0, "placeholder": 0, "missing": 0})
        lines.append(
            f"- {CATEGORY_LABELS[key]}: {stats['mature']} mature, {stats['placeholder']} placeholder, {stats['missing']} missing"
        )
    return lines


def format_strong_areas(categories: dict[str, dict[str, int]]) -> list[str]:
    strong = []
    for key in ["guidance", "delivery", "product", "architecture", "reliability", "ownership", "business"]:
        stats = categories.get(key, {"mature": 0, "placeholder": 0, "missing": 0})
        if stats["mature"] > 0 and stats["placeholder"] == 0 and stats["missing"] == 0:
            strong.append(f"- {CATEGORY_LABELS[key]} is fully covered.")
    if not strong:
        strong.append("- No category is fully covered yet.")
    return strong


def recommend_actions(priority_gaps: list[dict]) -> list[str]:
    if not priority_gaps:
        return [
            "- Replace template placeholders with repo-specific commands, owners, SLOs, and rollout details.",
            "- Keep the audit workflow passing in CI and rerun the report after major architectural or process changes.",
            "- Expand the visible test surface from placeholders to real unit, integration, and end-to-end coverage.",
        ]

    seen = set()
    actions = []
    for item in priority_gaps:
        action = NEXT_ACTIONS_BY_ID.get(item["id"])
        if not action or action in seen:
            continue
        seen.add(action)
        actions.append(f"- {action}")
        if len(actions) == 5:
            break
    return actions


def format_priority_gaps(priority_gaps: list[dict]) -> list[str]:
    if not priority_gaps:
        return ["- No priority gaps detected."]

    lines = []
    for item in priority_gaps:
        path = item.get("path")
        detail = f" at `{path}`" if path else ""
        state = item.get("status", "missing")
        lines.append(f"- `{item['id']}` ({item['category']}) is `{state}`{detail}: {item['description']}.")
    return lines


def render_markdown(audit: dict) -> str:
    score = audit["score_percent"]
    root = audit["repo_root"]
    priority_gaps = audit.get("priority_gaps", [])
    git_dirty = audit.get("git_dirty")
    git_dirty_label = "unknown" if git_dirty is None else ("yes" if git_dirty else "no")

    lines = [
        "# Repo Operating System Report",
        "",
        f"- Repository: `{root}`",
        f"- Score: **{score}%**",
        f"- Git dirty: `{git_dirty_label}`",
        "",
        "## Category Summary",
        "",
        *format_categories(audit.get("categories", {})),
        "",
        "## Strong Areas",
        "",
        *format_strong_areas(audit.get("categories", {})),
        "",
        "## Priority Gaps",
        "",
        *format_priority_gaps(priority_gaps),
        "",
        "## Recommended Next Actions",
        "",
        *recommend_actions(priority_gaps),
        "",
        "## Commands",
        "",
        "- `python3 .codex/scripts/repo_operating_system_audit.py .`",
        "- `python3 .codex/scripts/repo_operating_system_report.py . --output .codex/reports/repo-operating-system-report.md`",
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    args = parse_args()
    target = Path(args.target).expanduser().resolve()
    audit_json = Path(args.audit_json).expanduser().resolve() if args.audit_json else None

    audit = load_audit(target, audit_json)
    markdown = render_markdown(audit)

    if args.output:
        output = Path(args.output).expanduser().resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(markdown, encoding="utf-8")
    else:
        sys.stdout.write(markdown)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
