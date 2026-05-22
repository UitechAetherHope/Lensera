#!/usr/bin/env bash
# Incremental deploy: pull code only, rebuild api + web. Does NOT touch .env or Photo_base.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env in $ROOT — copy from .env.example and configure before deploy."
  exit 1
fi

echo "==> git pull (only changed files in working tree will update)"
git pull --ff-only origin main

echo "==> rebuild api + web (uses Docker layer cache + BuildKit Maven/npm cache; NOT --no-cache)"
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
docker compose build api web
docker compose up -d api web

echo "==> status"
docker compose ps api web

echo "Done. Open site and hard-refresh (Ctrl+F5). .env was NOT modified."
