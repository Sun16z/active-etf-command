#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import textwrap
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
    merged = dict(os.environ)
    if telegram_env:
        merged.update(load_env_file(telegram_env))

    token = merged.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = merged.get("TELEGRAM_CHAT_ID", "").strip()
    timeout_sec = int(merged.get("TELEGRAM_REQUEST_TIMEOUT_MS", "15000")) // 1000
    if not token or not chat_id:
        raise SystemExit("Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID.")
    return TelegramConfig(token=token, chat_id=chat_id, timeout_sec=max(5, timeout_sec))


def post_form(cfg: TelegramConfig, method: str, form: dict[str, str]) -> dict[str, Any]:
    url = f"https://api.telegram.org/bot{cfg.token}/{method}"
    body = urlencode(form).encode("utf-8")
    req = Request(url, data=body, headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urlopen(req, timeout=cfg.timeout_sec) as resp:
        raw = resp.read().decode("utf-8")
    payload = json.loads(raw)
    if not payload.get("ok"):
        raise SystemExit(f"Telegram {method} failed: {raw[:800]}")
    return payload


def send_message(cfg: TelegramConfig, text: str) -> dict[str, Any]:
    return post_form(
        cfg,
        "sendMessage",
        {
            "chat_id": cfg.chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": "true",
        },
    )


def send_photo(cfg: TelegramConfig, photo_path: Path, caption: str) -> dict[str, Any]:
    # Telegram sendPhoto requires multipart; use the simple sendDocument fallback to avoid extra deps.
    # We send the PNG as document with caption.
    url = f"https://api.telegram.org/bot{cfg.token}/sendDocument"
    boundary = "----codexFormBoundary7MA4YWxkTrZu0gW"

    def part(name: str, value: str) -> bytes:
        return (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
            f"{value}\r\n"
        ).encode("utf-8")

    file_bytes = photo_path.read_bytes()
    head = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="document"; filename="{photo_path.name}"\r\n'
        "Content-Type: image/png\r\n\r\n"
    ).encode("utf-8")
    tail = f"\r\n--{boundary}--\r\n".encode("utf-8")

    body = b"".join(
        [
            part("chat_id", cfg.chat_id),
            part("caption", caption),
            part("parse_mode", "HTML"),
            head,
            file_bytes,
            tail,
        ]
    )
    req = Request(url, data=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urlopen(req, timeout=cfg.timeout_sec) as resp:
        raw = resp.read().decode("utf-8")
    payload = json.loads(raw)
    if not payload.get("ok"):
        raise SystemExit(f"Telegram sendDocument failed: {raw[:800]}")
    return payload


def split_text(text: str, limit: int = 3500) -> list[str]:
    # Keep under Telegram message limit; prefer paragraph boundaries.
    parts: list[str] = []
    buf: list[str] = []
    size = 0
    for para in text.split("\n\n"):
        chunk = para.strip()
        if not chunk:
            continue
        add = chunk + "\n\n"
        if size + len(add) > limit and buf:
            parts.append("".join(buf).strip())
            buf = []
            size = 0
        buf.append(add)
        size += len(add)
    if buf:
        parts.append("".join(buf).strip())
    return parts


def main() -> None:
    parser = argparse.ArgumentParser(description="Send daily Active ETF publish artifacts to Telegram.")
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[1]), help="Project root")
    parser.add_argument("--telegram-env", default="/Users/justin/tw_shortterm_screener_runtime/telegram.env")
    parser.add_argument("--site-url", default="https://sun16z.github.io/active-etf-command/")
    parser.add_argument("--date", default="", help="Report date (YYYY-MM-DD). Default from core_db meta.")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    cfg = load_telegram_config(Path(args.telegram_env).expanduser())

    dm = json.loads((root / "outputs" / "core_db" / "latest" / "daily_movements.json").read_text(encoding="utf-8"))
    meta = dm.get("meta") or {}
    report_date = args.date.strip() or str(meta.get("reportDate") or "")
    as_of = str(meta.get("asOf") or "")

    out_dir = root / "outputs" / "daily_publish" / report_date
    article_md = out_dir / f"active_etf_chatgpt_article_{report_date}.md"
    card_png = out_dir / f"active_etf_chatgpt_three_column_card_{report_date}.png"

    if not article_md.exists():
        raise SystemExit(f"Missing article: {article_md}")
    if not card_png.exists():
        raise SystemExit(f"Missing card image: {card_png}")

    article = article_md.read_text(encoding="utf-8").strip()
    title = f"Active ETF｜{report_date}（asOf {as_of}）"
    caption = textwrap.dedent(
        f"""\
        <b>{title}</b>
        <b>網站</b>: {args.site_url}
        <b>圖卡</b>: 三檔比一比（00981A/00991A/00403A）
        """
    ).strip()

    results: dict[str, Any] = {"reportDate": report_date, "asOf": as_of, "siteUrl": args.site_url, "steps": []}
    results["steps"].append({"sendDocument": send_photo(cfg, card_png, caption)})

    for idx, chunk in enumerate(split_text(article), 1):
        results["steps"].append({"sendMessage": send_message(cfg, chunk)})

    out_path = out_dir / f"telegram_chatgpt_send_result_{report_date}.json"
    out_path.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "out": str(out_path)}, ensure_ascii=False))


if __name__ == "__main__":
    main()

