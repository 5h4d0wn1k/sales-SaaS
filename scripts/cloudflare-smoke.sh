#!/usr/bin/env bash
set -euo pipefail

web_url="${WEB_APP_URL:-}"
web_healthcheck_url="${WEB_HEALTHCHECK_URL:-}"
web_readinesscheck_url="${WEB_READINESSCHECK_URL:-}"
api_healthcheck_url="${API_HEALTHCHECK_URL:-}"
api_readinesscheck_url="${API_READINESSCHECK_URL:-}"
workflows_healthcheck_url="${WORKFLOWS_HEALTHCHECK_URL:-}"
workflows_healthcheck_token="${WORKFLOWS_HEALTHCHECK_TOKEN:-}"
readiness_allow_warnings="${READINESS_ALLOW_WARNINGS:-false}"

assert_readiness_payload() {
  local label="$1"
  local expected_service="$2"
  local response="$3"

  LABEL="$label" \
    EXPECTED_SERVICE="$expected_service" \
    READINESS_RESPONSE="$response" \
    READINESS_ALLOW_WARNINGS="$readiness_allow_warnings" \
    python3 - <<'PY'
import json
import os
import sys

label = os.environ["LABEL"]
expected_service = os.environ["EXPECTED_SERVICE"]
allow_warnings = os.environ.get("READINESS_ALLOW_WARNINGS", "").strip().lower()

try:
    payload = json.loads(os.environ["READINESS_RESPONSE"])
except json.JSONDecodeError as error:
    print(f"{label} readiness check returned invalid JSON: {error}")
    sys.exit(1)

if payload.get("status") != "ready" or payload.get("service") != expected_service:
    print(f"{label} readiness check did not report {expected_service} ready status")
    sys.exit(1)

release = payload.get("release")
if not isinstance(release, dict) or not release.get("version"):
    print(f"{label} readiness check did not include release version metadata")
    sys.exit(1)

warning_count = 0
warnings = payload.get("warnings")
if isinstance(warnings, list):
    warning_count += len(warnings)

checks = payload.get("checks")
if not isinstance(warnings, list) and isinstance(checks, dict):
    api_check = checks.get("api")
    if isinstance(api_check, dict):
        nested_warning_count = api_check.get("warnings")
        if isinstance(nested_warning_count, int):
            warning_count += nested_warning_count

if warning_count > 0 and allow_warnings not in {"1", "true", "yes"}:
    print(
        f"{label} readiness has {warning_count} warning(s); "
        "set READINESS_ALLOW_WARNINGS=true only for an explicitly accepted rollout exception."
    )
    sys.exit(1)
PY
}

assert_text_contains() {
  local label="$1"
  local response="$2"
  local expected="$3"

  if [[ "$response" != *"$expected"* ]]; then
    echo "$label did not contain $expected"
    exit 1
  fi
}

assert_text_omits_case_insensitive() {
  local label="$1"
  local response="$2"
  local forbidden="$3"
  local lower_response
  local lower_forbidden

  lower_response="$(printf '%s' "$response" | tr '[:upper:]' '[:lower:]')"
  lower_forbidden="$(printf '%s' "$forbidden" | tr '[:upper:]' '[:lower:]')"

  if [[ "$lower_response" == *"$lower_forbidden"* ]]; then
    echo "$label contained forbidden text: $forbidden"
    exit 1
  fi
}

assert_header_contains_case_insensitive() {
  local label="$1"
  local response="$2"
  local expected="$3"
  local lower_response
  local lower_expected

  lower_response="$(printf '%s' "$response" | tr '[:upper:]' '[:lower:]')"
  lower_expected="$(printf '%s' "$expected" | tr '[:upper:]' '[:lower:]')"

  if [[ "$lower_response" != *"$lower_expected"* ]]; then
    echo "$label did not contain header $expected"
    exit 1
  fi
}

if [[ -z "$web_url" ]]; then
  echo "WEB_APP_URL is required"
  exit 1
fi

if [[ -z "$web_healthcheck_url" ]]; then
  web_healthcheck_url="${web_url%/}/health"
fi

if [[ -z "$web_readinesscheck_url" ]]; then
  web_readinesscheck_url="${web_url%/}/ready"
fi

if [[ -z "$api_healthcheck_url" ]]; then
  echo "API_HEALTHCHECK_URL is required"
  exit 1
fi

if [[ -z "$api_readinesscheck_url" ]]; then
  if [[ "$api_healthcheck_url" == */health ]]; then
    api_readinesscheck_url="${api_healthcheck_url%/health}/ready"
  else
    api_readinesscheck_url="${api_healthcheck_url%/}/ready"
  fi
fi

echo "Smoke check: API health -> $api_healthcheck_url"
api_response="$(curl -fsS "$api_healthcheck_url")"
echo "$api_response"
if [[ "$api_response" != *'"status":"ok"'* ]]; then
  echo "API health check did not report ok status"
  exit 1
fi

echo "Smoke check: API readiness -> $api_readinesscheck_url"
api_ready_response="$(curl -fsS "$api_readinesscheck_url")"
echo "$api_ready_response"
assert_readiness_payload "API" "sales-api" "$api_ready_response"

echo "Smoke check: web root -> $web_url"
curl -I -fsS "$web_url"

echo "Smoke check: web health -> $web_healthcheck_url"
web_response="$(curl -fsS "$web_healthcheck_url")"
echo "$web_response"
if [[ "$web_response" != *'"status":"ok"'* || "$web_response" != *'"service":"sales-web"'* ]]; then
  echo "Web health check did not report sales-web ok status"
  exit 1
fi

echo "Smoke check: web readiness -> $web_readinesscheck_url"
web_ready_response="$(curl -fsS "$web_readinesscheck_url")"
echo "$web_ready_response"
assert_readiness_payload "Web" "sales-web" "$web_ready_response"

echo "Smoke check: web sitemap -> ${web_url%/}/sitemap.xml"
web_sitemap_response="$(curl -fsS "${web_url%/}/sitemap.xml")"
echo "$web_sitemap_response"
assert_text_contains "Web sitemap" "$web_sitemap_response" "/pricing"
assert_text_contains "Web sitemap" "$web_sitemap_response" "/trust"
assert_text_contains "Web sitemap" "$web_sitemap_response" "/ai-sdr-software"
assert_text_contains "Web sitemap" "$web_sitemap_response" "/compare-sales-tools"

echo "Smoke check: web robots -> ${web_url%/}/robots.txt"
web_robots_response="$(curl -fsS "${web_url%/}/robots.txt")"
echo "$web_robots_response"
assert_text_contains "Web robots.txt" "$web_robots_response" "Sitemap:"
assert_text_contains "Web robots.txt" "$web_robots_response" "Disallow: /api/"

echo "Smoke check: web security metadata -> ${web_url%/}/.well-known/security.txt"
web_security_response="$(curl -fsS "${web_url%/}/.well-known/security.txt")"
echo "$web_security_response"
assert_text_contains "Web security.txt" "$web_security_response" "Contact: mailto:hello@winrate.ai"
assert_text_contains "Web security.txt" "$web_security_response" "Policy:"
assert_text_omits_case_insensitive "Web security.txt" "$web_security_response" "bug bounty"
assert_text_omits_case_insensitive "Web security.txt" "$web_security_response" "safe harbor"

echo "Smoke check: web Open Graph image -> ${web_url%/}/opengraph-image"
web_opengraph_headers="$(curl -I -fsS "${web_url%/}/opengraph-image")"
echo "$web_opengraph_headers"
assert_header_contains_case_insensitive "Web Open Graph image" "$web_opengraph_headers" "content-type: image/png"

echo "Smoke check: web Twitter image -> ${web_url%/}/twitter-image"
web_twitter_headers="$(curl -I -fsS "${web_url%/}/twitter-image")"
echo "$web_twitter_headers"
assert_header_contains_case_insensitive "Web Twitter image" "$web_twitter_headers" "content-type: image/png"

if [[ -n "$workflows_healthcheck_url" ]]; then
  echo "Smoke check: workflows health -> $workflows_healthcheck_url"

  workflow_args=()
  if [[ -n "$workflows_healthcheck_token" ]]; then
    workflow_args+=(-H "Authorization: Bearer $workflows_healthcheck_token")
  fi

  curl -fsS "${workflow_args[@]}" "$workflows_healthcheck_url"
fi
