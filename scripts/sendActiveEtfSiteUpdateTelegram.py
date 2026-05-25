#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def fetch_pages_daily_meta(site_url: str, timeout_sec: int) -> dict[str, str]:
    try:
        with urlopen(site_url, timeout=timeout_sec) as resp:
            html_text = resp.read().decode("utf-8", errors="ignore")
    except Exception as exc:
        return {"ok": "false", "error": f"fetch_html_failed: {exc!r}"}

    marker = "assets/daily-movements-"
    idx = html_text.find(marker)
    if idx < 0:
        return {"ok": "false", "error": "daily_movements_asset_not_found"}

    end = html_text.find(".js", idx)
    if end < 0:
        return {"ok": "false", "error": "daily_movements_asset_parse_failed"}

    asset_path = html_text[idx : end + 3]
    asset_url = site_url.rstrip("/") + "/" + asset_path.lstrip("/")

    try:
        with urlopen(asset_url, timeout=timeout_sec) as resp:
            js_text = resp.read().decode("utf-8", errors="ignore")
    except Exception as exc:
        return {"ok": "false", "error": f"fetch_asset_failed: {exc!r}", "assetUrl": asset_url}

    def extract(key: str) -> str:
        needle = f'{key}:"'
        j = js_text.find(needle)
        if j < 0:
            return ""
        j += len(needle)
        k = js_text.find('"', j)
        if k < 0:
            return ""
        return js_text[j:k]

    report_date = extract("reportDate")
    as_of = extract("asOf")
    return {"ok": "true", "assetUrl": asset_url, "reportDate": report_date, "asOf": as_of}


@dataclass(frozen=True)
class TelegramConfig:
    token: str
    chat_id: str
    timeout_sec: int


def load_env_file(path: Path) -> dict[str, str]:
    data: dict[str, str] = {}
    if not path.exists():
        return data
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        data[key.strip()] = value.strip().strip('"').strip("'")
    return data


def load_telegram_config(telegram_env: Path | None) -> TelegramConfig:
    searched: list[Path] = []
    merged = dict(os.environ)
    if telegram_env:
        searched.append(telegram_env)
        merged.update(load_env_file(telegram_env))

    token = merged.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = merged.get("TELEGRAM_CHAT_ID", "").strip()
    timeout_sec = int(merged.get("TELEGRAM_REQUEST_TIMEOUT_MS", "15000")) // 1000

    if not token or not chat_id:
        raise SystemExit(
            "Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID. "
            f"Searched env file: {searched[0] if searched else '(none)'}"
        )
    return TelegramConfig(token=token, chat_id=chat_id, timeout_sec=max(5, timeout_sec))


def post_telegram_message(cfg: TelegramConfig, text: str) -> dict[str, Any]:
    url = f"https://api.telegram.org/bot{cfg.token}/sendMessage"
    body = urlencode(
        {
            "chat_id": cfg.chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": "true",
        }
    ).encode("utf-8")
    req = Request(url, data=body, headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urlopen(req, timeout=cfg.timeout_sec) as resp:
        raw = resp.read().decode("utf-8")
    payload = json.loads(raw)
    if not payload.get("ok"):
        raise SystemExit(f"Telegram sendMessage failed: {raw[:800]}")
    return payload


def format_health_lines(health: list[dict[str, Any]]) -> tuple[list[str], list[str]]:
    warnings: list[str] = []
    fallbacks: list[str] = []
    for row in health:
        code = str(row.get("etfCode") or "")
        status = str(row.get("status") or "")
        label = str(row.get("statusLabel") or "")
        latest_date = str(row.get("latestDate") or "")
        previous_date = str(row.get("previousDate") or "")
        bucket = str(row.get("dataBucket") or "")
        eligible = bool(row.get("reportEligible"))
        fallback_used = bool(row.get("fallbackUsed"))
        fallback_reason = str(row.get("fallbackReason") or "")

        if fallback_used:
            reason = f"｜{fallback_reason}" if fallback_reason else ""
            fallbacks.append(f"{code} {label} latest={latest_date} prev={previous_date} bucket={bucket} eligible={eligible}{reason}")
        elif status != "verified":
            warnings.append(f"{code} {label} latest={latest_date} prev={previous_date} bucket={bucket} eligible={eligible}")
    return warnings, fallbacks


def main() -> None:
    parser = argparse.ArgumentParser(description="Send Active ETF Command site update message to Telegram.")
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[1]), help="Project root")
    parser.add_argument(
        "--telegram-env",
        default="/Users/justin/tw_shortterm_screener_runtime/telegram.env",
        help="Path to telegram.env (expects TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)",
    )
    parser.add_argument("--site-url", default="https://sun16z.github.io/active-etf-command/")
    parser.add_argument("--commit", default="", help="Git commit SHA (optional)")
    parser.add_argument("--verify-pages", action="store_true", help="Fetch GitHub Pages and verify data dates.")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    telegram_env = Path(args.telegram_env).expanduser()
    cfg = load_telegram_config(telegram_env)

    core = root / "outputs" / "core_db" / "latest" / "daily_movements.json"
    if not core.exists():
        raise SystemExit(f"Missing core DB daily movements: {core}")
    payload = json.loads(core.read_text(encoding="utf-8"))
    meta = payload.get("meta") or {}
    report_date = str(meta.get("reportDate") or "")
    as_of = str(meta.get("asOf") or "")
    row_count = int(meta.get("rowCount") or 0)
    etf_count = int(meta.get("etfCount") or 0)
    next_pcf_rows = int(meta.get("nextPcfRowCount") or 0)
    health = meta.get("sourceHealth") or []

    reports_dir = root / "outputs" / "reports"
    completion_csv = reports_dir / f"{report_date}_etf_download_completion.csv"
    completion_md = reports_dir / f"{report_date}_etf_download_completion.md"
    target_summary_csv = reports_dir / f"{report_date}_target_etf_holding_changes_summary.csv"

    output_lines: list[str] = []
    for item in (completion_csv, completion_md, target_summary_csv):
        if item.exists():
            output_lines.append(f"- <code>{item}</code>")
    if not output_lines:
        output_lines.append("- (no reports found)")

    warnings, fallbacks = format_health_lines(health)
    warn_block = "\n".join(f"- {line}" for line in warnings[:6]) if warnings else "- 無"
    fallback_block = "\n".join(f"- {line}" for line in fallbacks[:6]) if fallbacks else "- 無"
    more_warn = "" if len(warnings) <= 6 else f"\n- 其餘 {len(warnings) - 6} 筆略"
    more_fb = "" if len(fallbacks) <= 6 else f"\n- 其餘 {len(fallbacks) - 6} 筆略"

    commit = args.commit.strip()
    commit_line = f"\n<b>Commit</b>: <code>{commit[:12]}</code>" if commit else ""

    pages_verification = ""
    if args.verify_pages:
        pages = fetch_pages_daily_meta(args.site_url, cfg.timeout_sec)
        if pages.get("ok") == "true":
            pages_report_date = pages.get("reportDate") or ""
            pages_as_of = pages.get("asOf") or ""
            status = "ok" if pages_report_date == report_date and pages_as_of == as_of else "stale"
            pages_verification = (
                "\n"
                f"<b>PagesVerify</b>: <code>{status}</code>\n"
                f"<b>Pages reportDate</b>: <code>{pages_report_date or '-'}</code>\n"
                f"<b>Pages asOf</b>: <code>{pages_as_of or '-'}</code>"
            )
        else:
            pages_verification = "\n" f"<b>PagesVerify</b>: <code>failed</code>\n" f"<b>PagesError</b>: <code>{pages.get('error','')}</code>"

    text = (
        "<b>Active ETF Command｜網站資料已更新</b>\n"
        f"<b>reportDate</b>: <code>{report_date}</code>\n"
        f"<b>asOf</b>: <code>{as_of}</code>\n"
        f"<b>dailyMovements</b>: <code>{row_count}</code> rows, <code>{etf_count}</code> ETFs\n"
        f"<b>nextPCF</b>: <code>{next_pcf_rows}</code> rows (excluded from today compare)\n"
        f"<b>Pages</b>: {args.site_url}{commit_line}{pages_verification}\n\n"
        "<b>Outputs</b>\n"
        f"{'\n'.join(output_lines)}\n\n"
        "<b>Warnings</b>\n"
        f"{warn_block}{more_warn}\n\n"
        "<b>Fallback Used</b>\n"
        f"{fallback_block}{more_fb}\n"
    )

    result = post_telegram_message(cfg, text)
    out_dir = root / "outputs" / "daily_publish" / report_date
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"telegram_site_update_send_result_{report_date}.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "out": str(out_path)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
