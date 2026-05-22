#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REPORTS_DIR = ROOT / "outputs" / "reports"
OUTPUT_DIR = ROOT / "outputs"

TARGET_CODES = ["00981A", "00403A", "00991A"]
PANEL_X = {"00981A": 38, "00403A": 379, "00991A": 720}
PANEL_COLOR = {"00981A": "#dd4c35", "00403A": "#aa7713", "00991A": "#177d72"}

FONT_CANDIDATES = [
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/Library/Fonts/Arial Unicode.ttf",
]


def font(size: int) -> ImageFont.ImageFont:
    for candidate in FONT_CANDIDATES:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def parse_float(value: str | None, default: float = 0.0) -> float:
    try:
        return float(value or default)
    except Exception:
        return default


def parse_int(value: str | None, default: int = 0) -> int:
    try:
        return int(round(float(value or default)))
    except Exception:
        return default


def signed(value: float, digits: int = 2) -> str:
    return f"+{value:.{digits}f}" if value > 0 else f"{value:.{digits}f}"


def select_latest_detail(detail_csv: Path) -> tuple[str, list[dict[str, object]]]:
    with detail_csv.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    filtered = [row for row in rows if str(row.get("etfCode", "")) in TARGET_CODES]
    if not filtered:
        raise SystemExit("No rows for target ETF codes")
    latest = max(str(row.get("date", "")) for row in filtered)
    output: list[dict[str, object]] = []
    for row in filtered:
        if str(row.get("date", "")) != latest:
            continue
        output.append(
            {
                "date": str(row.get("date", "")),
                "fromDate": str(row.get("fromDate", "")),
                "toDate": str(row.get("toDate", "")),
                "etfCode": str(row.get("etfCode", "")),
                "etfName": str(row.get("etfName", "")),
                "stockCode": str(row.get("stockCode", "")),
                "stockName": str(row.get("stockName", "")),
                "typeLabel": str(row.get("typeLabel", "")),
                "weightDelta": parse_float(row.get("weightDelta")),
                "deltaLots": parse_int(row.get("deltaLots")),
                "estimatedValueYi": parse_float(row.get("estimatedValueYi")),
                "absEstimatedValueYi": abs(parse_float(row.get("estimatedValueYi"))),
            }
        )
    if not output:
        raise SystemExit("No latest rows after filter")
    return latest, output


def text(draw: ImageDraw.ImageDraw, x: float, y: float, value: str, size: int, fill: str, anchor: str = "la") -> None:
    draw.text((x, y), value, font=font(size), fill=fill, anchor=anchor)


def format_delta_lots(delta_lots: int) -> str:
    if delta_lots > 0:
        return f"+{delta_lots:,}張"
    if delta_lots < 0:
        return f"{delta_lots:,}張"
    return "0張"


def draw_gradient_background(image: Image.Image) -> None:
    draw = ImageDraw.Draw(image)
    w, h = image.size
    c0 = (6, 23, 43)
    c1 = (16, 43, 50)
    for y in range(h):
        t = y / (h - 1)
        r = int(c0[0] * (1 - t) + c1[0] * t)
        g = int(c0[1] * (1 - t) + c1[1] * t)
        b = int(c0[2] * (1 - t) + c1[2] * t)
        draw.line((0, y, w, y), fill=(r, g, b))


def draw_panel(draw: ImageDraw.ImageDraw, rows: list[dict[str, object]], x: int, color: str) -> None:
    draw.rounded_rectangle((x, 352, x + 322, 744), radius=18, fill="#ffffff", outline="#d7dde8", width=2)
    draw.rounded_rectangle((x, 352, x + 322, 362), radius=8, fill=color)

    if not rows:
        text(draw, x + 161, 420, "無資料", 28, "#102033", anchor="mm")
        return
    first = rows[0]
    code = str(first["etfCode"])
    name = str(first["etfName"])
    period = f"{first['fromDate']} → {first['toDate']}"
    text(draw, x + 18, 398, code, 36, color)
    text(draw, x + 18, 428, name, 20, "#122033")
    text(draw, x + 18, 455, period, 16, "#64748b")

    # Keep same visual rhythm: top 5 by abs estimated value.
    top5 = sorted(rows, key=lambda r: float(r["absEstimatedValueYi"]), reverse=True)[:5]
    y = 494
    for idx, row in enumerate(top5):
        tag = str(row["typeLabel"])
        if tag in {"加碼", "新增"}:
            tag_bg = "#d94b3d"
        elif tag in {"減碼", "刪除"}:
            tag_bg = "#138a55"
        else:
            tag_bg = "#a67815"
        draw.rounded_rectangle((x + 18, y - 20, x + 92, y + 7), radius=13, fill=tag_bg)
        text(draw, x + 55, y - 1, tag, 15, "#ffffff", anchor="mm")
        text(draw, x + 100, y, str(row["stockName"]), 19, "#102033")
        val = float(row["estimatedValueYi"])
        val_color = "#d94b3d" if val >= 0 else "#138a55"
        text(draw, x + 305, y, f"{signed(val, 2)}億", 19, val_color, anchor="ra")

        sub = f"{format_delta_lots(int(row['deltaLots']))}｜權重 {signed(float(row['weightDelta']), 3)}%"
        text(draw, x + 100, y + 25, sub, 15, "#687386")
        if idx < len(top5) - 1:
            draw.line((x + 18, y + 20, x + 304, y + 20), fill="#edf0f5", width=1)
        y += 55


def build_image(latest_date: str, rows: list[dict[str, object]], output_png: Path, output_json: Path) -> None:
    image = Image.new("RGB", (1080, 1350), "white")
    draw_gradient_background(image)
    draw = ImageDraw.Draw(image)

    # Header
    draw.rectangle((0, 0, 1080, 155), fill="#061426")
    draw.line((38, 121, 1042, 121), fill="#e1b95e", width=3)
    draw.ellipse((40, 39, 108, 107), fill="#e1b95e")
    draw.ellipse((44, 43, 104, 103), fill="#123152")
    draw.line((57, 77, 70, 90), fill="#e1b95e", width=8)
    draw.line((70, 90, 101, 52), fill="#e1b95e", width=8)

    date_tag = latest_date.replace("-", "")[4:]
    title = f"{date_tag} 主動ETF換股雷達"
    subtitle = "00981A、00991A、00403A｜官方持股比對前一開盤日"
    text(draw, 540, 70, title, 52, "#ffe6a3", anchor="mm")
    text(draw, 540, 112, subtitle, 24, "#dbeafe", anchor="mm")

    # Highlights
    draw.rounded_rectangle((38, 176, 1042, 326), radius=18, fill="#fff8df", outline="#f2d27a", width=2)
    text(draw, 70, 214, "資金流向重點", 24, "#0f1d2d")

    by_etf: dict[str, list[dict[str, object]]] = defaultdict(list)
    for row in rows:
        by_etf[str(row["etfCode"])].append(row)
    for code in by_etf:
        by_etf[code] = sorted(by_etf[code], key=lambda r: float(r["absEstimatedValueYi"]), reverse=True)

    all_sorted = sorted(rows, key=lambda r: float(r["absEstimatedValueYi"]), reverse=True)
    best = max(rows, key=lambda r: float(r["estimatedValueYi"]))
    worst = min(rows, key=lambda r: float(r["estimatedValueYi"]))
    net_403 = sum(float(r["estimatedValueYi"]) for r in by_etf.get("00403A", []))
    net_981 = sum(float(r["estimatedValueYi"]) for r in by_etf.get("00981A", []))
    net_991 = sum(float(r["estimatedValueYi"]) for r in by_etf.get("00991A", []))
    insight_lines = [
        f"1. 最大正向：{best['etfCode']} {best['stockName']} {signed(float(best['estimatedValueYi']), 2)} 億（{format_delta_lots(int(best['deltaLots']))}）。",
        f"2. 最大負向：{worst['etfCode']} {worst['stockName']} {signed(float(worst['estimatedValueYi']), 2)} 億（{format_delta_lots(int(worst['deltaLots']))}）。",
        f"3. 淨額：00403A {signed(net_403,2)} 億｜00981A {signed(net_981,2)} 億｜00991A {signed(net_991,2)} 億。",
    ]
    text(draw, 70, 252, insight_lines[0], 22, "#172033")
    text(draw, 70, 286, insight_lines[1], 22, "#172033")
    text(draw, 70, 320, insight_lines[2], 22, "#172033")

    # Panels
    for code in TARGET_CODES:
        draw_panel(draw, by_etf.get(code, []), PANEL_X[code], PANEL_COLOR[code])

    # Bottom Top8 bars
    draw.rounded_rectangle((38, 770, 1042, 1152), radius=18, fill="#ffffff", outline="#d7dde8", width=2)
    text(draw, 70, 816, "估算金額 Top 8｜用價值衡量配置變化", 28, "#0f1d2d")
    top8 = all_sorted[:8]
    max_abs = max(float(item["absEstimatedValueYi"]) for item in top8) if top8 else 1.0
    y0 = 880
    for idx, item in enumerate(top8):
        y = y0 + idx * 34
        est = float(item["estimatedValueYi"])
        abs_est = float(item["absEstimatedValueYi"])
        rank_name = f"{idx + 1}. {item['stockName']}"
        detail = f"{item['etfCode']}｜{item['typeLabel']} {format_delta_lots(int(item['deltaLots']))}"
        text(draw, 70, y, rank_name, 18, "#102033")
        text(draw, 220, y, detail, 15, "#64748b")
        draw.rounded_rectangle((465, y - 18, 945, y + 4), radius=11, fill="#eef2f7")
        w = int((abs_est / max_abs) * 480) if max_abs > 0 else 0
        bar_color = "#d94b3d" if est >= 0 else "#138a55"
        draw.rounded_rectangle((465, y - 18, 465 + w, y + 4), radius=11, fill=bar_color)
        text(draw, 966, y, f"{signed(est,2)}億", 19, bar_color)

    # Footer
    draw.rounded_rectangle((38, 1174, 1042, 1286), radius=18, fill="#071b33", outline="#e1b95e", width=2)
    text(draw, 74, 1217, "今日策略觀察", 24, "#ffe6a3")
    text(draw, 74, 1250, "00403A 仍偏加碼節奏；00981A、00991A以權重調整與局部換股為主。", 21, "#f8fafc")
    text(draw, 74, 1278, "建議下一步觀察加碼股是否連續兩日獲資金延續。", 21, "#f8fafc")

    text(draw, 42, 1316, f"資料來源：投信官方持股；更新日 {latest_date}；金額為持股差異估算，非投資建議。", 16, "#b8c4d6")
    text(draw, 1038, 1316, "@justin_hsieh_", 20, "#ffffff", anchor="ra")

    output_png.parent.mkdir(parents=True, exist_ok=True)
    output_png.write_bytes(b"")
    image.save(output_png, format="PNG", optimize=True)

    payload = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "latestDate": latest_date,
        "targets": TARGET_CODES,
        "rows": rows,
        "top8": top8,
        "insights": insight_lines,
    }
    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Render daily three-ETF threads card (same layout family as previous day).")
    parser.add_argument("--detail-csv", default=str(REPORTS_DIR / "2026-05-19_target_etf_holding_changes_detail.csv"))
    parser.add_argument("--output-png", default=str(OUTPUT_DIR / "active-etf-0519-threads-card-final.png"))
    parser.add_argument("--output-json", default=str(OUTPUT_DIR / "active-etf-0519-threads-card-data.json"))
    args = parser.parse_args()

    latest_date, rows = select_latest_detail(Path(args.detail_csv).expanduser())
    build_image(
        latest_date=latest_date,
        rows=rows,
        output_png=Path(args.output_png).expanduser(),
        output_json=Path(args.output_json).expanduser(),
    )
    print(json.dumps({"image": str(Path(args.output_png).expanduser()), "data": str(Path(args.output_json).expanduser())}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
