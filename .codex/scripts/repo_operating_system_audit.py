#!/usr/bin/env python3

from __future__ import annotations

import json
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class Check:
    id: str
    category: str
    description: str
    relpath: str
    required: bool = True


CHECKS: list[Check] = [
    Check("agents", "guidance", "Repository AGENTS guidance", "AGENTS.md"),
    Check("codex_config", "guidance", "Repo-local Codex config", ".codex/config.toml"),
    Check("codex_hooks", "guidance", "Repo-local Codex hooks", ".codex/hooks.json"),
    Check("codex_rules", "guidance", "Repo-local Codex rules", ".codex/rules/default.rules"),
    Check("ci", "delivery", "CI workflow", ".github/workflows", required=False),
    Check("prfaq", "product", "Product PRFAQ or brief", "docs/product/prfaq-template.md"),
    Check("cuj", "product", "Critical user journeys", "docs/product/critical-user-journeys-template.md"),
    Check("adr", "architecture", "Architecture decision record template", "docs/architecture/adr-template.md"),
    Check("slo", "reliability", "SLO / SLI definition", "docs/reliability/slo-sli-template.md"),
    Check("prr", "reliability", "Production readiness review", "docs/reliability/production-readiness-review-template.md"),
    Check("postmortem", "reliability", "Postmortem template", "docs/reliability/postmortem-template.md"),
    Check("ownership", "ownership", "Service ownership and runbook", "docs/platform/service-ownership-template.md"),
    Check("deploy_policy", "ownership", "Deploy and rollback policy", "docs/platform/deploy-and-rollback-policy-template.md"),
    Check("scorecard", "ownership", "Engineering operating system scorecard", "docs/platform/engineering-operating-system-scorecard-template.md"),
    Check("monetization", "business", "Monetization and entitlements review", "docs/business/monetization-and-entitlements-template.md"),
    Check("economics", "business", "Unit economics scorecard", "docs/business/unit-economics-scorecard-template.md"),
    Check("roadmap", "business", "Year-one engineering roadmap", "docs/roadmap/year-one-engineering-roadmap-template.md"),
]

TEST_MARKERS = [
    "tests",
    "test",
    "__tests__",
    "spec",
]

CODEOWNERS_CANDIDATES = [
    ".github/CODEOWNERS",
    "CODEOWNERS",
    "docs/CODEOWNERS",
]

PR_TEMPLATE_CANDIDATES = [
    ".github/pull_request_template.md",
    ".github/PULL_REQUEST_TEMPLATE.md",
    "PULL_REQUEST_TEMPLATE.md",
]

PLACEHOLDER_TOKENS = [
    "TODO(repo-quality)",
    "<fill in>",
    "@your-org/your-team",
]


def find_repo_root(start: Path) -> Path:
    for candidate in [start, *start.parents]:
        if (candidate / ".git").exists():
            return candidate
    return start


def exists_any(root: Path, relpaths: Iterable[str]) -> bool:
    return any((root / rel).exists() for rel in relpaths)


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def has_placeholder_content(path: Path) -> bool:
    if not path.exists() or not path.is_file():
        return False
    text = read_text(path)
    return any(token in text for token in PLACEHOLDER_TOKENS)


def evaluate_path(path: Path) -> tuple[bool, bool, bool]:
    present = path.exists()
    if not present:
        return False, False, False
    placeholder = has_placeholder_content(path)
    mature = present and not placeholder
    return present, placeholder, mature


def evaluate_candidates(root: Path, relpaths: Iterable[str]) -> tuple[bool, bool, bool]:
    candidates = [root / rel for rel in relpaths if (root / rel).exists()]
    if not candidates:
        return False, False, False

    mature = any(path.is_dir() or not has_placeholder_content(path) for path in candidates)
    placeholder = not mature and any(path.is_file() and has_placeholder_content(path) for path in candidates)
    return True, placeholder, mature


def detect_test_surface(root: Path) -> tuple[bool, bool, bool]:
    present = False
    placeholder = False
    mature = False

    for name in TEST_MARKERS:
        candidate = root / name
        if not candidate.exists():
            continue

        present = True
        if candidate.is_file():
            if has_placeholder_content(candidate):
                placeholder = True
            else:
                mature = True
            continue

        files = [path for path in candidate.rglob("*") if path.is_file()]
        if not files:
            placeholder = True
            continue

        for path in files:
            if path.name.lower() == "readme.md":
                placeholder = True
                continue
            if has_placeholder_content(path):
                placeholder = True
            else:
                mature = True
                break

        if mature:
            break

    return present, placeholder and not mature, mature


def git_dirty(root: Path) -> bool | None:
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=root,
            check=True,
            capture_output=True,
            text=True,
        )
        return bool(result.stdout.strip())
    except Exception:
        return None


def main() -> int:
    target = Path(sys.argv[1]).expanduser().resolve() if len(sys.argv) > 1 else Path.cwd().resolve()
    root = find_repo_root(target)

    checks = []
    mature_count = 0

    for check in CHECKS:
        present, placeholder, mature = evaluate_path(root / check.relpath)
        if mature:
            mature_count += 1
        checks.append(
            {
                "id": check.id,
                "category": check.category,
                "description": check.description,
                "path": check.relpath,
                "present": present,
                "placeholder": placeholder,
                "mature": mature,
                "required": check.required,
            }
        )

    codeowners_present, codeowners_placeholder, codeowners_mature = evaluate_candidates(root, CODEOWNERS_CANDIDATES)
    pr_template_present, pr_template_placeholder, pr_template_mature = evaluate_candidates(root, PR_TEMPLATE_CANDIDATES)
    tests_present, tests_placeholder, tests_mature = detect_test_surface(root)

    extras = [
        {
            "id": "codeowners",
            "category": "delivery",
            "description": "CODEOWNERS coverage",
            "present": codeowners_present,
            "placeholder": codeowners_placeholder,
            "mature": codeowners_mature,
        },
        {
            "id": "pr_template",
            "category": "delivery",
            "description": "Pull request template",
            "present": pr_template_present,
            "placeholder": pr_template_placeholder,
            "mature": pr_template_mature,
        },
        {
            "id": "tests_surface",
            "category": "delivery",
            "description": "Visible test surface",
            "present": tests_present,
            "placeholder": tests_placeholder,
            "mature": tests_mature,
        },
    ]

    mature_count += sum(1 for item in extras if item["mature"])
    total_checks = len(CHECKS) + len(extras)
    score = round((mature_count / total_checks) * 100) if total_checks else 0

    categories: dict[str, dict[str, int]] = {}
    for item in checks + extras:
        category = item["category"]
        categories.setdefault(category, {"mature": 0, "placeholder": 0, "missing": 0})
        if item["mature"]:
            categories[category]["mature"] += 1
        elif item["present"] and item.get("placeholder"):
            categories[category]["placeholder"] += 1
        else:
            categories[category]["missing"] += 1

    priority_gaps = [
        {
            **item,
            "status": "placeholder" if item.get("placeholder") else "missing",
        }
        for item in checks + extras
        if not item["mature"] and item["category"] in {"guidance", "delivery", "reliability", "ownership", "product", "business"}
    ][:8]

    payload = {
        "repo_root": str(root),
        "target_path": str(target),
        "git_dirty": git_dirty(root),
        "score_percent": score,
        "mature_count": mature_count,
        "total_checks": total_checks,
        "categories": categories,
        "checks": checks,
        "extras": extras,
        "priority_gaps": priority_gaps,
    }
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
