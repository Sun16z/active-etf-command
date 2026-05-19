#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${ACTIVE_ETF_PROJECT_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
LOG_DIR="$PROJECT_ROOT/outputs/daily_refresh_logs"
STAMP="$(date '+%Y-%m-%d_%H-%M-%S')"
export TZ="Asia/Taipei"

mkdir -p "$LOG_DIR"
cd "$PROJECT_ROOT"

{
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] start refresh:data + export:core-db"
  npm run refresh:data
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] finish refresh:data + export:core-db"
} >>"$LOG_DIR/$STAMP.log" 2>&1
