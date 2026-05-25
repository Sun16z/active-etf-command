#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
export TZ="Asia/Taipei"

cd "$PROJECT_ROOT"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

log "step1 refresh:data"
./scripts/run_daily_refresh.sh

report_date="$(node -e "import('./outputs/core_db/latest/daily_movements.json',{assert:{type:'json'}}).then(m=>console.log(m.default.meta.reportDate)).catch(()=>process.exit(1))" 2>/dev/null || true)"
if [[ -z "${report_date:-}" ]]; then
  log "error: cannot read outputs/core_db/latest/daily_movements.json meta.reportDate"
  exit 2
fi

log "step2 build"
npm run build >/dev/null

if [[ -n "$(git status --porcelain)" ]]; then
  log "step3 commit+push (reportDate=$report_date)"
  git add -A
  git commit -m "daily refresh ${report_date}"
  git push origin main
else
  log "step3 commit+push skipped (no changes)"
fi

commit_sha="$(git rev-parse HEAD)"
log "step4 telegram site update"
python3 scripts/sendActiveEtfSiteUpdateTelegram.py --commit "$commit_sha" --verify-pages

out_dir="$PROJECT_ROOT/outputs/daily_publish/$report_date"
article="$out_dir/active_etf_chatgpt_article_${report_date}.md"
card="$out_dir/active_etf_chatgpt_three_column_card_${report_date}.png"

if [[ ! -f "$article" ]]; then
  log "error: missing article: $article"
  exit 3
fi
if [[ ! -f "$card" ]]; then
  log "error: missing card: $card"
  exit 3
fi

log "step5 telegram publish (article+card)"
python3 scripts/sendActiveEtfDailyPublishTelegram.py --date "$report_date"

log "done (reportDate=$report_date commit=${commit_sha:0:12})"

