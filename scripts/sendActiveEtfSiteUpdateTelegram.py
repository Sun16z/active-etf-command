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
        default="/Users/justin/Documents/chatgpt/tw_shortterm_screener/telegram.env",
        help="Path to telegram.env (expects TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)",
    )
    parser.add_argument("--site-url", default="https://sun16z.github.io/active-etf-command/")
    parser.add_argument("--commit", default="", help="Git commit SHA (optional)")
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

    text = (
        "<b>Active ETF Command｜網站資料已更新</b>\n"
        f"<b>reportDate</b>: <code>{report_date}</code>\n"
        f"<b>asOf</b>: <code>{as_of}</code>\n"
        f"<b>dailyMovements</b>: <code>{row_count}</code> rows, <code>{etf_count}</code> ETFs\n"
        f"<b>nextPCF</b>: <code>{next_pcf_rows}</code> rows (excluded from today compare)\n"
        f"<b>Pages</b>: {args.site_url}{commit_line}\n\n"
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
