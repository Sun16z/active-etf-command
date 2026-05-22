#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "outputs" / "active-etf-0519-qa-radar-v2.png"

W, H = 1080, 1350
M = 34

FONT_CANDIDATES = [
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/Library/Fonts/Arial Unicode.ttf",
]


def f(size: int) -> ImageFont.ImageFont:
    for item in FONT_CANDIDATES:
        path = Path(item)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def bbox(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0], box[3] - box[1]


def t(
    draw: ImageDraw.ImageDraw,
    xy: tuple[float, float],
    text: str,
    size: int,
    fill: str,
    anchor: str = "la",
    align: str = "left",
) -> None:
    draw.text(xy, text, font=f(size), fill=fill, anchor=anchor, align=align)


def wrap(draw: ImageDraw.ImageDraw, text: str, size: int, max_width: int) -> list[str]:
    font = f(size)
    lines: list[str] = []
    current = ""
    for ch in text:
        trial = current + ch
        if bbox(draw, trial, font)[0] <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = ch
    if current:
        lines.append(current)
    return lines


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, outline: str | None = None, width: int = 1, r: int = 14) -> None:
    draw.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def gradient_bg() -> Image.Image:
    img = Image.new("RGB", (W, H), "#061426")
    draw = ImageDraw.Draw(img)
    top = (5, 19, 37)
    bottom = (13, 44, 49)
    for y in range(H):
        ratio = y / max(1, H - 1)
        color = tuple(int(top[i] * (1 - ratio) + bottom[i] * ratio) for i in range(3))
        draw.line((0, y, W, y), fill=color)
    for x in range(0, W, 54):
        draw.line((x, 0, x, H), fill=(255, 255, 255, 9), width=1)
    for y in range(0, H, 54):
        draw.line((0, y, W, y), fill=(255, 255, 255, 7), width=1)
    return img


def pill(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, color: str, size: int = 14) -> int:
    font = f(size)
    tw, th = bbox(draw, text, font)
    rounded(draw, (x, y, x + tw + 22, y + th + 12), color, r=10)
    draw.text((x + 11, y + 6), text, font=font, fill="#ffffff")
    return x + tw + 30


def draw_finding_card(draw: ImageDraw.ImageDraw) -> None:
    rounded(draw, (M, 150, W - M, 354), "#fff6d8", "#f1d27d", 2, r=18)
    t(draw, (62, 186), "今日 3 大發現", 25, "#102033")
    lines = [
        "1. 聯電連兩天跨檔共識：00403A +6,000張、00981A +3,000張，合計 +9,000張 / +10.17億，短線主線確立。",
        "2. 嘉澤是今天新跨檔訊號：00981A 新增 +260張、00403A +70張，合計 +330張 / +7.67億，連接器族群進雷達。",
        "3. 00981A 是唯一實際賣超檔：信驊 -61張 / -9.85億，單檔賣壓等於該檔加碼總和。",
    ]
    y = 218
    for line in lines:
        for part in wrap(draw, line, 18, 940):
            t(draw, (62, y), part, 18, "#172033")
            y += 24
        y += 2


def draw_etf_card(
    draw: ImageDraw.ImageDraw,
    x: int,
    code: str,
    name: str,
    label: str,
    color: str,
    metric_lines: list[str],
    detail_lines: list[str],
) -> None:
    y0 = 374
    rounded(draw, (x, y0, x + 322, 662), "#ffffff", "#d8dee8", 2, r=16)
    draw.rounded_rectangle((x, y0, x + 322, y0 + 10), radius=8, fill=color)
    t(draw, (x + 18, y0 + 46), code, 34, color)
    t(draw, (x + 18, y0 + 76), name, 18, "#132033")
    pill(draw, x + 18, y0 + 100, label, color, size=14)
    y = y0 + 146
    for line in metric_lines:
        t(draw, (x + 18, y), line, 17, "#0f1d2d")
        y += 26
    y += 2
    draw.line((x + 18, y, x + 304, y), fill="#e5eaf0", width=1)
    y += 21
    for line in detail_lines:
        for part in wrap(draw, line, 13, 284):
            t(draw, (x + 18, y), part, 13, "#4b5563")
            y += 17


def draw_rank_row(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    width: int,
    idx: int,
    text_main: str,
    lots: str,
    value: str,
    max_abs: float,
    val: float,
    color: str,
    tags: str = "",
    amount_x: int | None = None,
) -> None:
    title = f"{idx}. {text_main}"
    if tags:
        title += f" {tags}"
    t(draw, (x, y), title, 14, "#102033")
    bx = x + 235
    by = y + 1
    bar_w = max(6, int(width * abs(val) / max_abs))
    rounded(draw, (bx, by, bx + width, by + 16), "#eef2f7", r=8)
    rounded(draw, (bx, by, bx + bar_w, by + 16), color, r=8)
    t(draw, (amount_x or bx + width + 12, y + 10), value, 15, color, anchor="ra")
    t(draw, (x, y + 22), lots, 13, "#64748b")


def draw_rankings(draw: ImageDraw.ImageDraw) -> None:
    rounded(draw, (M, 678, W - M, 1004), "#ffffff", "#d8dee8", 2, r=16)
    t(draw, (62, 718), "真加減碼 Top 榜", 26, "#0f1d2d")
    t(draw, (62, 752), "加碼榜 Top 6", 18, "#d94b3d")
    t(draw, (610, 752), "減碼榜 Top 3", 18, "#138a55")

    buys = [
        ("00403A 聯電", "+6,000張", "+6.78億", 6.78, "[2/3 共識]"),
        ("00981A 嘉澤", "+260張", "+6.04億", 6.04, "[2/3 共識] [新增]"),
        ("00403A 欣興", "+630張", "+5.15億", 5.15, ""),
        ("00403A 奇鋐", "+200張", "+4.78億", 4.78, ""),
        ("00403A 金像電", "+300張", "+3.85億", 3.85, ""),
        ("00981A 聯電", "+3,000張", "+3.39億", 3.39, "[2/3 共識]"),
        ("00403A 華通", "+1,269張", "+3.25億", 3.25, ""),
    ]
    sells = [
        ("00981A 信驊", "-61張", "-9.85億", -9.85),
        ("00981A 欣銓", "-1,258張", "-2.89億", -2.89),
        ("00981A 創意", "-11張", "-0.52億", -0.52),
    ]
    max_buy = max(item[3] for item in buys)
    max_sell = max(abs(item[3]) for item in sells)
    y = 784
    for idx, (main, lots, value, val, tags) in enumerate(buys, start=1):
        draw_rank_row(draw, 62, y, 170, idx, main, lots, value, max_buy, val, "#d94b3d", tags, amount_x=536)
        y += 38
    y = 784
    for idx, (main, lots, value, val) in enumerate(sells, start=1):
        draw_rank_row(draw, 610, y, 100, idx, main, lots, value, max_sell, val, "#138a55", amount_x=1024)
        y += 38


def draw_notes(draw: ImageDraw.ImageDraw) -> None:
    rounded(draw, (M, 1022, W - M, 1098), "#eef2f7", "#cbd5e1", 2, r=16)
    t(draw, (62, 1054), "QA 註記", 23, "#0f1d2d")
    note = "本榜單只計入「股數實際變動」的標的。股數為 0 張的權重浮動屬於市值波動，非投信買賣行為，本榜不列。"
    y = 1042
    for part in wrap(draw, note, 17, 780):
        t(draw, (170, y), part, 17, "#334155")
        y += 25
    rounded(draw, (M, 1116, W - M, 1278), "#fff6d8", "#f1d27d", 2, r=16)
    t(draw, (62, 1150), "明日觀察", 23, "#102033")
    observations = [
        "1. 聯電若被三檔同時買進，共識升級成短線主線。",
        "2. 嘉澤的跨檔新訊號是否延續，是連接器族群風向。",
        "3. 00981A 信驊賣壓是否擴散到其他 IC 設計檔，要留意創意、智原。",
    ]
    y = 1180
    for line in observations:
        for part in wrap(draw, line, 18, 930):
            t(draw, (62, y), part, 18, "#172033")
            y += 26
        y += 2


def render() -> None:
    img = gradient_bg()
    draw = ImageDraw.Draw(img)

    # Header
    draw.rectangle((0, 0, W, 128), fill="#061426")
    draw.line((M, 122, W - M, 122), fill="#e1b95e", width=3)
    t(draw, (W / 2, 48), "0519 主動 ETF 換股雷達", 47, "#ffe6a3", anchor="mm")
    t(draw, (W / 2, 84), "QA 版｜真加減碼 vs 權重浮動分開計算", 24, "#dbeafe", anchor="mm")
    t(draw, (W / 2, 112), "資料更新：2026-05-19 18:34｜比較 2026-05-18 → 2026-05-19", 16, "#b8c4d6", anchor="mm")

    draw_finding_card(draw)

    draw_etf_card(
        draw,
        38,
        "00403A",
        "主動統一升級50",
        "火力全開",
        "#d68118",
        ["真加碼 13 檔｜真減碼 0 檔", "總加碼 +36.85 億"],
        ["Top 2：聯電 +6.78億 / 欣興 +5.15億"],
    )
    draw_etf_card(
        draw,
        379,
        "00981A",
        "主動統一台股增長",
        "大換股日",
        "#dd4c35",
        ["真加碼 2 檔｜真減碼 4 檔", "淨額 -4.34 億"],
        ["加碼 Top 2：嘉澤新增 +6.04億、聯電 +3.39億", "減碼4：信驊-9.85、欣銓-2.89、創意-0.52、華碩-0.51億"],
    )
    draw_etf_card(
        draw,
        720,
        "00991A",
        "主動復華未來50",
        "成長補強",
        "#177d72",
        ["真加碼 5 檔｜真減碼 0 檔", "總加碼 +5.69 億"],
        ["Top 2：景碩 +1.80億 / 旺矽 +1.15億"],
    )

    draw_rankings(draw)
    draw_notes(draw)

    t(draw, (42, 1304), "資料來源：統一投信 PCF、復華投信官方 Excel｜2026-05-18 為前一開盤日｜非投資建議", 16, "#b8c4d6")
    t(draw, (W - 42, 1304), "@justin_hsieh_", 20, "#ffffff", anchor="ra")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, format="PNG", optimize=True)
    print(OUT)


if __name__ == "__main__":
    render()
