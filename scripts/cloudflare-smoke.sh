#!/usr/bin/env bash
set -euo pipefail

web_url="${WEB_APP_URL:-}"
api_healthcheck_url="${API_HEALTHCHECK_URL:-}"
workflows_healthcheck_url="${WORKFLOWS_HEALTHCHECK_URL:-}"
workflows_healthcheck_token="${WORKFLOWS_HEALTHCHECK_TOKEN:-}"

if [[ -z "$web_url" ]]; then
  echo "WEB_APP_URL is required"
  exit 1
fi

if [[ -z "$api_healthcheck_url" ]]; then
  echo "API_HEALTHCHECK_URL is required"
  exit 1
fi

echo "Smoke check: API health -> $api_healthcheck_url"
api_response="$(curl -fsS "$api_healthcheck_url")"
echo "$api_response"
if [[ "$api_response" != *'"status":"ok"'* ]]; then
  echo "API health check did not report ok status"
  exit 1
fi

echo "Smoke check: web root -> $web_url"
curl -I -fsS "$web_url"

if [[ -n "$workflows_healthcheck_url" ]]; then
  echo "Smoke check: workflows health -> $workflows_healthcheck_url"

  workflow_args=()
  if [[ -n "$workflows_healthcheck_token" ]]; then
    workflow_args+=(-H "Authorization: Bearer $workflows_healthcheck_token")
  fi

  curl -fsS "${workflow_args[@]}" "$workflows_healthcheck_url"
fi
