#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
W, H = 1080, 1350
BG = "#FAFAF7"
INK = "#111111"
MUTED = "#555555"
LINE = "#111111"
GREEN = "#1B8A4A"
RED = "#D32F2F"
CORAL = "#FF7A72"
MINT = "#6EC6A0"
BLACK = "#050505"

COLORS = {
    "00981A": "#1E4D8B",
    "00991A": "#1B6B5E",
    "00403A": "#D85E2A",
}
LIGHT = {
    "00981A": "#EAF2FF",
    "00991A": "#EAF6F0",
    "00403A": "#FFF0E8",
}
QUOTES = {
    "00981A": "把資金往聯電、日月光與欣興補位，同時降低京元電子與華通的短線曝險。",
    "00991A": "小幅加碼台灣晶技、緯穎與奇鋐，並降低金像電在籃子裡的比重。",
    "00403A": "新增環球晶並加碼聯發科、健策與台達電，把資金集中到半導體鏈。",
}
TAGS = {
    "00981A": "加碼聯電與日月光，減京元電子",
    "00991A": "台灣晶技續加碼，金像電減碼",
    "00403A": "新增環球晶，加碼聯發科與健策",
}
NAME_ALIASES = {
    "台灣積體": "台積電",
    "台光電子": "台光電",
    "聯發": "聯發科",
    "台達電子": "台達電",
    "台達電子工業": "台達電",
    "金像電子": "金像電",
    "金像電子（股）公司": "金像電",
    "國巨*": "國巨",
    "欣興電子": "欣興",
    "致茂電子": "致茂",
    "高力熱處": "高力",
    "群聯電子": "群聯",
    "南亞電路": "南電",
}


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


FONT_BOLD = "/System/Library/Fonts/STHeiti Medium.ttc"
FONT_REG = "/System/Library/Fonts/STHeiti Light.ttc"
F = {
    "title": font(FONT_BOLD, 54),
    "date": font(FONT_BOLD, 36),
    "caption": font(FONT_BOLD, 24),
    "code": font(FONT_BOLD, 48),
    "manager": font(FONT_REG, 22),
    "tag": font(FONT_BOLD, 19),
    "head": font(FONT_BOLD, 17),
    "row": font(FONT_BOLD, 20),
    "num": font(FONT_BOLD, 19),
    "small": font(FONT_REG, 16),
    "tiny": font(FONT_REG, 13),
    "quote_head": font(FONT_BOLD, 17),
    "quote": font(FONT_BOLD, 17),
    "cons_title": font(FONT_BOLD, 30),
    "cons": font(FONT_BOLD, 20),
    "cons_small": font(FONT_REG, 16),
    "footer": font(FONT_REG, 13),
}


def text_w(draw: ImageDraw.ImageDraw, text: str, font_obj: ImageFont.FreeTypeFont) -> int:
    box = draw.textbbox((0, 0), text, font=font_obj)
    return box[2] - box[0]


def draw_right(draw: ImageDraw.ImageDraw, right_x: int, y: int, text: str, font_obj: ImageFont.FreeTypeFont, fill: str) -> None:
    draw.text((right_x - text_w(draw, text, font_obj), y), text, font=font_obj, fill=fill)


def draw_center(draw: ImageDraw.ImageDraw, y: int, text: str, font_obj: ImageFont.FreeTypeFont, fill: str, left: int = 0, right: int = W) -> None:
    draw.text(((left + right - text_w(draw, text, font_obj)) // 2, y), text, font=font_obj, fill=fill)


def normalize_name(name: str) -> str:
    return NAME_ALIASES.get(str(name).strip(), str(name).strip())


def number(value: Any) -> float:
    try:
        return float(value)
    except Exception:
        return 0.0


def signed(value: float, digits: int = 1, suffix: str = "") -> str:
    prefix = "+" if value > 0 else ""
    return f"{prefix}{value:,.{digits}f}{suffix}"


def lots(value: float) -> str:
    prefix = "+" if value > 0 else ""
    return f"{prefix}{int(round(value)):,}"


def md(value: str) -> str:
    try:
        _, month, day = str(value).split("-")
        return f"{int(month)}/{int(day)}"
    except Exception:
        return str(value)


def wrap(draw: ImageDraw.ImageDraw, text: str, font_obj: ImageFont.FreeTypeFont, max_w: int, max_lines: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for ch in text:
        trial = current + ch
        if current and text_w(draw, trial, font_obj) > max_w:
            lines.append(current)
            current = ch
            if len(lines) >= max_lines:
                return lines[:max_lines]
        else:
            current = trial
    if current and len(lines) < max_lines:
        lines.append(current)
    return lines


def load_universe() -> dict[str, Any]:
    js = """
import { etfs } from './src/data/etfUniverse.js';
console.log(JSON.stringify(etfs.filter((item) => ['00981A','00991A','00403A'].includes(item.code))));
"""
    result = subprocess.run(
        ["node", "--input-type=module", "-e", js],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return {item["code"]: item for item in json.loads(result.stdout)}


def core_rows(core: dict[str, Any], code: str, report_date: str) -> list[dict[str, Any]]:
    rows = []
    for row in core.get("rows") or []:
        if row.get("etfCode") != code:
            continue
        if row.get("reportEligible") is False:
            continue
        if str(row.get("toDate") or row.get("date") or "") != report_date:
            continue
        rows.append(row)
    return rows


def pick_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    share_rows = [row for row in rows if number(row.get("deltaLots")) != 0]
    if share_rows:
        return sorted(share_rows, key=lambda row: number(row.get("newWeight")), reverse=True)[:5]
    return sorted(rows, key=lambda row: abs(number(row.get("estimatedValueYi"))), reverse=True)[:5]


def row_action(row: dict[str, Any]) -> str:
    label = str(row.get("typeLabel") or row.get("type") or "")
    name = normalize_name(str(row.get("stockName") or ""))
    delta = number(row.get("deltaLots"))
    if label in {"新增", "剔除", "刪除", "removed", "added"}:
        if delta > 0:
            return f"{name}新增"
        return f"{name}清倉"
    prefix = "+" if delta > 0 else ""
    return f"{name}{prefix}{int(round(delta))}"


def build_note(rows: list[dict[str, Any]]) -> str:
    share_rows = [row for row in rows if number(row.get("deltaLots")) != 0]
    if not share_rows:
        return "今日零張數變動，僅列權重變動"
    notable = sorted(share_rows, key=lambda row: abs(number(row.get("estimatedValueYi"))), reverse=True)[:2]
    return "換股｜" + "、".join(row_action(row) for row in notable)


def consensus(core: dict[str, Any], report_date: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    grouped: dict[str, dict[str, Any]] = {}
    for row in core.get("rows") or []:
        if row.get("etfCode") not in COLORS:
            continue
        if row.get("reportEligible") is False:
            continue
        if str(row.get("toDate") or row.get("date") or "") != report_date:
            continue
        stock = str(row.get("stockCode") or "")
        if not stock:
            continue
        slot = grouped.setdefault(stock, {"names": [], "pos": defaultdict(float), "neg": defaultdict(float)})
        slot["names"].append(normalize_name(str(row.get("stockName") or "")))
        value = number(row.get("estimatedValueYi"))
        if value > 0:
            slot["pos"][row["etfCode"]] += value
        elif value < 0:
            slot["neg"][row["etfCode"]] += value

    ups: list[dict[str, Any]] = []
    downs: list[dict[str, Any]] = []
    for stock, slot in grouped.items():
        name = Counter(slot["names"]).most_common(1)[0][0]
        if len(slot["pos"]) >= 2:
            ups.append({"stock": stock, "name": name, "value": sum(slot["pos"].values()), "etfs": sorted(slot["pos"])})
        if len(slot["neg"]) >= 2:
            downs.append({"stock": stock, "name": name, "value": sum(slot["neg"].values()), "etfs": sorted(slot["neg"])})
    ups.sort(key=lambda row: (len(row["etfs"]), row["value"]), reverse=True)
    downs.sort(key=lambda row: (len(row["etfs"]), abs(row["value"])), reverse=True)
    return ups, downs


def draw_pill(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, outline: str | None = None) -> None:
    draw.rounded_rectangle(box, radius=5, fill=fill, outline=outline, width=1 if outline else 0)


def draw_column(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    w: int,
    h: int,
    code: str,
    etf: dict[str, Any],
    rows: list[dict[str, Any]],
) -> None:
    color = COLORS[code]
    light = LIGHT[code]
    draw.rounded_rectangle((x, y, x + w, y + h), radius=7, outline=color, width=2, fill="#FFFFFF")
    draw.rectangle((x, y, x + w, y + 6), fill=color)
    draw_center(draw, y + 28, code, F["code"], color, x, x + w)
    draw_center(draw, y + 84, f"經理人｜{etf.get('manager') or ''}", F["manager"], INK, x, x + w)
    draw_pill(draw, (x + 13, y + 126, x + w - 13, y + 168), light, "#C7D4DD")
    draw_center(draw, y + 136, TAGS[code], F["tag"], color, x + 14, x + w - 14)

    list_y = y + 200
    draw_right(draw, x + w - 154, list_y - 30, "張數", F["head"], INK)
    draw_right(draw, x + w - 12, list_y - 30, "權重金額", F["head"], INK)
    for idx, row in enumerate(rows):
        yy = list_y + idx * 40
        value = number(row.get("estimatedValueYi"))
        arrow = "▲" if value >= 0 else "▼"
        arrow_color = GREEN if value >= 0 else RED
        name = normalize_name(str(row.get("stockName") or ""))
        draw.text((x + 18, yy), arrow, font=F["row"], fill=arrow_color)
        draw.text((x + 50, yy), name[:4], font=F["row"], fill=INK)
        draw_right(draw, x + w - 148, yy, lots(number(row.get("deltaLots"))), F["num"], INK)
        draw_right(draw, x + w - 12, yy, signed(value, 2, "億"), F["num"], arrow_color)

    note_y = y + 410
    draw_pill(draw, (x + 12, note_y, x + w - 12, note_y + 68), light, "#C7D4DD")
    draw.text((x + 28, note_y + 16), "●", font=F["small"], fill=color)
    note_lines = wrap(draw, build_note(rows_all[code]), F["small"], w - 70, 2)
    for i, line in enumerate(note_lines):
        draw.text((x + 52, note_y + 13 + i * 23), line, font=F["small"], fill=color)

    count_y = y + 492
    lot_count = sum(1 for row in rows_all[code] if number(row.get("deltaLots")) != 0)
    core = " / ".join(normalize_name(item[1]) for item in (etf.get("holdings") or [])[:3])
    draw.text((x + 14, count_y), f"異動 {len(rows_all[code])}筆｜張數 {lot_count}筆｜核心 {core}", font=F["tiny"], fill=INK)

    metric_y = y + 532
    metrics = [
        ("◆", "配置變動估算", signed(sum(number(r.get("estimatedValueYi")) for r in rows_all[code]), 1, "億")),
        ("■", "規模", f"{number(etf.get('aum')):,.1f}億"),
        ("◇", "NAV / 溢價", f"{number(etf.get('nav')):.2f} / {signed(number(etf.get('premium')), 2, '%')}"),
    ]
    for icon, label, value in metrics:
        draw.line((x + 14, metric_y - 8, x + w - 14, metric_y - 8), fill="#D8D8D8", width=1)
        draw.text((x + 28, metric_y), icon, font=F["row"], fill=color)
        draw.text((x + 60, metric_y + 1), label, font=F["row"], fill=INK)
        draw_right(draw, x + w - 14, metric_y + 1, value, F["num"], color)
        metric_y += 43

    quote_y = y + h - 126
    draw_pill(draw, (x + 12, quote_y, x + w - 12, y + h - 12), light, "#C7D4DD")
    draw.text((x + 28, quote_y + 14), "經理人可能在想", font=F["quote_head"], fill=color)
    for i, line in enumerate(wrap(draw, QUOTES[code], F["quote"], w - 56, 3)):
        draw.text((x + 28, quote_y + 43 + i * 25), line, font=F["quote"], fill=INK)


core = json.loads((ROOT / "outputs/core_db/latest/daily_movements.json").read_text(encoding="utf-8"))
universe = load_universe()
report = str(core["meta"]["reportDate"])
rows_all = {code: core_rows(core, code, report) for code in COLORS}
from_dates = sorted({str(row.get("fromDate") or "") for rows in rows_all.values() for row in rows if row.get("fromDate")})
range_text = f"{md(from_dates[-1])} → {md(report)}" if from_dates else md(report)

img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)
draw_center(draw, 28, "三檔主動式ETF比一比", F["title"], INK)
date_y = 102
date_text = range_text
date_x = (W - (text_w(draw, date_text, F["date"]) + text_w(draw, " 趨勢 ｜ 今日換股實錄", F["date"]))) // 2
draw.text((date_x, date_y), date_text, font=F["date"], fill="#C8312A")
draw.text((date_x + text_w(draw, date_text, F["date"]) + 16, date_y), "趨勢", font=F["date"], fill=INK)
draw.text((date_x + text_w(draw, date_text + " 趨勢", F["date"]) + 28, date_y), "｜ 今日換股實錄", font=F["date"], fill=MUTED)
draw_center(draw, 154, "00981A / 00991A / 00403A ｜ 持股增減｜配置變動｜折溢價", F["caption"], MUTED)
draw.line((24, 196, W - 24, 196), fill=LINE, width=3)

col_y = 224
col_w = 346
col_h = 800
for x, code in zip([18, 367, 716], ["00981A", "00991A", "00403A"]):
    draw_column(draw, x, col_y, col_w, col_h, code, universe[code], pick_rows(rows_all[code]))

ups, downs = consensus(core, report)
block_y = 1046
draw.rounded_rectangle((18, block_y, W - 18, 1288), radius=6, fill=BLACK)
draw.polygon([(18, block_y), (190, block_y), (220, block_y + 48), (18, block_y + 48)], fill="#C8312A")
draw.text((48, block_y + 10), "三檔共識", font=F["cons_title"], fill="#FFFFFF")
draw.text((246, block_y + 14), "同向權重上修｜各價格漂移與張數變動", font=F["caption"], fill="#FFFFFF")

left_items = ups[:4]
right_items = ups[4:8]
for base_x, items, start_rank in [(42, left_items, 1), (586, right_items, 5)]:
    for i, item in enumerate(items):
        yy = block_y + 72 + i * 34
        rank = start_rank + i
        draw.text((base_x, yy), str(rank), font=F["cons"], fill="#FFFFFF")
        draw.text((base_x + 44, yy), item["name"], font=F["cons"], fill="#FFFFFF")
        draw_right(draw, base_x + 288, yy, signed(number(item["value"]), 2, "億"), F["cons"], MINT)
        draw.text((base_x + 330, yy + 4), f"{len(item['etfs'])}檔共同", font=F["cons_small"], fill="#B8B8B8")

draw_center(
    draw,
    block_y + 206,
    "※ 共同下修｜" + "・".join(f"{item['name']} {signed(number(item['value']), 2, '億')}" for item in downs[:4]) if downs else "※ 共同下修｜今日無兩檔以上同向下修",
    F["cons_small"],
    "#D0D0D0",
    36,
    W - 36,
)

footer = f"資料整理：依 {range_text} 原始持股權益與官網 PCF 計算 / 經理人想法為持股變化推測 / 來源：投信官網優先，ETF資訊網備援"
draw.text((32, 1308), footer, font=F["footer"], fill="#666666")
draw_right(draw, W - 36, 1308, "@justin_hsieh_", F["small"], INK)

out_dir = ROOT / "outputs/daily_publish" / report
out_dir.mkdir(parents=True, exist_ok=True)
existing = sorted(out_dir.glob(f"three_etf_threads_infographic_{report}_local_v*.png"))
out = out_dir / f"three_etf_threads_infographic_{report}_local_v{len(existing) + 1}.png"
img.save(out)
print(json.dumps({"ok": True, "output": str(out), "reportDate": report}, ensure_ascii=False))
