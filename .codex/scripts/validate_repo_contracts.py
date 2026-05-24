#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable


@dataclass(frozen=True)
class Finding:
    level: str
    check_id: str
    path: str
    message: str
    evidence: str = ""


PROFILE_PATH = ".jarvis/production_grade_profile.json"
WORK_ITEM_PATHS = ["agile_work_item.json", ".jarvis/agile_work_item.json"]
PR_EVIDENCE_MANIFEST_PATH = ".jarvis/pr_evidence_manifest.json"
PR_TEMPLATE_PATH = ".github/PULL_REQUEST_TEMPLATE.md"
PACKAGE_JSON_PATH = "package.json"
REPO_OS_WORKFLOW_PATH = ".github/workflows/repo-operating-system.yml"

PROFILE_REQUIRED_SECTIONS = [
    "ownership",
    "product",
    "agile",
    "architecture",
    "reliability",
    "verification",
    "continuous_improvement",
]

PROFILE_REQUIRED_AGILE_PATHS = [
    "agile.runtime_behavior_changed",
    "agile.source_of_truth",
    "agile.work_item_contract.canonical_path",
    "agile.work_item_contract.mirror_paths",
    "agile.work_item_contract.alignment_requirement",
    "agile.delivery_path",
    "agile.definition_of_ready.required_contract_fields",
    "agile.definition_of_ready.criteria_source",
    "agile.definition_of_ready.summary",
    "agile.definition_of_done.required_contract_fields",
    "agile.definition_of_done.criteria_source",
    "agile.definition_of_done.summary",
    "agile.risk_classification.source_ref",
    "agile.validation_policy.narrowest_meaningful_check_first",
    "agile.validation_policy.required_medium_risk_gates",
    "agile.pr_evidence_policy.manifest_path",
    "agile.pr_evidence_policy.required_evidence",
    "agile.rollback_policy.default_release_rollback_action",
    "agile.rollback_policy.required_metadata",
    "agile.contract_scope",
]

PROFILE_REQUIRED_OWNERSHIP_PATHS = [
    "ownership.runtime_behavior_changed",
    "ownership.source_of_truth",
    "ownership.primary_owner.handle",
    "ownership.primary_owner.ownership_model",
    "ownership.primary_owner.source_ref",
    "ownership.operating_model",
    "ownership.scope_of_ownership",
    "ownership.runtime_service_owners",
    "ownership.protected_surface_owners",
    "ownership.decision_rights.requires_explicit_approval",
    "ownership.release_ownership.pr_first_required",
    "ownership.release_ownership.rollback_owner",
    "ownership.release_ownership.metadata_only_rollback",
    "ownership.escalation_policy",
    "ownership.handoff_requirements",
    "ownership.contract_scope",
]

PROFILE_REQUIRED_PRODUCT_PATHS = [
    "product.name",
    "product.product_type",
    "product.runtime_behavior_changed",
    "product.source_of_truth",
    "product.summary.value",
    "product.summary.source_refs",
    "product.launch_customer",
    "product.launch_customer.segments",
    "product.launch_customer.source_refs",
    "product.critical_user_journey.steps",
    "product.critical_user_journey.source_refs",
    "product.critical_user_journeys",
    "product.current_scope.includes",
    "product.current_scope.source_refs",
    "product.not_yet_fully_mature.items",
    "product.not_yet_fully_mature.source_refs",
    "product.public_claims_policy.rules",
    "product.public_claims_policy.source_refs",
    "product.automation_posture.default",
    "product.automation_posture.policy",
    "product.automation_posture.source_refs",
    "product.current_product_truth.business_context.capabilities",
    "product.current_product_truth.business_context.source_refs",
    "product.current_product_truth.workspace_platform.capabilities",
    "product.current_product_truth.workspace_platform.source_refs",
    "product.current_product_truth.lead_generation.capabilities",
    "product.current_product_truth.lead_generation.source_refs",
    "product.current_product_truth.lead_outreach.capabilities",
    "product.current_product_truth.lead_outreach.source_refs",
    "product.current_product_truth.lead_conversion.capabilities",
    "product.current_product_truth.lead_conversion.source_refs",
    "product.current_product_truth.billing_and_commercial.capabilities",
    "product.current_product_truth.billing_and_commercial.source_refs",
    "product.trust_and_claim_boundaries.default_posture.claims",
    "product.trust_and_claim_boundaries.default_posture.source_refs",
    "product.trust_and_claim_boundaries.guarded_or_beta.claims",
    "product.trust_and_claim_boundaries.guarded_or_beta.source_refs",
    "product.trust_and_claim_boundaries.roadmap_not_current_truth.claims",
    "product.trust_and_claim_boundaries.roadmap_not_current_truth.source_refs",
    "product.trust_and_claim_boundaries.prohibited_public_claims.claims",
    "product.trust_and_claim_boundaries.prohibited_public_claims.source_refs",
    "product.success_metrics.metrics",
    "product.success_metrics.source_refs",
    "product.contract_scope",
]

PROFILE_REQUIRED_ARCHITECTURE_PATHS = [
    "architecture.runtime_behavior_changed",
    "architecture.source_of_truth",
    "architecture.system_summary.value",
    "architecture.system_summary.source_refs",
    "architecture.runtime_targets",
    "architecture.service_boundaries.web",
    "architecture.service_boundaries.api",
    "architecture.service_boundaries.workflows",
    "architecture.service_boundaries.shared_packages",
    "architecture.data_architecture.primary_store",
    "architecture.data_architecture.migration_owner",
    "architecture.data_architecture.compatibility_policy",
    "architecture.multi_tenancy.boundary",
    "architecture.multi_tenancy.high_risk_invariants",
    "architecture.integration_boundaries.provider_posture",
    "architecture.deploy_architecture.platform",
    "architecture.deploy_architecture.healthcheck_path",
    "architecture.deploy_architecture.rollback_posture",
    "architecture.decision_records.accepted_adrs",
    "architecture.decision_records.required_for",
    "architecture.portability_rules",
    "architecture.architecture_risks",
    "architecture.contract_scope",
]

PROFILE_REQUIRED_RELIABILITY_PATHS = [
    "reliability.runtime_behavior_changed",
    "reliability.source_of_truth",
    "reliability.success_paths",
    "reliability.failure_modes",
    "reliability.slo_policy.source_ref",
    "reliability.slo_policy.launch_journeys",
    "reliability.health_checks",
    "reliability.smoke_checks.command",
    "reliability.smoke_checks.required_environment",
    "reliability.observability_expectations",
    "reliability.alerting_policy",
    "reliability.incident_response",
    "reliability.release_readiness_gates",
    "reliability.rollback_policy",
    "reliability.open_risks",
    "reliability.contract_scope",
]

PROFILE_REQUIRED_VERIFICATION_PATHS = [
    "verification.runtime_behavior_changed",
    "verification.source_of_truth",
    "verification.strategy",
    "verification.narrowest_meaningful_check_first",
    "verification.required_local_gates",
    "verification.required_ci_gates",
    "verification.credential_dependent_gates",
    "verification.bridge_self_upgrade_gates",
    "verification.evidence_policy",
    "verification.blocked_check_policy",
    "verification.release_readiness_policy",
    "verification.contract_scope",
]

PROFILE_REQUIRED_CONTINUOUS_IMPROVEMENT_PATHS = [
    "continuous_improvement.runtime_behavior_changed",
    "continuous_improvement.source_of_truth",
    "continuous_improvement.maturity_baseline.current_baseline",
    "continuous_improvement.maturity_baseline.current_score_percent",
    "continuous_improvement.maturity_baseline.assessment_source",
    "continuous_improvement.target_state.name",
    "continuous_improvement.target_state.success_conditions",
    "continuous_improvement.ratchet_policy.rules",
    "continuous_improvement.feedback_loops",
    "continuous_improvement.evidence_cadence",
    "continuous_improvement.improvement_backlog",
    "continuous_improvement.learning_capture.destinations",
    "continuous_improvement.metrics",
    "continuous_improvement.rollback_policy.metadata_only_action",
    "continuous_improvement.contract_scope",
]

PROFILE_REQUIRED_PATHS = [
    "schema_version",
    "profile_version",
    "status",
    *PROFILE_REQUIRED_OWNERSHIP_PATHS,
    *PROFILE_REQUIRED_AGILE_PATHS,
    *PROFILE_REQUIRED_PRODUCT_PATHS,
    *PROFILE_REQUIRED_ARCHITECTURE_PATHS,
    *PROFILE_REQUIRED_RELIABILITY_PATHS,
    *PROFILE_REQUIRED_VERIFICATION_PATHS,
    *PROFILE_REQUIRED_CONTINUOUS_IMPROVEMENT_PATHS,
    "workspace.name",
    "workspace.workspace_class",
    "workspace.repo_relative_root",
    "workspace.repo_root_hint",
    "workspace.environment_reference_policy",
    "workspace.runtime_target",
    "workspace.deployment_platform",
    "workspace.healthcheck_path",
    "workspace.delivery_path",
    "workspace.pr_first_mutation_policy",
    "workspace.secret_handling_policy",
    "workspace.primary_runtime_targets",
    "workspace.runtime_behavior_changed",
    "repo_identity.name",
    "production_grade_contract.delivery_path",
    "production_grade_contract.scope_discipline.no_runtime_behavior_change_for_this_profile",
    "verification_contract.local_gates",
    "pr_evidence_requirements.manifest_path",
    "pr_evidence_requirements.required_for_every_pr",
    "release.release_path",
    "release.rollback_action",
    "release.rollback_metadata_required",
    "release.rollback_metadata.platform",
    "release.rollback_metadata.affected_services",
    "release.rollback_metadata.service_targets",
    "release.rollback_metadata.required_fields",
    "release.rollback_metadata.post_rollback_smoke_command",
    "release.rollback_metadata.metadata_only_exception",
]

WORK_ITEM_REQUIRED_PATHS = [
    "schema_version",
    "contract_name",
    "definition_of_ready.required_contract_fields",
    "definition_of_ready.criteria",
    "definition_of_done.required_contract_fields",
    "definition_of_done.criteria",
    "mirror_alignment.required_alignment",
    "evidence_requirements.done_evidence",
    "rollback_expectations.default_release_rollback_action",
    "pull_request_expectations.must_include",
]

PR_EVIDENCE_REQUIRED_PATHS = [
    "schema_version",
    "manifest_name",
    "status",
    "pull_request.required_evidence",
    "pull_request.ready_done_confirmation",
    "pull_request.release_path",
    "release.path",
    "release.rollback_action",
    "release.rollback_metadata.platform",
    "release.rollback_metadata.affected_services",
    "release.rollback_metadata.service_targets",
    "release.rollback_metadata.required_fields",
    "release.rollback_metadata.post_rollback_smoke_command",
    "release.rollback_metadata.metadata_only_exception",
    "release.rollback_metadata_required",
    "deploy_evidence.required_for_release",
]

REQUIRED_CLOUDFLARE_ROLLBACK_SERVICES = {"web", "api", "workflows"}

PR_TEMPLATE_MARKERS = [
    ("release_path", r"release\.path"),
    ("rollback_action", r"release\.rollback_action"),
    ("verification", r"\bverification\b"),
    ("deploy_evidence", r"deploy evidence|deploy/smoke evidence|smoke evidence"),
    ("residual_risk", r"residual risk|remaining risk|unresolved risk"),
    ("ready_done", r"ready\s*/\s*done|definition of ready|definition of done"),
    ("cloudflare_rollback_targets", r"cloudflare services affected|worker version ids|dashboard rollback targets"),
    ("rollback_owner", r"rollback owner"),
    ("schema_data_compatibility", r"schema or data compatibility constraints"),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Advisory validation for repository contract and PR evidence metadata."
    )
    parser.add_argument(
        "target",
        nargs="?",
        default=".",
        help="Repository path to validate. Defaults to the current working directory.",
    )
    parser.add_argument(
        "--format",
        choices=["text", "json", "markdown"],
        default="text",
        help="Output format. Defaults to text.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit non-zero when advisory findings need attention.",
    )
    return parser.parse_args()


def find_repo_root(start: Path) -> Path:
    for candidate in [start, *start.parents]:
        if (candidate / ".git").exists():
            return candidate
    return start


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def get_nested(data: Any, dotted_path: str) -> Any:
    value = data
    for key in dotted_path.split("."):
        if not isinstance(value, dict) or key not in value:
            return None
        value = value[key]
    return value


def has_value(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, dict)):
        return bool(value)
    return True


def load_json(root: Path, relpath: str, findings: list[Finding]) -> Any | None:
    path = root / relpath
    if not path.exists():
        findings.append(
            Finding(
                "warn",
                "json.missing",
                relpath,
                "Contract file is not present; advisory validation skipped for this file.",
            )
        )
        return None
    if not path.is_file():
        findings.append(
            Finding("error", "json.not_file", relpath, "Expected a JSON file but found a non-file path.")
        )
        return None

    try:
        return json.loads(read_text(path))
    except json.JSONDecodeError as exc:
        findings.append(
            Finding(
                "error",
                "json.invalid",
                relpath,
                "Contract file is not valid JSON.",
                f"line {exc.lineno}, column {exc.colno}: {exc.msg}",
            )
        )
        return None


def check_required_paths(
    relpath: str,
    data: Any,
    required_paths: Iterable[str],
    findings: list[Finding],
) -> None:
    if data is None:
        return
    if not isinstance(data, dict):
        findings.append(Finding("error", "json.object", relpath, "Contract root must be a JSON object."))
        return

    for dotted_path in required_paths:
        value = get_nested(data, dotted_path)
        if has_value(value):
            findings.append(
                Finding(
                    "pass",
                    "contract.required_field",
                    relpath,
                    f"`{dotted_path}` is present.",
                )
            )
            continue
        findings.append(
            Finding(
                "warn",
                "contract.required_field",
                relpath,
                f"`{dotted_path}` is missing or empty.",
            )
        )


def check_required_sections(
    relpath: str,
    data: Any,
    required_sections: Iterable[str],
    findings: list[Finding],
) -> None:
    if data is None:
        return
    if not isinstance(data, dict):
        return

    for section in required_sections:
        value = data.get(section)
        if isinstance(value, dict) and has_value(value):
            findings.append(
                Finding(
                    "pass",
                    "contract.required_section",
                    relpath,
                    f"`production_grade_profile.{section}` section is present.",
                )
            )
            continue

        if value is None:
            evidence = "observed missing"
        elif isinstance(value, dict):
            evidence = "observed empty object"
        else:
            evidence = f"observed {type(value).__name__}"
        findings.append(
            Finding(
                "warn",
                "contract.required_section",
                relpath,
                f"`production_grade_profile.{section}` section is missing or empty.",
                evidence,
            )
        )


def check_expected_value(
    relpath: str,
    data: Any,
    dotted_path: str,
    expected: Any,
    findings: list[Finding],
) -> None:
    value = get_nested(data, dotted_path) if isinstance(data, dict) else None
    if type(value) is type(expected) and value == expected:
        findings.append(
            Finding(
                "pass",
                "contract.expected_value",
                relpath,
                f"`{dotted_path}` is `{json.dumps(expected)}`.",
            )
        )
        return

    findings.append(
        Finding(
            "warn",
            "contract.expected_value",
            relpath,
            f"`{dotted_path}` must be `{json.dumps(expected)}`.",
            f"observed {value!r}",
        )
    )


def check_definition_criteria(relpath: str, data: Any, key: str, findings: list[Finding]) -> None:
    if data is None:
        return
    if not isinstance(data, dict):
        return

    value = data.get(key)
    criteria = value.get("criteria") if isinstance(value, dict) else value
    if isinstance(criteria, list) and criteria:
        findings.append(
            Finding(
                "pass",
                "work_item.definition_criteria",
                relpath,
                f"`{key}` criteria are present.",
            )
        )
        return
    findings.append(
        Finding(
            "warn",
            "work_item.definition_criteria",
            relpath,
            f"`{key}` should include non-empty criteria.",
        )
    )


def check_schema_version(relpath: str, data: Any, expected: int, findings: list[Finding]) -> None:
    if data is None or not isinstance(data, dict):
        return

    value = data.get("schema_version")
    if value == expected:
        findings.append(
            Finding(
                "pass",
                "contract.schema_version",
                relpath,
                f"`schema_version` is `{expected}`.",
            )
        )
        return

    findings.append(
        Finding(
            "error",
            "contract.schema_version",
            relpath,
            f"`schema_version` must be numeric `{expected}`.",
            f"observed {value!r}",
        )
    )


def check_rollback_action(relpath: str, data: Any, dotted_path: str, findings: list[Finding]) -> None:
    rollback_action = get_nested(data, dotted_path) if isinstance(data, dict) else None
    if isinstance(rollback_action, str) and "last known-good" in rollback_action.lower():
        findings.append(
            Finding(
                "pass",
                "release.rollback_action",
                relpath,
                f"`{dotted_path}` names a concrete rollback target.",
            )
        )
    elif has_value(rollback_action):
        findings.append(
            Finding(
                "warn",
                "release.rollback_action",
                relpath,
                f"`{dotted_path}` is present but should name the rollback target explicitly.",
                str(rollback_action),
            )
        )


def check_cloudflare_rollback_metadata(
    relpath: str,
    data: Any,
    dotted_path: str,
    findings: list[Finding],
) -> None:
    metadata = get_nested(data, dotted_path) if isinstance(data, dict) else None
    if not isinstance(metadata, dict):
        findings.append(
            Finding(
                "warn",
                "release.rollback_metadata",
                relpath,
                f"`{dotted_path}` should define Cloudflare rollback metadata requirements.",
            )
        )
        return

    platform = metadata.get("platform")
    if isinstance(platform, str) and platform.lower() == "cloudflare":
        findings.append(
            Finding(
                "pass",
                "release.rollback_metadata.platform",
                relpath,
                f"`{dotted_path}.platform` is Cloudflare.",
            )
        )
    else:
        findings.append(
            Finding(
                "warn",
                "release.rollback_metadata.platform",
                relpath,
                f"`{dotted_path}.platform` should be Cloudflare.",
                str(platform),
            )
        )

    affected_services = metadata.get("affected_services")
    observed_services = set()
    if isinstance(affected_services, list):
        observed_services = {
            item.strip().lower()
            for item in affected_services
            if isinstance(item, str)
        }
    missing_services = sorted(REQUIRED_CLOUDFLARE_ROLLBACK_SERVICES - observed_services)
    if not missing_services:
        findings.append(
            Finding(
                "pass",
                "release.rollback_metadata.services",
                relpath,
                "`release.rollback_metadata.affected_services` covers Cloudflare web, api, and workflows.",
            )
        )
    else:
        findings.append(
            Finding(
                "warn",
                "release.rollback_metadata.services",
                relpath,
                "`release.rollback_metadata.affected_services` should cover Cloudflare web, api, and workflows.",
                f"missing: {', '.join(missing_services)}",
            )
        )

    service_targets = metadata.get("service_targets")
    target_services = set()
    concrete_target_services = set()
    if isinstance(service_targets, list):
        for target in service_targets:
            if isinstance(target, dict) and isinstance(target.get("service"), str):
                service = target["service"].strip().lower()
                target_services.add(service)
                required_target = target.get("required_target")
                post_rollback_check = target.get("post_rollback_check")
                if (
                    isinstance(required_target, str)
                    and "last known-good" in required_target.lower()
                    and isinstance(post_rollback_check, str)
                    and "npm run smoke:cloudflare" in post_rollback_check
                ):
                    concrete_target_services.add(service)
    missing_targets = sorted(REQUIRED_CLOUDFLARE_ROLLBACK_SERVICES - target_services)
    missing_concrete_targets = sorted(REQUIRED_CLOUDFLARE_ROLLBACK_SERVICES - concrete_target_services)
    if not missing_targets and not missing_concrete_targets:
        findings.append(
            Finding(
                "pass",
                "release.rollback_metadata.service_targets",
                relpath,
                "`release.rollback_metadata.service_targets` names concrete rollback targets and smoke checks for Cloudflare web, api, and workflows.",
            )
        )
    else:
        evidence_parts = []
        if missing_targets:
            evidence_parts.append(f"missing services: {', '.join(missing_targets)}")
        if missing_concrete_targets:
            evidence_parts.append(f"missing concrete target/check: {', '.join(missing_concrete_targets)}")
        findings.append(
            Finding(
                "warn",
                "release.rollback_metadata.service_targets",
                relpath,
                "`release.rollback_metadata.service_targets` should name concrete rollback targets and smoke checks for Cloudflare web, api, and workflows.",
                "; ".join(evidence_parts),
            )
        )

    smoke_command = metadata.get("post_rollback_smoke_command")
    if smoke_command == "npm run smoke:cloudflare":
        findings.append(
            Finding(
                "pass",
                "release.rollback_metadata.smoke",
                relpath,
                "`release.rollback_metadata.post_rollback_smoke_command` is `npm run smoke:cloudflare`.",
            )
        )
    else:
        findings.append(
            Finding(
                "warn",
                "release.rollback_metadata.smoke",
                relpath,
                "`release.rollback_metadata.post_rollback_smoke_command` should be `npm run smoke:cloudflare`.",
                str(smoke_command),
            )
        )


def check_profile(root: Path, findings: list[Finding]) -> Any | None:
    profile = load_json(root, PROFILE_PATH, findings)
    check_required_sections(PROFILE_PATH, profile, PROFILE_REQUIRED_SECTIONS, findings)
    check_required_paths(PROFILE_PATH, profile, PROFILE_REQUIRED_PATHS, findings)
    check_expected_value(PROFILE_PATH, profile, "ownership.runtime_behavior_changed", False, findings)
    check_expected_value(PROFILE_PATH, profile, "agile.runtime_behavior_changed", False, findings)
    check_expected_value(PROFILE_PATH, profile, "product.runtime_behavior_changed", False, findings)
    check_expected_value(PROFILE_PATH, profile, "architecture.runtime_behavior_changed", False, findings)
    check_expected_value(PROFILE_PATH, profile, "reliability.runtime_behavior_changed", False, findings)
    check_expected_value(PROFILE_PATH, profile, "verification.runtime_behavior_changed", False, findings)
    check_expected_value(PROFILE_PATH, profile, "continuous_improvement.runtime_behavior_changed", False, findings)
    check_schema_version(PROFILE_PATH, profile, 1, findings)
    check_rollback_action(PROFILE_PATH, profile, "release.rollback_action", findings)
    check_cloudflare_rollback_metadata(PROFILE_PATH, profile, "release.rollback_metadata", findings)
    return profile


def check_work_item_contracts(root: Path, findings: list[Finding]) -> None:
    parsed: dict[str, Any] = {}
    for relpath in WORK_ITEM_PATHS:
        data = load_json(root, relpath, findings)
        if data is not None:
            parsed[relpath] = data
        check_required_paths(relpath, data, WORK_ITEM_REQUIRED_PATHS, findings)
        check_definition_criteria(relpath, data, "definition_of_ready", findings)
        check_definition_criteria(relpath, data, "definition_of_done", findings)

    if len(parsed) != len(WORK_ITEM_PATHS):
        return

    canonical = parsed[WORK_ITEM_PATHS[0]]
    mirror = parsed[WORK_ITEM_PATHS[1]]
    if canonical == mirror:
        findings.append(
            Finding(
                "pass",
                "work_item.mirror_alignment",
                ", ".join(WORK_ITEM_PATHS),
                "Canonical and mirrored agile work item contracts match.",
            )
        )
    else:
        findings.append(
            Finding(
                "warn",
                "work_item.mirror_alignment",
                ", ".join(WORK_ITEM_PATHS),
                "Canonical and mirrored agile work item contracts differ.",
            )
        )


def check_pr_evidence_manifest(root: Path, findings: list[Finding]) -> None:
    data = load_json(root, PR_EVIDENCE_MANIFEST_PATH, findings)
    check_required_paths(PR_EVIDENCE_MANIFEST_PATH, data, PR_EVIDENCE_REQUIRED_PATHS, findings)
    check_schema_version(PR_EVIDENCE_MANIFEST_PATH, data, 1, findings)
    check_rollback_action(PR_EVIDENCE_MANIFEST_PATH, data, "release.rollback_action", findings)
    check_cloudflare_rollback_metadata(
        PR_EVIDENCE_MANIFEST_PATH,
        data,
        "release.rollback_metadata",
        findings,
    )


def check_pr_template(root: Path, findings: list[Finding]) -> None:
    relpath = PR_TEMPLATE_PATH
    path = root / relpath
    if not path.exists():
        findings.append(Finding("warn", "pr_template.missing", relpath, "Pull request template is missing."))
        return

    text = read_text(path)
    normalized = text.lower()
    for marker_id, pattern in PR_TEMPLATE_MARKERS:
        if re.search(pattern, normalized, re.IGNORECASE):
            findings.append(
                Finding(
                    "pass",
                    "pr_template.evidence_marker",
                    relpath,
                    f"PR template includes `{marker_id}` evidence prompt.",
                )
            )
            continue
        findings.append(
            Finding(
                "warn",
                "pr_template.evidence_marker",
                relpath,
                f"PR template is missing `{marker_id}` evidence prompt.",
            )
        )


def check_package_script(root: Path, findings: list[Finding]) -> None:
    package = load_json(root, PACKAGE_JSON_PATH, findings)
    scripts = package.get("scripts") if isinstance(package, dict) else None
    command = scripts.get("repo:contracts") if isinstance(scripts, dict) else None
    if isinstance(command, str) and "validate_repo_contracts.py" in command:
        findings.append(
            Finding(
                "pass",
                "package.repo_contracts_script",
                PACKAGE_JSON_PATH,
                "`repo:contracts` runs the advisory contract validator.",
                command,
            )
        )
        return
    findings.append(
        Finding(
            "warn",
            "package.repo_contracts_script",
            PACKAGE_JSON_PATH,
            "`repo:contracts` should run `.codex/scripts/validate_repo_contracts.py`.",
        )
    )


def check_repo_os_workflow(root: Path, findings: list[Finding]) -> None:
    relpath = REPO_OS_WORKFLOW_PATH
    path = root / relpath
    if not path.exists():
        findings.append(Finding("warn", "workflow.missing", relpath, "Repo operating system workflow is missing."))
        return

    text = read_text(path)
    if "validate_repo_contracts.py" in text:
        findings.append(
            Finding(
                "pass",
                "workflow.contract_validation",
                relpath,
                "Repo operating system workflow runs advisory contract validation.",
            )
        )
    else:
        findings.append(
            Finding(
                "warn",
                "workflow.contract_validation",
                relpath,
                "Repo operating system workflow should run advisory contract validation.",
            )
        )

    if "GITHUB_STEP_SUMMARY" in text and "repo contract" in text.lower():
        findings.append(
            Finding(
                "pass",
                "workflow.contract_summary",
                relpath,
                "Repo operating system workflow writes contract validation evidence to the job summary.",
            )
        )
    else:
        findings.append(
            Finding(
                "warn",
                "workflow.contract_summary",
                relpath,
                "Repo operating system workflow should write contract validation evidence to the job summary.",
            )
        )


def build_payload(root: Path, findings: list[Finding]) -> dict[str, Any]:
    totals = {
        "pass": sum(1 for item in findings if item.level == "pass"),
        "warn": sum(1 for item in findings if item.level == "warn"),
        "error": sum(1 for item in findings if item.level == "error"),
    }
    status = "passed" if totals["warn"] == 0 and totals["error"] == 0 else "advisory_attention_needed"
    return {
        "schema_version": "1.0.0",
        "advisory": True,
        "status": status,
        "repo_root": str(root),
        "totals": totals,
        "findings": [asdict(item) for item in findings],
        "note": "Advisory mode exits 0 for findings; use --strict to fail on warnings or errors.",
    }


def escape_markdown(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")


def render_text(payload: dict[str, Any]) -> str:
    lines = [
        f"Repo contract validation: {payload['status']}",
        f"Advisory: {str(payload['advisory']).lower()}",
        (
            "Totals: "
            f"{payload['totals']['pass']} pass, "
            f"{payload['totals']['warn']} warn, "
            f"{payload['totals']['error']} error"
        ),
        "",
    ]
    for finding in payload["findings"]:
        evidence = f" ({finding['evidence']})" if finding.get("evidence") else ""
        lines.append(
            f"- {finding['level'].upper()} {finding['check_id']} [{finding['path']}]: "
            f"{finding['message']}{evidence}"
        )
    lines.append("")
    lines.append(payload["note"])
    return "\n".join(lines) + "\n"


def render_markdown(payload: dict[str, Any]) -> str:
    lines = [
        "## Repo Contract Validation",
        "",
        f"- Status: `{payload['status']}`",
        "- Mode: `advisory`",
        (
            "- Totals: "
            f"`{payload['totals']['pass']}` pass, "
            f"`{payload['totals']['warn']}` warn, "
            f"`{payload['totals']['error']}` error"
        ),
        "",
        "| Level | Check | Path | Message |",
        "| --- | --- | --- | --- |",
    ]
    for finding in payload["findings"]:
        message = finding["message"]
        if finding.get("evidence"):
            message = f"{message} ({finding['evidence']})"
        lines.append(
            "| "
            f"{escape_markdown(finding['level'])} | "
            f"{escape_markdown(finding['check_id'])} | "
            f"`{escape_markdown(finding['path'])}` | "
            f"{escape_markdown(message)} |"
        )
    lines.extend(["", f"> {payload['note']}", ""])
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    target = Path(args.target).expanduser().resolve()
    root = find_repo_root(target)

    findings: list[Finding] = []
    check_profile(root, findings)
    check_work_item_contracts(root, findings)
    check_pr_evidence_manifest(root, findings)
    check_pr_template(root, findings)
    check_package_script(root, findings)
    check_repo_os_workflow(root, findings)

    payload = build_payload(root, findings)
    if args.format == "json":
        print(json.dumps(payload, indent=2))
    elif args.format == "markdown":
        sys.stdout.write(render_markdown(payload))
    else:
        sys.stdout.write(render_text(payload))

    if args.strict and (payload["totals"]["warn"] or payload["totals"]["error"]):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
