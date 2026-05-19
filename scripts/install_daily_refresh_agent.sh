#!/usr/bin/env bash
set -euo pipefail

SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_ROOT="${ACTIVE_ETF_RUNTIME_ROOT:-/Users/justin/active_etf_command_runtime}"
PLIST_NAME="com.justin.activeetf.refresh.plist"
LAUNCH_AGENT="$HOME/Library/LaunchAgents/$PLIST_NAME"

mkdir -p "$RUNTIME_ROOT" "$HOME/Library/LaunchAgents"

rsync -a --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude "dist" \
  --exclude "outputs" \
  "$SOURCE_ROOT/" "$RUNTIME_ROOT/"

cd "$RUNTIME_ROOT"
npm ci
mkdir -p outputs/daily_refresh_logs

cp "$RUNTIME_ROOT/$PLIST_NAME" "$LAUNCH_AGENT"
plutil -lint "$LAUNCH_AGENT"

launchctl bootout "gui/$(id -u)" "$LAUNCH_AGENT" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$LAUNCH_AGENT"
launchctl enable "gui/$(id -u)/com.justin.activeetf.refresh"
launchctl print "gui/$(id -u)/com.justin.activeetf.refresh" | sed -n "1,80p"
