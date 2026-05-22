from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

S = 2
W, H = 1080, 1600
OUT = Path("/Users/justin/Documents/chatgpt/active-etf-command/outputs/active-etf-0519-full-market-scan-v4.png")

COLORS = {
    "bg": "#0a1929",
    "card": "#10243a",
    "card2": "#0f2236",
    "line": "#243b55",
    "text": "#f8fafc",
    "muted": "#94a3b8",
    "muted2": "#cbd5e1",
    "gold": "#F59E0B",
    "gold2": "#FEF3C7",
    "green": "#22c55e",
    "red": "#ef4444",
    "yellow": "#facc15",
    "blue": "#38bdf8",
    "qa": "#1F2937",
}

FONT_CANDIDATES = [
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/System/Library/Fonts/Supplemental/NotoSansCJKtc-Regular.otf",
    "/Library/Fonts/Arial Unicode.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]


def font_path():
    for p in FONT_CANDIDATES:
        if Path(p).exists():
            return p
    return None


FONT_PATH = font_path()


def f(size):
    if FONT_PATH:
        return ImageFont.truetype(FONT_PATH, size * S)
    return ImageFont.load_default()


def xy(v):
    return tuple(int(round(x * S)) for x in v)


def box(v):
    return tuple(int(round(x * S)) for x in v)


def text(draw, pos, value, size=18, fill=None, anchor=None):
    draw.text(xy(pos), str(value), font=f(size), fill=fill or COLORS["text"], anchor=anchor)


def text_fit(draw, pos, value, size, max_width, fill=None, min_size=8, anchor=None):
    cur = size
    value = str(value)
    while cur > min_size:
        bbox = draw.textbbox((0, 0), value, font=f(cur))
        if (bbox[2] - bbox[0]) <= max_width * S:
            break
        cur -= 1
    draw.text(xy(pos), value, font=f(cur), fill=fill or COLORS["text"], anchor=anchor)


def rounded(draw, rect, radius=22, fill=None, outline=None, width=1):
    draw.rounded_rectangle(box(rect), radius=radius * S, fill=fill, outline=outline, width=width * S)


def pill(draw, rect, label, fill, text_color="#07111f", size=12):
    rounded(draw, rect, radius=(rect[3] - rect[1]) / 2, fill=fill)
    text(draw, ((rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2 - 1), label, size, text_color, "mm")


def section_title(draw, x, y, title, color=COLORS["blue"]):
    rounded(draw, (x, y, x + 10, y + 24), 5, fill=color)
    text(draw, (x + 18, y - 2), title, 20, COLORS["text"])


def draw_metric(draw, x, y, w, h, label, value, color):
    rounded(draw, (x, y, x + w, y + h), 16, fill="#10283f", outline="#1f3a55")
    text_fit(draw, (x + w / 2, y + 18), label, 12, w - 16, COLORS["muted2"], anchor="mm")
    text_fit(draw, (x + w / 2, y + 51), value, 23, w - 14, color, anchor="mm")


def draw_trophy(draw, x, y, scale=1.0):
    c = COLORS["gold"]
    dark = "#92400e"
    sx = scale * S
    x *= S
    y *= S
    draw.rounded_rectangle((x + 11 * sx, y + 10 * sx, x + 45 * sx, y + 42 * sx), radius=int(7 * sx), fill=c, outline=dark, width=max(1, int(2 * sx)))
    draw.arc((x + 1 * sx, y + 13 * sx, x + 22 * sx, y + 36 * sx), 80, 275, fill=c, width=max(2, int(5 * sx)))
    draw.arc((x + 34 * sx, y + 13 * sx, x + 55 * sx, y + 36 * sx), 265, 100, fill=c, width=max(2, int(5 * sx)))
    draw.rectangle((x + 25 * sx, y + 42 * sx, x + 31 * sx, y + 55 * sx), fill=c)
    draw.rounded_rectangle((x + 16 * sx, y + 55 * sx, x + 40 * sx, y + 62 * sx), radius=int(4 * sx), fill=c)
    draw.rounded_rectangle((x + 10 * sx, y + 62 * sx, x + 46 * sx, y + 69 * sx), radius=int(4 * sx), fill=dark)


def draw_bar_row(draw, x, y, w, rank, name, amount, max_amount, color):
    label = f"{rank}. {name}"
    text_fit(draw, (x, y + 1), label, 14, 104, COLORS["text"])
    text(draw, (x + 112, y + 1), amount, 13, COLORS["muted2"])
    bar_x = x + 202
    bar_w = max(12, int((w - 202) * (abs(float(amount.replace('+', '').replace('-', '').replace('億', ''))) / max_amount)))
    rounded(draw, (bar_x, y + 4, bar_x + bar_w, y + 18), 7, fill=color)
    rounded(draw, (bar_x, y + 4, x + w, y + 18), 7, outline="#243b55", width=1)


def main():
    img = Image.new("RGB", (W * S, H * S), COLORS["bg"])
    draw = ImageDraw.Draw(img)

    # subtle background grid
    for gx in range(0, W, 48):
        draw.line((gx * S, 0, gx * S, H * S), fill="#0d2236", width=1)
    for gy in range(0, H, 48):
        draw.line((0, gy * S, W * S, gy * S), fill="#0d2236", width=1)

    mx = 44

    # Header
    text(draw, (mx, 36), "國巨被 4 檔主動 ETF 同步加碼", 42, COLORS["text"])
    text(draw, (mx, 90), "0519 全市場掃描｜12 檔 PCF / 168 筆變動", 24, COLORS["muted2"])
    text(draw, (mx, 124), "2026-05-18 → 2026-05-19｜投信官方 PCF / 申購買回清單", 14, COLORS["muted"])

    # Dashboard
    y = 158
    gap = 24
    cell_w = (W - mx * 2 - gap * 5) / 6
    metrics = [
        ("今日掃描ETF", "12 檔", COLORS["text"]),
        ("持股變動", "168 筆", COLORS["text"]),
        ("實際股數變動", "50 筆", COLORS["text"]),
        ("加碼金額", "+60.42 億", COLORS["green"]),
        ("減碼金額", "-31.70 億", COLORS["red"]),
        ("淨額", "+28.72 億", COLORS["gold"]),
    ]
    for i, (label, value, color) in enumerate(metrics):
        draw_metric(draw, mx + i * (cell_w + gap), y, cell_w, 82, label, value, color)

    # Hero card
    y = 276
    for i in range(0, int(W - mx * 2)):
        ratio = 1 - i / (W - mx * 2)
        if ratio <= 0:
            continue
        r = int(16 + (245 - 16) * 0.10 * ratio)
        g = int(36 + (158 - 36) * 0.10 * ratio)
        b = int(58 + (11 - 58) * 0.10 * ratio)
        draw.line(((mx + i) * S, y * S, (mx + i) * S, (y + 152) * S), fill=f"#{r:02x}{g:02x}{b:02x}", width=S)
    rounded(draw, (mx, y, W - mx, y + 152), 24, outline=COLORS["gold"], width=3)
    draw_trophy(draw, mx + 24, y + 22, 0.72)
    text(draw, (mx + 74, y + 26), "今日主角｜2327 國巨", 27, COLORS["gold"])
    text(draw, (mx + 28, y + 62), "4 檔主動 ETF 同步加碼", 18, COLORS["muted2"])
    hero_stats = [("共識張數", "+925 張"), ("共識金額", "+4.64 億"), ("跨投信數", "4 家")]
    stat_x = mx + 28
    stat_w = 128
    for i, (label, value) in enumerate(hero_stats):
        cx = stat_x + i * stat_w + stat_w / 2
        text(draw, (cx, y + 94), label, 14, COLORS["muted"], "mm")
        text_fit(draw, (cx, y + 127), value, 36, stat_w - 8, COLORS["text"], min_size=27, anchor="mm")
    right_x = mx + 548
    etfs = [
        "00400A 主動國泰動能高息",
        "00403A 主動統一升級50",
        "00991A 主動復華未來50",
        "00995A 主動中信台灣卓越",
    ]
    for i, item in enumerate(etfs):
        rounded(draw, (right_x, y + 24 + i * 29, W - mx - 28, y + 47 + i * 29), 10, fill="#172f47")
        text(draw, (right_x + 12, y + 28 + i * 29), item, 15, COLORS["muted2"])

    # ETF table
    y = 452
    table_h = 300
    rounded(draw, (mx, y, W - mx, y + table_h), 22, fill=COLORS["card2"], outline=COLORS["line"])
    section_title(draw, mx + 22, y + 18, "ETF 加減碼總表｜按淨額排序", COLORS["blue"])
    text(draw, (W - mx - 270, y + 21), "▌", 12, COLORS["red"])
    text(draw, (W - mx - 256, y + 21), "紅色 = 加碼買進 ｜", 12, COLORS["muted2"])
    text(draw, (W - mx - 142, y + 21), "▌", 12, COLORS["green"])
    text(draw, (W - mx - 128, y + 21), "綠色 = 減碼賣出", 12, COLORS["muted2"])
    headers = [("ETF", 66), ("名稱", 138), ("加碼", 360), ("減碼", 515), ("淨額", 675), ("風格", 792)]
    for h, x in headers:
        text(draw, (mx + x, y + 62), h, 12, COLORS["muted"])
    table_rows = [
        ("00403A", "主動統一升級50", "13檔/+36.85億", "0", "+36.85億", "火力全開", "green"),
        ("00991A", "主動復華未來50", "5檔/+5.69億", "0", "+5.69億", "成長補強", "green"),
        ("00400A", "主動國泰動能高息", "2檔/+3.53億", "1檔/-0.41億", "+3.12億", "加碼為主", "yellow"),
        ("00995A", "主動中信台灣卓越", "2檔/+0.25億", "3檔/-0.51億", "-0.26億", "微幅換股", "yellow"),
        ("00985A", "主動野村台灣50", "6檔/+4.67億", "5檔/-6.22億", "-1.55億", "大換股", "yellow"),
        ("00981A", "主動統一台股增長", "2檔/+9.43億", "4檔/-13.77億", "-4.34億", "結構換股", "yellow"),
        ("00997A", "主動群益美國增長", "0", "2檔/-2.43億", "-2.43億", "純減碼", "red"),
        ("00992A", "主動群益科技創新", "0", "4檔/-8.36億", "-8.36億", "純減碼", "red"),
        ("00986A", "主動台新龍頭成長", "0", "1檔/~0", "~0", "幾乎沒動", "gray"),
    ]
    tag_colors = {"green": "#22c55e", "yellow": "#facc15", "red": "#ef4444", "gray": "#64748b"}
    row_y = y + 84
    for i, row in enumerate(table_rows):
        yy = row_y + i * 23
        if i % 2 == 0:
            rounded(draw, (mx + 18, yy - 3, W - mx - 18, yy + 19), 8, fill="#10283f")
        code, name, add, cut, net, tag, tag_color = row
        text(draw, (mx + 66, yy), code, 13, COLORS["text"])
        text_fit(draw, (mx + 138, yy), name, 12, 190, COLORS["muted2"])
        text(draw, (mx + 360, yy), add, 12, COLORS["green"] if add != "0" else COLORS["muted"])
        text(draw, (mx + 515, yy), cut, 12, COLORS["red"] if cut != "0" else COLORS["muted"])
        text(draw, (mx + 675, yy), net, 12, COLORS["gold"] if net.startswith("+") else COLORS["muted2"])
        pill(draw, (mx + 792, yy - 3, mx + 872, yy + 18), tag, tag_colors[tag_color], "#07111f", 10)

    # Consensus cards
    y = 782
    col_w = (W - mx * 2 - 24) / 2
    rounded(draw, (mx, y, mx + col_w, y + 172), 22, fill=COLORS["card"], outline="#7f1d1d")
    rounded(draw, (mx + col_w + 24, y, W - mx, y + 172), 22, fill=COLORS["card"], outline="#14532d")
    rounded(draw, (mx, y, mx + col_w, y + 34), 22, fill="#7f1d1d")
    rounded(draw, (mx + col_w + 24, y, W - mx, y + 34), 22, fill="#14532d")
    text(draw, (mx + 18, y + 8), "共識加碼榜", 18, COLORS["text"])
    text(draw, (mx + col_w + 42, y + 8), "共識減碼榜", 18, COLORS["text"])
    buys = [
        ("1. 2327 國巨", "4檔  +925張  +4.64億", "00400A、00403A、00991A、00995A"),
        ("2. 2303 聯電", "2檔  +9,000張  +10.17億", "00403A、00981A"),
        ("3. 3533 嘉澤", "2檔  +330張  +7.67億", "00403A、00981A"),
        ("4. 2049 上銀", "2檔  +489張  +1.84億", "00403A、00985A"),
    ]
    sells = [
        ("1. 3443 創意", "2檔  -15張  -0.70億", "00981A、00995A"),
        ("2. 3665 貿聯-KY", "2檔  -23張  -0.47億", "00400A、00995A"),
    ]
    for i, (a, b, c) in enumerate(buys):
        yy = y + 47 + i * 30
        text(draw, (mx + 18, yy), a, 14, COLORS["text"])
        text(draw, (mx + 170, yy), b, 13, COLORS["gold"] if i == 0 else COLORS["muted2"])
        text(draw, (mx + 18, yy + 15), c, 11, COLORS["muted"])
    rx = mx + col_w + 42
    for i, (a, b, c) in enumerate(sells):
        yy = y + 52 + i * 45
        text(draw, (rx, yy), a, 15, COLORS["text"])
        text(draw, (rx + 164, yy), b, 13, COLORS["muted2"])
        text(draw, (rx, yy + 18), c, 12, COLORS["muted"])

    # Top charts
    y = 978
    chart_h = 330
    rounded(draw, (mx, y, mx + col_w, y + chart_h), 22, fill=COLORS["card2"], outline="#7f1d1d")
    rounded(draw, (mx + col_w + 24, y, W - mx, y + chart_h), 22, fill=COLORS["card2"], outline="#14532d")
    section_title(draw, mx + 20, y + 18, "加碼金額 Top 10", COLORS["red"])
    section_title(draw, mx + col_w + 44, y + 18, "減碼金額 Top 10", COLORS["green"])
    add_items = [
        ("聯電", "+10.17億"), ("嘉澤", "+7.67億"), ("欣興", "+5.15億"), ("奇鋐", "+4.78億"),
        ("國巨", "+4.64億"), ("金像電", "+3.85億"), ("華通", "+3.25億"), ("臻鼎-KY", "+1.86億"),
        ("富世達", "+1.86億"), ("上銀", "+1.84億"),
    ]
    cut_items = [
        ("信驊", "-9.85億"), ("南亞科", "-4.90億"), ("台積電", "-4.43億"), ("欣銓", "-2.89億"),
        ("雙鴻", "-1.48億"), ("穎崴", "-1.22億"), ("台光電", "-1.21億"), ("華邦電", "-1.17億"),
        ("環宇-KY", "-0.81億"), ("川湖", "-0.75億"),
    ]
    for i, (name, amount) in enumerate(add_items):
        draw_bar_row(draw, mx + 22, y + 62 + i * 25, col_w - 44, i + 1, name, amount, 10.17, COLORS["red"])
    for i, (name, amount) in enumerate(cut_items):
        draw_bar_row(draw, mx + col_w + 46, y + 62 + i * 25, col_w - 44, i + 1, name, amount, 9.85, COLORS["green"])

    # Tomorrow
    y = 1314
    rounded(draw, (mx, y, W - mx, y + 120), 20, fill=COLORS["gold2"], outline=COLORS["gold"])
    text(draw, (mx + 22, y + 18), "明日觀察", 22, "#102033")
    obs = [
        "1. 國巨 4 檔共識若延續，將升級為主動 ETF 短線主線。",
        "2. 00992A 純減碼是否延續，要留意科技型 ETF 連動。",
        "3. 00985A 砍台積電，野村對權值股觀點是否轉變。",
    ]
    for i, line in enumerate(obs):
        text(draw, (mx + 22, y + 54 + i * 24), line, 16, "#102033")

    # Data note
    y = 1454
    rounded(draw, (mx, y, W - mx, y + 76), 20, fill=COLORS["qa"], outline="#334155")
    text(draw, (mx + 22, y + 16), "資料說明", 18, COLORS["blue"])
    text(draw, (mx + 116, y + 17), "本榜單只計入「股數實際變動」的標的，股數為 0 張的權重浮動屬於市值波動，不列入。", 14, "#bfdbfe")
    text(draw, (mx + 22, y + 48), "資料口徑：2026-05-18 → 2026-05-19，不混入 2026-05-19 → 2026-05-20 的明日 PCF。", 15, "#93c5fd")

    # Footer
    y = 1540
    text(draw, (mx, y), "資料來源：12 檔台股主動 ETF 官方 PCF / 申購買回清單", 13, COLORS["muted2"])
    text(draw, (mx, y + 20), "2026-05-18 為前一開盤日｜估算金額為股數差異 × 收盤價｜非投資建議", 12, COLORS["muted"])
    text(draw, (W - mx, y + 20), "追蹤更多 → @justin_hsieh_", 14, COLORS["gold"], "ra")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img = img.resize((W, H), Image.Resampling.LANCZOS)
    img.save(OUT, quality=100, optimize=True)
    print(OUT)


if __name__ == "__main__":
    main()
