#!/usr/bin/env python3
"""Render the three-column active ETF comparison card.

The card reads the already-refreshed official-first data modules in this repo
and writes a 1080x1350 PNG for social/TG posting.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CODES = ["00981A", "00991A", "00403A"]
WIDTH = 1080
HEIGHT = 1350


PALETTE = {
    "navy": "#062A73",
    "blue": "#0A4BB7",
    "teal": "#007D80",
    "orange": "#F15A16",
    "red": "#D71111",
    "green": "#057A30",
    "ink": "#111827",
    "muted": "#5B6472",
    "line": "#B7C3D0",
    "soft": "#F4F7FB",
    "white": "#FFFFFF",
}


@dataclass(frozen=True)
class FontSet:
    title: ImageFont.FreeTypeFont
    subtitle: ImageFont.FreeTypeFont
    section: ImageFont.FreeTypeFont
    body: ImageFont.FreeTypeFont
    body_bold: ImageFont.FreeTypeFont
    small: ImageFont.FreeTypeFont
    tiny: ImageFont.FreeTypeFont
    number: ImageFont.FreeTypeFont
    big_number: ImageFont.FreeTypeFont


def font_path() -> str:
    candidates = [
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for item in candidates:
        if Path(item).exists():
            return item
    raise RuntimeError("No usable CJK font found")


def make_fonts() -> FontSet:
    path = font_path()
    return FontSet(
        title=ImageFont.truetype(path, 56),
        subtitle=ImageFont.truetype(path, 36),
        section=ImageFont.truetype(path, 29),
        body=ImageFont.truetype(path, 25),
        body_bold=ImageFont.truetype(path, 28),
        small=ImageFont.truetype(path, 22),
        tiny=ImageFont.truetype(path, 18),
        number=ImageFont.truetype(path, 31),
        big_number=ImageFont.truetype(path, 58),
    )


def text_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> int:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


def text_height(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> int:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[3] - bbox[1]


def draw_center(
    draw: ImageDraw.ImageDraw,
    y: int,
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: str,
    x0: int = 0,
    x1: int = WIDTH,
) -> None:
    x = (x0 + x1 - text_width(draw, text, font)) / 2
    draw.text((int(round(x)), int(round(y))), text, font=font, fill=fill)


def wrap_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont,
    max_width: int,
    max_lines: int | None = None,
) -> list[str]:
    normalized = str(text).replace("\n", " ").strip()
    lines: list[str] = []
    current = ""
    for char in normalized:
        trial = current + char
        if current and text_width(draw, trial, font) > max_width:
            lines.append(current)
            current = char
            if max_lines and len(lines) >= max_lines:
                break
        else:
            current = trial
    if current and (not max_lines or len(lines) < max_lines):
        lines.append(current)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
    return lines


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: str,
    max_width: int,
    line_gap: int = 6,
    max_lines: int | None = None,
) -> int:
    x, y = xy
    lines = wrap_text(draw, text, font, max_width, max_lines)
    for line in lines:
        draw.text((int(round(x)), int(round(y))), line, font=font, fill=fill)
        y += text_height(draw, line, font) + line_gap
    return y


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, outline: str | None = None, width: int = 1, radius: int = 10) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def normalize_name(name: str) -> str:
    replacements = {
        "台灣積體": "台積電",
        "台光電子": "台光電",
        "群聯電子": "群聯",
        "欣興電子": "欣興",
        "致茂電子": "致茂",
        "聯發": "聯發科",
        "國巨股份": "國巨",
    }
    return replacements.get(str(name), str(name))


def format_signed(value: float, digits: int = 1, suffix: str = "") -> str:
    sign = "+" if value > 0 else ""
    return f"{sign}{value:,.{digits}f}{suffix}"


def format_signed_int(value: float, suffix: str = "") -> str:
    sign = "+" if value > 0 else ""
    return f"{sign}{int(round(value)):,}{suffix}"


def format_month_day(value: str) -> str:
    try:
        _, month, day = value.split("-")
        return f"{int(month)}/{int(day)}"
    except Exception:
        return value


def load_data(root: Path, codes: list[str], report_date: str | None) -> dict[str, Any]:
    js = f"""
import {{ dailyMovements, dailyMovementMeta }} from './src/data/dailyMovements.js';
import {{ etfs }} from './src/data/etfUniverse.js';
const codes = {json.dumps(codes)};
const reportDate = {json.dumps(report_date)} || dailyMovementMeta.asOf;
const sourceHealthByCode = new Map((dailyMovementMeta.sourceHealth || []).map((row) => [row.etfCode, row]));
const output = {{
  meta: dailyMovementMeta,
  reportDate,
  etfs: codes.map((code) => {{
    const universe = etfs.find((item) => item.code === code) || {{}};
    const rows = dailyMovements
      .filter((row) => row.etfCode === code && row.date === reportDate && row.reportEligible !== false);
    const number = (value) => Number(value || 0);
    const byAbsLots = [...rows]
      .filter((row) => number(row.deltaLots) !== 0)
      .sort((a, b) => {{
        const aw = Math.abs(number(a.weightDelta));
        const bw = Math.abs(number(b.weightDelta));
        if (bw !== aw) return bw - aw;
        const av = Math.abs(number(a.estimatedValueYi));
        const bv = Math.abs(number(b.estimatedValueYi));
        if (bv !== av) return bv - av;
        return Math.abs(number(b.deltaLots)) - Math.abs(number(a.deltaLots));
      }});
    const byAbsWeight = [...rows]
      .filter((row) => number(row.weightDelta) !== 0 || number(row.estimatedValueYi) !== 0)
      .sort((a, b) => {{
        const aw = Math.abs(number(a.weightDelta));
        const bw = Math.abs(number(b.weightDelta));
        if (bw !== aw) return bw - aw;
        return Math.abs(number(b.estimatedValueYi)) - Math.abs(number(a.estimatedValueYi));
      }});
    const byAbsValue = byAbsWeight;
    const netYi = byAbsValue.reduce((sum, row) => sum + number(row.estimatedValueYi), 0);
    const buyYi = byAbsValue.filter((row) => number(row.estimatedValueYi) > 0).reduce((sum, row) => sum + number(row.estimatedValueYi), 0);
    const sellYi = byAbsValue.filter((row) => number(row.estimatedValueYi) < 0).reduce((sum, row) => sum + number(row.estimatedValueYi), 0);
    const serialize = (row) => ({{
      stockCode: row.stockCode,
      stockName: row.stockName,
      type: row.type,
      typeLabel: row.typeLabel,
      oldWeight: number(row.oldWeight),
      newWeight: number(row.newWeight),
      weightDelta: number(row.weightDelta),
      oldShares: number(row.oldShares),
      newShares: number(row.newShares),
      sharesDelta: number(row.sharesDelta),
      deltaLots: number(row.deltaLots),
      estimatedValueYi: number(row.estimatedValueYi),
      valueBasis: row.valueBasis,
    }});
    return {{
      code,
      universe,
      sourceHealth: sourceHealthByCode.get(code) || {{}},
      rows: rows.map(serialize),
      lotChanges: byAbsLots.slice(0, 12).map(serialize),
      valueChanges: byAbsValue.slice(0, 12).map(serialize),
      counts: {{
        rows: rows.length,
        lots: byAbsLots.length,
        value: byAbsValue.length,
        adds: rows.filter((row) => ['added', 'increased'].includes(row.type)).length,
        cuts: rows.filter((row) => ['removed', 'decreased'].includes(row.type)).length,
        weightOnly: rows.filter((row) => row.type === 'weight').length,
      }},
      flow: {{
        netYi: Number(netYi.toFixed(1)),
        buyYi: Number(buyYi.toFixed(1)),
        sellYi: Number(sellYi.toFixed(1)),
      }},
    }};
  }}),
}};
console.log(JSON.stringify(output));
"""
    result = subprocess.run(
        ["node", "--input-type=module", "-e", js],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


def top_holding_line(item: dict[str, Any]) -> str:
    top = item.get("universe", {}).get("topHoldings") or []
    names = [normalize_name(row[1]) for row in top[:3] if len(row) > 1]
    return " / ".join(names) if names else "資料不足"


def thesis_for(code: str, item: dict[str, Any], content: dict[str, Any] | None = None) -> str:
    override = (content or {}).get("etfs", {}).get(code, {}).get("thesis")
    if override:
        return str(override)
    if code == "00981A":
        return "高估值成長仍在核心，資金大幅補位"
    if code == "00991A":
        return "張數未動，重點看權重與價格漂移"
    if code == "00403A":
        return "換出金融，升級科技與AI硬體密度"
    return "主動調整持股結構"


def manager_thought(code: str, content: dict[str, Any] | None = None) -> str:
    override = (content or {}).get("etfs", {}).get(code, {}).get("managerThought")
    if override:
        return str(override)
    if code == "00981A":
        return "可能在用申購資金補強AI鏈與高成長股，同時降低華碩這類波動部位。"
    if code == "00991A":
        return "可能先讓既有未來50籃子跟著盤勢重估，維持台積電、台光電、群聯等核心。"
    if code == "00403A":
        return "可能在大量換手中退出金融權重，轉向能承載資金的科技與PCB組合。"
    return "可能依盤勢調整核心與衛星持股。"


def pick_main_rows(item: dict[str, Any]) -> tuple[str, list[dict[str, Any]]]:
    lot_rows = item.get("lotChanges") or []
    if lot_rows:
        return "主要變動張數", lot_rows[:5]
    return "主要變動權重", (item.get("valueChanges") or [])[:5]


def draw_row(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    width: int,
    row: dict[str, Any],
    fonts: FontSet,
    prefer_lots: bool,
) -> int:
    delta_lots = float(row.get("deltaLots") or 0)
    value_yi = float(row.get("estimatedValueYi") or 0)
    weight_delta = float(row.get("weightDelta") or 0)
    direction_value = delta_lots if prefer_lots else (value_yi if value_yi else weight_delta)
    arrow = "▲" if direction_value >= 0 else "▼"
    color = PALETTE["green"] if direction_value >= 0 else PALETTE["red"]
    name = normalize_name(row.get("stockName", ""))
    draw.text((x, y), arrow, font=fonts.body_bold, fill=color)
    draw.text((x + 34, y), name[:8], font=fonts.body_bold, fill=PALETTE["ink"])
    if prefer_lots:
        value = f"{format_signed_int(delta_lots, '張')}（{format_signed(weight_delta, 3, '%')}）"
    else:
        if abs(value_yi) >= 0.05:
            value = format_signed(value_yi, 1, "億")
        else:
            value = format_signed(weight_delta, 3, "%")
    draw.text((x + width - text_width(draw, value, fonts.body_bold), y), value, font=fonts.body_bold, fill=color)
    return y + 41


def draw_metric(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    icon: str,
    label: str,
    value: str,
    fonts: FontSet,
    color: str,
    right_x: int,
) -> int:
    draw.text((x, y), icon, font=fonts.body_bold, fill=color)
    draw.text((x + 38, y + 2), label, font=fonts.small, fill=PALETTE["ink"])
    value_font = fonts.small if text_width(draw, value, fonts.small) <= 142 else fonts.tiny
    draw.text((right_x - text_width(draw, value, value_font), y + 2), value, font=value_font, fill=PALETTE["ink"])
    return y + 34


def draw_column(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    width: int,
    height: int,
    item: dict[str, Any],
    color: str,
    fonts: FontSet,
    content: dict[str, Any] | None = None,
) -> None:
    code = item["code"]
    universe = item.get("universe", {})
    flow = item.get("flow", {})
    counts = item.get("counts", {})
    rounded(draw, (x, y, x + width, y + height), PALETTE["white"], color, width=2, radius=12)
    draw.rounded_rectangle((x, y, x + width, y + 96), radius=12, fill=color)
    draw.rectangle((x, y + 74, x + width, y + 96), fill=color)
    draw_center(draw, y + 10, code, fonts.big_number, PALETTE["white"], x, x + width)
    manager = universe.get("manager") or "資料待補"
    draw_center(draw, y + 68, f"經理人｜{manager}", fonts.small, PALETTE["white"], x, x + width)

    cursor = y + 110
    thesis_lines = wrap_text(draw, thesis_for(code, item, content), fonts.small, width - 40, max_lines=2)
    for line in thesis_lines:
        draw_center(draw, cursor, line, fonts.small, PALETTE["ink"], x + 18, x + width - 18)
        cursor += text_height(draw, line, fonts.small) + 4
    cursor += 12

    section_title, rows = pick_main_rows(item)
    prefer_lots = section_title.endswith("張數")
    if rows:
        for row in rows[:5]:
            cursor = draw_row(draw, x + 28, cursor, width - 56, row, fonts, prefer_lots)
    else:
        cursor = draw_wrapped(draw, (x + 28, cursor), "今日未揭露可比對異動", fonts.body_bold, PALETTE["muted"], width - 56)

    if not prefer_lots:
        draw.text((x + 28, cursor + 2), "● 今日無張數變動，改列權重變動", font=fonts.tiny, fill=color)
        cursor += 34
    elif item.get("valueChanges"):
        value_hint = item["valueChanges"][0]
        hint = f"● 金額最大：{normalize_name(value_hint['stockName'])} {format_signed(float(value_hint['estimatedValueYi']), 1, '億')}"
        draw.text((x + 28, cursor + 2), hint[:24], font=fonts.tiny, fill=color)
        cursor += 34

    note_text = f"異動 {counts.get('rows', 0)}筆｜張數 {counts.get('lots', 0)}筆｜核心 {top_holding_line(item)}"
    draw_wrapped(draw, (x + 28, cursor + 2), note_text, fonts.tiny, PALETTE["muted"], width - 56, line_gap=4, max_lines=2)

    draw.line((x + 22, y + 496, x + width - 22, y + 496), fill=PALETTE["line"], width=1)
    metric_y = y + 516
    metric_right = x + width - 28
    metric_y = draw_metric(draw, x + 28, metric_y, "◆", "配置變動估算", format_signed(float(flow.get("netYi") or 0), 1, "億"), fonts, color, metric_right)
    metric_y = draw_metric(draw, x + 28, metric_y, "◼", "規模", f"{float(universe.get('aum') or 0):,.1f}億", fonts, color, metric_right)
    metric_y = draw_metric(draw, x + 28, metric_y, "◇", "NAV/溢價", f"{float(universe.get('nav') or 0):.2f} / {format_signed(float(universe.get('premium') or 0), 2, '%')}", fonts, color, metric_right)

    quote_y = y + height - 146
    rounded(draw, (x + 22, quote_y, x + width - 22, y + height - 20), "#FFFDF8", color, width=2, radius=8)
    rounded(draw, (x + 22, quote_y, x + width - 22, quote_y + 38), color, radius=8)
    draw.text((x + 38, quote_y + 5), "“ 經理人可能在想", font=fonts.section, fill=PALETTE["white"])
    draw_wrapped(draw, (x + 38, quote_y + 49), manager_thought(code, content), fonts.tiny, PALETTE["ink"], width - 76, line_gap=5, max_lines=3)


def consensus(data: dict[str, Any]) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    for item in data["etfs"]:
        for row in item.get("rows", []):
            rows.append({**row, "etfCode": item["code"]})
    by_code: dict[str, dict[str, Any]] = {}
    for row in rows:
        code = str(row.get("stockCode"))
        if not code or code == "None":
            continue
        slot = by_code.setdefault(
            code,
            {
                "name": normalize_name(row.get("stockName", "")),
                "buyEtfs": set(),
                "sellEtfs": set(),
                "value": 0.0,
            },
        )
        value = float(row.get("estimatedValueYi") or 0)
        delta_lots = float(row.get("deltaLots") or 0)
        weight_delta = float(row.get("weightDelta") or 0)
        slot["value"] += value
        signal = value if abs(value) > 0 else delta_lots if delta_lots else weight_delta
        if signal > 0:
            slot["buyEtfs"].add(row["etfCode"])
        elif signal < 0:
            slot["sellEtfs"].add(row["etfCode"])
    buys = sorted(by_code.values(), key=lambda x: (len(x["buyEtfs"]), x["value"]), reverse=True)
    sells = sorted(by_code.values(), key=lambda x: (len(x["sellEtfs"]), abs(x["value"])), reverse=True)
    return {"buys": buys, "sells": sells}


def draw_signal_box(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    icon: str,
    title: str,
    body: str,
    fonts: FontSet,
    icon_color: str,
) -> None:
    rounded(draw, box, "#FFFFFF", "#AEBCCA", width=2, radius=8)
    x0, y0, x1, _ = box
    cx, cy = x0 + 52, y0 + 50
    if icon == "square":
        draw.rounded_rectangle((cx - 20, cy - 20, cx + 20, cy + 20), radius=6, outline=icon_color, width=6)
    elif icon == "bars":
        draw.rectangle((cx - 22, cy + 6, cx - 12, cy + 20), fill=icon_color)
        draw.rectangle((cx - 5, cy - 4, cx + 5, cy + 20), fill=icon_color)
        draw.rectangle((cx + 12, cy - 18, cx + 22, cy + 20), fill=icon_color)
    elif icon == "diamond":
        draw.polygon([(cx, cy - 24), (cx + 24, cy), (cx, cy + 24), (cx - 24, cy)], fill=icon_color)
    else:
        draw.ellipse((cx - 23, cy - 23, cx + 23, cy + 23), fill=icon_color)
    draw.text((x0 + 100, y0 + 22), title, font=fonts.body_bold, fill=PALETTE["ink"])
    draw_wrapped(draw, (x0 + 100, y0 + 58), body, fonts.tiny, PALETTE["ink"], x1 - x0 - 120, line_gap=3, max_lines=2)


def draw_signal_box_large(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    title: str,
    body: str,
    fonts: FontSet,
    accent: str,
) -> None:
    rounded(draw, box, "#FFFFFF", "#AEBCCA", width=2, radius=10)
    x0, y0, x1, _ = box
    rounded(draw, (x0 + 18, y0 + 16, x1 - 18, y0 + 56), accent, radius=14)
    draw_center(draw, y0 + 20, title, fonts.section, PALETTE["white"], x0 + 18, x1 - 18)
    draw_wrapped(draw, (x0 + 28, y0 + 70), body, fonts.tiny, PALETTE["ink"], x1 - x0 - 56, line_gap=4, max_lines=7)


def render_card(data: dict[str, Any], output: Path, content: dict[str, Any] | None = None) -> None:
    fonts = make_fonts()
    image = Image.new("RGB", (WIDTH, HEIGHT), PALETTE["white"])
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, HEIGHT), fill="#FBFCFF")
    card_content = (content or {}).get("card", content or {})

    meta = data["meta"]
    report_date = data["reportDate"]
    from_dates = [item.get("universe", {}).get("comparisonFromDate") for item in data["etfs"] if item.get("universe", {}).get("comparisonFromDate")]
    to_dates = [item.get("universe", {}).get("comparisonToDate") for item in data["etfs"] if item.get("universe", {}).get("comparisonToDate")]
    from_label = format_month_day(sorted(from_dates)[0] if from_dates else report_date)
    to_label = format_month_day(sorted(to_dates)[-1] if to_dates else report_date)

    draw_center(draw, 18, str(card_content.get("title") or "三檔主動式ETF比一比"), fonts.title, PALETTE["navy"])
    date_text = f"{from_label}-{to_label} 趨勢"
    date_w = text_width(draw, date_text, fonts.big_number)
    date_suffix = str(card_content.get("dateSuffix") or "今日換股實錄")
    suffix_w = text_width(draw, date_suffix, fonts.subtitle)
    date_x = int(round((WIDTH - date_w - suffix_w - 24) / 2))
    draw.text((date_x, 85), date_text, font=fonts.big_number, fill=PALETTE["red"])
    draw.text((date_x + date_w + 18, 100), date_suffix, font=fonts.subtitle, fill="#000000")
    draw_center(
        draw,
        157,
        str(card_content.get("subtitle") or "00981A / 00991A / 00403A｜持股增減、資金估算與折溢價"),
        fonts.body_bold,
        PALETTE["ink"],
    )

    # The blue status strip is intentionally removed to keep the card cleaner.

    x_positions = [30, 375, 720]
    colors = [PALETTE["blue"], PALETTE["teal"], PALETTE["orange"]]
    for x, color, item in zip(x_positions, colors, data["etfs"]):
        draw_column(draw, x, 258, 330, 770, item, color, fonts, card_content)

    rounded(draw, (407, 1040, 673, 1082), PALETTE["navy"], radius=18)
    draw_center(draw, 1044, "三檔共同訊號", fonts.subtitle, PALETTE["white"], 407, 673)

    sig = consensus(data)
    overrides = card_content.get("consensusBuys") if isinstance(card_content.get("consensusBuys"), list) else []
    buy_items = overrides or sig["buys"]
    buy_lines: list[str] = []
    for item in buy_items[:8]:
        name = str(item.get("name") or "")
        value = float(item.get("value") or 0)
        etfs = sorted(list(item.get("buyEtfs") or []))
        if not name or not etfs:
            continue
        buy_lines.append(f"{name} {format_signed(value, 2, '億')}（{'/'.join(etfs)}）")
    buy_body = "\n".join(buy_lines) if buy_lines else "資料不足"
    draw_signal_box_large(draw, (30, 1095, 1050, 1290), "共識權重上修（股票｜估算｜ETF）", buy_body, fonts, PALETTE["blue"])

    foot = str(card_content.get("footnote") or (
        f"資料整理：依 {from_label}、{to_label} 原始持股權益與官網 PCF 計算；"
        "經理人想法為持股變化推測。來源：投信官網優先，ETF資訊網備援。"
    ))
    draw.ellipse((82, 1310, 108, 1336), outline=PALETTE["navy"], width=3)
    draw.text((93, 1309), "i", font=fonts.small, fill=PALETTE["navy"])
    draw_wrapped(draw, (126, 1304), foot, fonts.tiny, PALETTE["ink"], 740, line_gap=3, max_lines=2)
    draw.text((880, 1314), "@justin_hsieh_", font=fonts.small, fill=PALETTE["ink"])

    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output)


def main() -> None:
    parser = argparse.ArgumentParser(description="Render three active ETF comparison card.")
    parser.add_argument("--date", default=None, help="Report date, default dailyMovementMeta.asOf")
    parser.add_argument("--output", default=None, help="Output PNG path")
    parser.add_argument("--root", default=str(PROJECT_ROOT), help="Project root")
    parser.add_argument("--content-json", default=None, help="ChatGPT-generated card copy JSON")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    data = load_data(root, DEFAULT_CODES, args.date)
    report_date = data["reportDate"]
    output = Path(args.output) if args.output else root / "outputs" / "daily_publish" / report_date / f"active_etf_three_column_card_{report_date}.png"
    if not output.is_absolute():
        output = root / output
    content = None
    if args.content_json:
        content_path = Path(args.content_json)
        if not content_path.is_absolute():
            content_path = root / content_path
        content = json.loads(content_path.read_text(encoding="utf-8"))
    render_card(data, output, content=content)
    print(json.dumps({"ok": True, "output": str(output), "reportDate": report_date}, ensure_ascii=False))


if __name__ == "__main__":
    main()
