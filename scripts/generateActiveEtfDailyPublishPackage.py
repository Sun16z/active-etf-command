#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _fmt_yi(value: float) -> str:
    return f"{value:+.2f} 億" if value >= 0 else f"{value:.2f} 億"


def _roc_ymd(iso_date: str) -> str:
    parts = iso_date.split("-")
    if len(parts) != 3:
        return iso_date
    year, month, day = parts
    try:
        roc_year = int(year) - 1911
    except Exception:
        return iso_date
    return f"{roc_year:03d}/{month}/{day}"


def _mmdd(iso_date: str) -> str:
    parts = iso_date.split("-")
    if len(parts) != 3:
        return iso_date
    return f"{parts[1]}/{parts[2]}"


@dataclass(frozen=True)
class ConsensusRow:
    stock_code: str
    stock_name: str
    net_yi: float
    same_dir_etf_count: int


def _build_consensus(rows: list[dict[str, Any]]) -> tuple[list[ConsensusRow], list[ConsensusRow]]:
    by_stock: dict[str, dict[str, Any]] = {}
    for r in rows:
        stock_code = str(r.get("stockCode") or "").strip()
        if not stock_code:
            continue
        net = float(r.get("estimatedValueYi") or 0.0)
        if math.isclose(net, 0.0, abs_tol=1e-9):
            continue
        etf_code = str(r.get("etfCode") or "").strip()
        if not etf_code:
            continue
        bucket = by_stock.setdefault(
            stock_code,
            {
                "stockName": str(r.get("stockName") or stock_code).strip(),
                "posEtfs": set(),
                "negEtfs": set(),
                "posNet": 0.0,
                "negNet": 0.0,
            },
        )
        if net > 0:
            bucket["posEtfs"].add(etf_code)
            bucket["posNet"] += net
        else:
            bucket["negEtfs"].add(etf_code)
            bucket["negNet"] += net

    ups: list[ConsensusRow] = []
    downs: list[ConsensusRow] = []
    for stock_code, info in by_stock.items():
        pos_count = len(info["posEtfs"])
        neg_count = len(info["negEtfs"])
        if pos_count >= 2:
            ups.append(
                ConsensusRow(
                    stock_code=stock_code,
                    stock_name=str(info["stockName"]),
                    net_yi=float(info["posNet"]),
                    same_dir_etf_count=pos_count,
                )
            )
        if neg_count >= 2:
            downs.append(
                ConsensusRow(
                    stock_code=stock_code,
                    stock_name=str(info["stockName"]),
                    net_yi=float(info["negNet"]),
                    same_dir_etf_count=neg_count,
                )
            )

    ups.sort(key=lambda r: r.net_yi, reverse=True)
    downs.sort(key=lambda r: r.net_yi)
    return ups, downs


def _classify_today_rows(all_rows: list[dict[str, Any]], report_date: str) -> list[dict[str, Any]]:
    today: list[dict[str, Any]] = []
    for r in all_rows:
        if str(r.get("reportDate") or "") != report_date:
            continue
        if not bool(r.get("reportEligible")):
            continue
        to_date = str(r.get("toDate") or r.get("date") or "")
        if to_date != report_date:
            continue
        today.append(r)
    return today


def _status_counts(rows: list[dict[str, Any]]) -> dict[str, int]:
    counts = {"verified": 0, "fallback": 0, "warning": 0, "other": 0}
    for r in rows:
        status = str(r.get("verificationStatus") or "").strip() or "other"
        if status not in counts:
            counts["other"] += 1
        else:
            counts[status] += 1
    return counts


def _summarize_etf(rows: list[dict[str, Any]], etf_code: str) -> dict[str, Any]:
    target = [r for r in rows if str(r.get("etfCode") or "") == etf_code]
    if not target:
        return {
            "etfCode": etf_code,
            "etfName": etf_code,
            "fromDate": "",
            "toDate": "",
            "netYi": 0.0,
            "counts": {"added": 0, "increased": 0, "decreased": 0, "removed": 0, "weight": 0},
            "topUp": [],
            "topDown": [],
            "verification": "missing",
        }
    etf_name = str(target[0].get("etfName") or etf_code)
    from_date = str(target[0].get("fromDate") or "")
    to_date = str(target[0].get("toDate") or "")
    net_yi = sum(float(r.get("estimatedValueYi") or 0.0) for r in target)
    counts = {"added": 0, "increased": 0, "decreased": 0, "removed": 0, "weight": 0}
    for r in target:
        t = str(r.get("type") or "")
        if t in counts:
            counts[t] += 1
    def row_key(r: dict[str, Any]) -> float:
        return float(r.get("estimatedValueYi") or 0.0)

    up = sorted([r for r in target if row_key(r) > 0], key=row_key, reverse=True)[:3]
    down = sorted([r for r in target if row_key(r) < 0], key=row_key)[:3]
    verification = "verified" if all(str(r.get("verificationStatus") or "") == "verified" for r in target[:25]) else "mixed"
    return {
        "etfCode": etf_code,
        "etfName": etf_name,
        "fromDate": from_date,
        "toDate": to_date,
        "netYi": float(net_yi),
        "counts": counts,
        "topUp": up,
        "topDown": down,
        "verification": verification,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Active ETF daily publish package (article + card).")
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[1]), help="Project root")
    parser.add_argument("--date", default="", help="Report date. Default: outputs/core_db/latest/daily_movements.json meta.reportDate")
    parser.add_argument("--force", action="store_true", help="Overwrite existing publish artifacts")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    core_path = root / "outputs" / "core_db" / "latest" / "daily_movements.json"
    if not core_path.exists():
        raise SystemExit(f"Missing core DB: {core_path}")
    core = _load_json(core_path)
    meta = core.get("meta") or {}
    report_date = str(args.date or meta.get("reportDate") or "").strip()
    as_of = str(meta.get("asOf") or "").strip() or report_date
    if not report_date:
        raise SystemExit("Missing reportDate")

    out_dir = root / "outputs" / "daily_publish" / report_date
    out_dir.mkdir(parents=True, exist_ok=True)
    article_path = out_dir / f"active_etf_chatgpt_article_{report_date}.md"
    card_copy_path = out_dir / f"active_etf_chatgpt_card_copy_{report_date}.json"
    card_path = out_dir / f"active_etf_chatgpt_three_column_card_{report_date}.png"

    if not args.force and article_path.exists() and card_copy_path.exists() and card_path.exists():
        print(json.dumps({"ok": True, "skipped": True, "reportDate": report_date}, ensure_ascii=False))
        return

    all_rows = core.get("rows") or []
    today_rows = _classify_today_rows(all_rows, report_date)
    status_counts = _status_counts(today_rows)
    today_etf_codes = sorted({str(r.get("etfCode") or "") for r in today_rows if str(r.get("etfCode") or "").strip()})
    today_etf_count = len(today_etf_codes)
    today_row_count = len(today_rows)

    net_total = sum(float(r.get("estimatedValueYi") or 0.0) for r in today_rows)
    net_by_etf: dict[str, float] = {}
    for r in today_rows:
        code = str(r.get("etfCode") or "").strip()
        if not code:
            continue
        net_by_etf[code] = net_by_etf.get(code, 0.0) + float(r.get("estimatedValueYi") or 0.0)
    top_etf = sorted(net_by_etf.items(), key=lambda kv: kv[1], reverse=True)[:3]

    ups, downs = _build_consensus(today_rows)
    top_up = ups[0] if ups else None
    top_down = downs[0] if downs else None

    targets = ["00981A", "00991A", "00403A"]
    target_summaries = {code: _summarize_etf(today_rows, code) for code in targets}

    report_path = root / "outputs" / "reports" / f"{report_date}_target_etf_holding_changes.json"
    if report_path.exists():
        holding_changes = _load_json(report_path)
        by_code = {str(r.get("etfCode") or ""): r for r in (holding_changes.get("summary") or [])}
        for code in targets:
            summary = by_code.get(code)
            if summary:
                target_summaries[code]["fromDate"] = str(summary.get("fromDate") or target_summaries[code]["fromDate"])
                target_summaries[code]["toDate"] = str(summary.get("toDate") or target_summaries[code]["toDate"])

    card_diff_bits: list[str] = []
    s_981 = target_summaries.get("00981A") or {}
    s_403 = target_summaries.get("00403A") or {}
    s_991 = target_summaries.get("00991A") or {}
    card_diff_bits.append(f"981A淨加碼{abs(float(s_981.get('netYi') or 0.0)):.2f}億" if float(s_981.get("netYi") or 0.0) >= 0 else f"981A淨減碼{abs(float(s_981.get('netYi') or 0.0)):.2f}億")
    card_diff_bits.append("403A換手明顯" if (s_403.get("counts", {}).get("increased", 0) + s_403.get("counts", {}).get("decreased", 0) + s_403.get("counts", {}).get("added", 0) + s_403.get("counts", {}).get("removed", 0)) >= 6 else "403A變動集中")
    card_diff_bits.append("991A以權重漂移為主" if s_991.get("counts", {}).get("weight", 0) >= max(6, (today_row_count // 100)) else "991A換股偏多")

    from_dates = [str(target_summaries[c].get("fromDate") or "") for c in targets if str(target_summaries[c].get("fromDate") or "")]
    range_text = f"{min(from_dates)}→{report_date}" if from_dates else f"{report_date}"

    three_verified = all(str(target_summaries[c].get("verification") or "") == "verified" for c in targets)
    verified_tag = "三檔皆官網核對通過" if three_verified else "三檔含部分待核對"

    card_copy = {
        "title": "三檔主動式ETF比一比",
        "dateSuffix": f"{report_date} 正式資料",
        "subtitle": f"00981A / 00991A / 00403A｜{range_text} 持股變動與資金估算",
        "marketStrip": f"{_mmdd(report_date)} 正式資料 {today_row_count} 筆，{today_etf_count} 檔；{verified_tag}（future PCF 已分流）",
        "signals": [
            {
                "icon": "up",
                "title": "共識買進",
                "body": f"{top_up.stock_name} +{top_up.net_yi:.2f}億（{top_up.same_dir_etf_count}檔同向）" if top_up else "（本日共識買進不足 2 檔同向）",
            },
            {
                "icon": "circle",
                "title": "全體淨變動",
                "body": f"{_fmt_yi(net_total).replace(' 億','億')}（toDate={_mmdd(report_date)}）",
            },
            {
                "icon": "down",
                "title": "共識賣出",
                "body": f"{top_down.stock_name} {top_down.net_yi:.2f}億（{top_down.same_dir_etf_count}檔同向）" if top_down else "（本日共識賣出不足 2 檔同向）",
            },
            {
                "icon": "circle",
                "title": "關鍵差異",
                "body": "；".join(card_diff_bits),
            },
        ],
        "footnote": "資料整理：投信官網優先；官網缺口以 ETF資訊網備援並標示。未來 PCF 已分流，不納入今日正式比較。",
    }
    card_copy_path.write_text(json.dumps(card_copy, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    top_etf_lines = "\n".join([f"  - {code} {_fmt_yi(net)}" for code, net in top_etf]) if top_etf else "  - （無）"
    up_lines = "\n".join(
        [f"- {c.stock_name}（{c.stock_code}）：+{c.net_yi:.2f} 億（{c.same_dir_etf_count} 檔同向）" for c in ups[:5]]
    ) or "- （無）"
    down_lines = "\n".join(
        [f"- {c.stock_name}（{c.stock_code}）：{c.net_yi:.2f} 億（{c.same_dir_etf_count} 檔同向）" for c in downs[:5]]
    ) or "- （無）"

    def render_etf_section(code: str) -> str:
        s = target_summaries.get(code) or {}
        etf_name = str(s.get("etfName") or code)
        from_date = str(s.get("fromDate") or "")
        to_date = str(s.get("toDate") or report_date)
        counts = s.get("counts") or {}
        net_yi = float(s.get("netYi") or 0.0)
        up = s.get("topUp") or []
        down = s.get("topDown") or []

        def fmt_pick(r: dict[str, Any]) -> str:
            stock = f"{r.get('stockName','')}（{r.get('stockCode','')}）"
            yi = float(r.get("estimatedValueYi") or 0.0)
            w = r.get("weightDelta")
            lots = r.get("deltaLots")
            extra: list[str] = []
            if lots not in (None, "") and float(lots) != 0:
                extra.append(f"{int(lots):+d} 張" if abs(int(lots)) < 10_000_000 else f"{lots}")
            if w not in (None, "") and float(w) != 0:
                extra.append(f"權重 {float(w):+g}")
            extra_text = "（" + "；".join(extra) + "）" if extra else ""
            return f"- {stock} {_fmt_yi(yi)}{extra_text}"

        up_block = "\n".join(fmt_pick(r) for r in up) if up else "- （無）"
        down_block = "\n".join(fmt_pick(r) for r in down) if down else "- （無）"

        return (
            f"### {code} {etf_name}（{from_date} → {to_date}）\n"
            f"- 今日異動型態：權重變動 {counts.get('weight',0)}、加碼 {counts.get('increased',0)}、減碼 {counts.get('decreased',0)}、剔除 {counts.get('removed',0)}、新增 {counts.get('added',0)}\n"
            f"- 淨變動估算：{_fmt_yi(net_yi)}\n"
            f"- 主要加權 / 加碼（估算金額）：\n{up_block}\n\n"
            f"- 主要降權 / 減碼（估算金額）：\n{down_block}\n"
        )

    article = (
        f"# 主動式 ETF 每日追蹤（{report_date}｜asOf {as_of}）\n\n"
        "## 資料查核 Gate（必讀）\n"
        "- 本文所有數字與清單均來自 `active-etf-command` 的 data layer：投信官網優先；官網缺資料時才使用 ETF資訊網備援，並以 `fallback/警示` 標示。\n"
        f"- 今日正式資料日：{report_date}。\n"
        f"- 今日正式資料層（`toDate={report_date}` 且 `reportEligible=true`）：{today_row_count} 筆、{today_etf_count} 檔。\n"
        f"  - `verified={status_counts['verified']}`、`fallback={status_counts['fallback']}`、`warning={status_counts['warning']}`\n"
        "- 若投信官網揭露到未來 PCF，系統分流到 `nextPcfMovements`，不納入今日正式比較與共識統計。\n\n"
        f"## 今日全體概覽（asOf {as_of}）\n"
        f"- 全體淨變動估算（Σ estimatedValueYi）：{_fmt_yi(net_total)}\n"
        "- 淨流入前三（ETF 層級，Σ estimatedValueYi）：\n"
        f"{top_etf_lines}\n\n"
        f"## 共識買進 / 賣出（跨 ETF 同向加總，asOf {as_of}）\n"
        "> 規則：同一標的在 ≥2 檔 ETF 同向（買進或賣出），以 Σ estimatedValueYi 排序。\n\n"
        "### 共識買進（net 為正）\n"
        f"{up_lines}\n\n"
        "### 共識賣出（net 為負）\n"
        f"{down_lines}\n\n"
        "## 00981A / 00991A / 00403A 重點（官網優先）\n\n"
        f"{render_etf_section('00981A')}\n"
        f"{render_etf_section('00991A')}\n"
        f"{render_etf_section('00403A')}\n"
        "## 經理人可能思路（推測，不是事實）\n"
        "- 以共識買進與三檔淨變動為線索，推測調整方向聚焦在資金集中標的與權重漂移幅度。\n\n"
        "## 圖卡版面決策（ChatGPT 生成）\n"
        "- 三欄對照：同一套訊號框呈現『全體淨變動 / 共識買進 / 共識賣出 / 三檔差異』。\n\n"
        "## 風險提示\n"
        "- 金額為『快照差異 × 估算價值』推估，用於方向與順位判讀；不等於實際成交。\n"
        "- 非投資建議。\n"
    )
    article_path.write_text(article, encoding="utf-8")

    subprocess.run(
        [
            "python3",
            str(root / "scripts" / "renderThreeActiveEtfComparisonCard.py"),
            "--date",
            report_date,
            "--content-json",
            str(card_copy_path),
            "--output",
            str(card_path),
        ],
        check=True,
    )

    print(
        json.dumps(
            {
                "ok": True,
                "reportDate": report_date,
                "asOf": as_of,
                "article": str(article_path),
                "cardCopy": str(card_copy_path),
                "card": str(card_path),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
