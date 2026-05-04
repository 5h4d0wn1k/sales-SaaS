#!/usr/bin/env bash
set -euo pipefail

workspaces=(
  "@sales/api"
  "@sales/web"
  "@sales/workflows"
  "@sales/database"
  "@sales/shared"
)

for workspace in "${workspaces[@]}"; do
  echo "Building ${workspace}"

  if [[ "$workspace" == "@sales/web" ]]; then
    attempt=1
    max_attempts=3
    npm run clean:artifacts --workspace "$workspace"
    until npm run build --workspace "$workspace"; do
      if [[ $attempt -ge $max_attempts ]]; then
        exit 1
      fi

      attempt=$((attempt + 1))
      echo "Retrying ${workspace} build after a transient Next.js build worker failure (attempt ${attempt}/${max_attempts})..."
      npm run clean:artifacts --workspace "$workspace"
      sleep 1
    done
    continue
  fi

  npm run build --workspace "$workspace"
done
