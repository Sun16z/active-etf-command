#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
W, H = 1080, 1350
BG = "#FAFAF7"
INK = "#111111"
MUTED = "#555555"
BLUE = "#1E4D8B"
GREEN = "#1B6B5E"
ORANGE = "#D85E2A"
RED = "#C8312A"
BLACK = "#050505"
LINE = "#D8D8D2"
MINT = "#6EC6A0"

FONT_BOLD = "/System/Library/Fonts/STHeiti Medium.ttc"
FONT_REG = "/System/Library/Fonts/STHeiti Light.ttc"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


F = {
    "title": font(FONT_BOLD, 50),
    "date": font(FONT_BOLD, 32),
    "caption": font(FONT_BOLD, 22),
    "section": font(FONT_BOLD, 25),
    "body": font(FONT_REG, 19),
    "body_bold": font(FONT_BOLD, 19),
    "small": font(FONT_REG, 16),
    "tiny": font(FONT_REG, 13),
    "footer": font(FONT_REG, 13),
    "mono": font(FONT_BOLD, 18),
}


def text_w(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> int:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0]


def center(draw: ImageDraw.ImageDraw, y: int, text: str, fnt: ImageFont.FreeTypeFont, fill: str, left: int = 0, right: int = W) -> None:
    draw.text(((left + right - text_w(draw, text, fnt)) // 2, y), text, font=fnt, fill=fill)


def right(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, fnt: ImageFont.FreeTypeFont, fill: str) -> None:
    draw.text((x - text_w(draw, text, fnt), y), text, font=fnt, fill=fill)


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, max_width: int, max_lines: int = 99) -> list[str]:
    lines: list[str] = []
    current = ""
    for char in text:
        trial = current + char
        if current and text_w(draw, trial, fnt) > max_width:
            lines.append(current)
            current = char
            if len(lines) >= max_lines:
                return lines[:max_lines]
        else:
            current = trial
    if current and len(lines) < max_lines:
        lines.append(current)
    return lines


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    text: str,
    fnt: ImageFont.FreeTypeFont,
    fill: str,
    max_width: int,
    gap: int = 6,
    max_lines: int = 99,
) -> int:
    for line in wrap(draw, text, fnt, max_width, max_lines):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += 24 + gap
    return y


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, outline: str | None = None, width: int = 1, radius: int = 8) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def bullet_list(draw: ImageDraw.ImageDraw, x: int, y: int, items: Iterable[str], color: str, max_width: int, fnt: ImageFont.FreeTypeFont = F["body"]) -> int:
    for item in items:
        draw.text((x, y + 3), "●", font=F["small"], fill=color)
        y = draw_wrapped(draw, x + 28, y, item, fnt, INK, max_width - 28, gap=4, max_lines=3)
        y += 6
    return y


def draw_card(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    w: int,
    h: int,
    color: str,
    title: str,
    eyebrow: str,
    items: list[str],
    foot: str,
) -> None:
    rounded(draw, (x, y, x + w, y + h), "#FFFFFF", color, width=2, radius=8)
    draw.rectangle((x, y, x + w, y + 8), fill=color)
    draw.text((x + 20, y + 26), eyebrow, font=F["small"], fill=MUTED)
    draw.text((x + 20, y + 52), title, font=F["section"], fill=color)
    cursor = y + 94
    cursor = bullet_list(draw, x + 20, cursor, items, color, w - 40, F["body"])
    rounded(draw, (x + 16, y + h - 58, x + w - 16, y + h - 18), "#FAFAF7", "#D8D8D2", width=1, radius=6)
    draw.text((x + 28, y + h - 46), foot, font=F["tiny"], fill=MUTED)


def build_text(report_date: str) -> str:
    return f"""# 每日持倉篩選邏輯｜{report_date}

## 1. 資料進場
- 全主動 ETF 名單先嘗試投信官方端點，取得當日與前一可用持倉日。
- 若官方端點不可回溯或缺資料，保留 ETF資訊網 / 歷史快照作備援，並寫入 sourceHealth。

## 2. 異動列產生
- 以 stockCode 合併前後持股，計算 oldShares、newShares、sharesDelta、deltaLots。
- 同時計算 oldWeight、newWeight、weightDelta 與 estimatedValueYi。
- typeLabel 由股數判斷：新增、刪除、加碼、減碼；股數不變才歸為權重變動。

## 3. 日期 gate
- reportDate 採 Asia/Taipei 今日。
- toDate = reportDate 才是今日正式比較層。
- fromDate = reportDate 且 toDate > reportDate 會進 nextPcfMovements，不納入今日共識、今日圖卡、今日回測。

## 4. 發文與圖卡篩選
- 三檔主圖只取 00981A / 00991A / 00403A，且 toDate 必須等於 reportDate。
- 主文優先挑 deltaLots != 0 的實際張數變動，排除純價格造成的權重漂移。
- 若某檔 ETF 今日無張數變動，才改列權重變動並明確標示。
- 張數變動排序依變動後權重 newWeight，由高到低。

## 5. 共識訊號
- 共識以 stockCode 聚合，名稱再正規化，避免聯發 / 聯發科、台達電 / 台達電子被拆開。
- 同向 ETF 數 >= 2 才列入共同訊號；金額為配置變動估算，不推定真實成交行為。
"""


def main() -> None:
    core_path = ROOT / "outputs/core_db/latest/daily_movements.json"
    core = json.loads(core_path.read_text(encoding="utf-8"))
    report_date = str(core.get("meta", {}).get("reportDate") or "")
    row_count = int(core.get("meta", {}).get("rowCount") or 0)
    etf_count = int(core.get("meta", {}).get("etfCount") or 0)
    next_pcf = int(core.get("meta", {}).get("nextPcfRowCount") or 0)

    out_dir = ROOT / "outputs/daily_publish" / report_date / "logic"
    out_dir.mkdir(parents=True, exist_ok=True)
    text_path = out_dir / f"daily_holding_filter_logic_{report_date}.md"
    text_path.write_text(build_text(report_date), encoding="utf-8")

    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    center(draw, 32, "每日持倉篩選邏輯", F["title"], INK)
    center(draw, 96, f"{report_date}｜從官網快照到發文圖卡", F["date"], RED)
    center(draw, 148, "主動 ETF 持股增減 | 日期 gate | 張數變動 | 共識訊號", F["caption"], MUTED)
    draw.line((28, 194, W - 28, 194), fill=INK, width=3)

    draw_card(
        draw,
        28,
        224,
        326,
        410,
        BLUE,
        "資料進場",
        "Step 1",
        [
            "投信官方端點優先抓當日與前一可用持倉日。",
            "官方缺口才使用 ETF資訊網或本機歷史快照備援。",
            "每檔記錄 source、資料日期、fallback 與失敗原因。",
        ],
        "來源健康寫入 sourceHealth",
    )
    draw_card(
        draw,
        377,
        224,
        326,
        410,
        GREEN,
        "異動列產生",
        "Step 2",
        [
            "用股票代號合併前後持股，計算股數、權重與估算金額。",
            "股數差轉成 deltaLots；權重差轉成 weightDelta。",
            "股數變動決定新增、刪除、加碼、減碼；股數不變才叫權重變動。",
        ],
        "estimatedValueYi 是估算",
    )
    draw_card(
        draw,
        726,
        224,
        326,
        410,
        ORANGE,
        "日期 Gate",
        "Step 3",
        [
            "reportDate 採 Asia/Taipei 今日。",
            "toDate 等於 reportDate 才進今日正式比較。",
            "未來 PCF 只進 nextPcf，排除今日圖文。",
        ],
        f"今日 nextPCF：{next_pcf} 筆",
    )

    draw_card(
        draw,
        28,
        662,
        502,
        335,
        BLUE,
        "發文圖卡篩選",
        "Step 4",
        [
            "只取目標三檔：00981A、00991A、00403A。",
            "主文優先列 deltaLots 不等於 0 的實際張數變動。",
            "排序依變動後權重 newWeight，由高到低；無張數變動才改列權重變動。",
        ],
        "核心口徑：只看經理人主動動作",
    )
    draw_card(
        draw,
        554,
        662,
        498,
        335,
        GREEN,
        "共識訊號",
        "Step 5",
        [
            "以 stockCode 聚合，再把名稱正規化，避免同股不同名。",
            "至少兩檔 ETF 同向，才列入共同加碼或共同下修。",
            "金額是配置變動估算，用於排行，不推定成交行為。",
        ],
        "共識先看同向 ETF 數，再看金額",
    )

    block_y = 1030
    rounded(draw, (28, block_y, W - 28, 1268), BLACK, radius=8)
    draw.polygon([(28, block_y), (210, block_y), (238, block_y + 54), (28, block_y + 54)], fill=RED)
    draw.text((58, block_y + 13), "今日輸出", font=F["section"], fill="#FFFFFF")
    draw.text((270, block_y + 16), "資料層與圖文口徑分開，避免把價格漂移誤讀成交易", font=F["caption"], fill="#FFFFFF")

    output_items = [
        ("dailyMovements", f"{row_count} 筆正式列，{etf_count} 檔 ETF"),
        ("nextPcfMovements", f"{next_pcf} 筆預揭露資料，排除今日圖文"),
        ("target ETF reports", "三檔摘要、明細、JSON 可追溯"),
        ("Threads image", "只挑實際張數變動，圖後先 QA"),
    ]
    for idx, (label, value) in enumerate(output_items):
        yy = block_y + 80 + idx * 36
        draw.text((62, yy), str(idx + 1), font=F["body_bold"], fill="#FFFFFF")
        draw.text((102, yy), label, font=F["body_bold"], fill="#FFFFFF")
        draw.text((360, yy), value, font=F["body"], fill=MINT if idx < 2 else "#D8D8D8")

    draw.line((28, 1294, W - 28, 1294), fill=LINE, width=1)
    draw.text((32, 1312), "資料整理：依 scripts/importDailyMovements.mjs 與 renderThreeEtfThreadsInfographic.py 邏輯整理", font=F["footer"], fill=MUTED)
    right(draw, W - 36, 1312, "@justin_hsieh_", F["small"], INK)

    image_path = out_dir / f"daily_holding_filter_logic_{report_date}.png"
    img.save(image_path)
    print(json.dumps({"ok": True, "text": str(text_path), "image": str(image_path), "reportDate": report_date}, ensure_ascii=False))


if __name__ == "__main__":
    main()
