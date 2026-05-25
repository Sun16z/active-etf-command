#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Any


DEFAULT_CODES = ["00981A", "00991A", "00403A"]


def number(value: Any) -> float:
    try:
        return float(value)
    except Exception:
        return 0.0


def fmt_yi(value: float) -> str:
    return f"{value:+.2f}億".replace("+-", "-")


def fmt_weight(value: float) -> str:
    return f"{value:+.3f}%".replace("+-", "-")


def fmt_lots(value: float) -> str:
    return f"{int(round(value)):+,}張".replace("+-", "-")


def load_core_db(root: Path) -> dict[str, Any]:
    core = root / "outputs" / "core_db" / "latest" / "daily_movements.json"
    return json.loads(core.read_text(encoding="utf-8"))


def pick_rows(core: dict[str, Any], report_date: str, code: str) -> list[dict[str, Any]]:
    rows = core.get("rows") or []
    picked = []
    for row in rows:
        if row.get("etfCode") != code:
            continue
        if row.get("reportEligible") is False:
            continue
        if str(row.get("toDate") or row.get("date") or "") != report_date:
            continue
        picked.append(row)
    return picked


def sort_lot_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    lot_rows = [row for row in rows if abs(number(row.get("deltaLots"))) > 0]
    lot_rows.sort(
        key=lambda row: (
            abs(number(row.get("weightDelta"))),
            abs(number(row.get("estimatedValueYi"))),
            abs(number(row.get("deltaLots"))),
        ),
        reverse=True,
    )
    return lot_rows


def sort_weight_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    items = [row for row in rows if abs(number(row.get("weightDelta"))) > 0 or abs(number(row.get("estimatedValueYi"))) > 0]
    items.sort(
        key=lambda row: (
            abs(number(row.get("weightDelta"))),
            abs(number(row.get("estimatedValueYi"))),
        ),
        reverse=True,
    )
    return items


def consensus_buys(core: dict[str, Any], report_date: str, codes: list[str]) -> list[dict[str, Any]]:
    by_stock: dict[str, dict[str, Any]] = {}
    rows = core.get("rows") or []
    for row in rows:
        if row.get("etfCode") not in codes:
            continue
        if row.get("reportEligible") is False:
            continue
        if str(row.get("toDate") or row.get("date") or "") != report_date:
            continue
        name = str(row.get("stockName") or "").strip()
        if not name:
            continue
        slot = by_stock.setdefault(
            name,
            {"name": name, "value": 0.0, "byEtf": defaultdict(float)},
        )
        value = number(row.get("estimatedValueYi"))
        slot["value"] += value
        slot["byEtf"][row.get("etfCode")] += value

    consensus = []
    for name, slot in by_stock.items():
        etf_vals = {k: v for k, v in slot["byEtf"].items() if abs(v) > 0}
        if len(etf_vals) < 2:
            continue
        if all(v > 0 for v in etf_vals.values()):
            consensus.append(
                {
                    "name": name,
                    "value": float(sum(etf_vals.values())),
                    "etfs": sorted(etf_vals.keys()),
                    "breakdown": {k: float(v) for k, v in etf_vals.items()},
                }
            )
    consensus.sort(key=lambda item: item["value"], reverse=True)
    return consensus


def build_prompt(report_date: str, from_label: str, to_label: str, per_etf: dict[str, Any], cons: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    lines.append("Create a crisp, high-resolution 1080x1350 social card in Traditional Chinese, no blur, no pixelation.")
    lines.append("Style: clean fintech dashboard, flat design, strong contrast, clear grid alignment, generous padding.")
    lines.append("Typography: sharp CJK sans-serif, ensure all text is perfectly legible on mobile.")
    lines.append("")
    lines.append("Layout requirements:")
    lines.append("1) Top title centered: 「三檔主動式ETF比一比」")
    lines.append(f"2) Second line (big red): 「{from_label}-{to_label} 趨勢」")
    lines.append("3) Remove any extra blue status strip under the header (do not render it).")
    lines.append("4) Three columns with headers: 00981A, 00991A, 00403A.")
    lines.append("5) In each column, list up to 5 rows. If the ETF has any lot changes, show lot rows; otherwise show weight-change rows.")
    lines.append("   - Row format: 「股票名  張數變動（權重變動）」 for lot rows; or 「股票名  權重變動」 for weight-only rows.")
    lines.append("   - Sort lot rows by |權重變動| desc, then |估算金額| desc.")
    lines.append("")
    lines.append("Bottom section:")
    lines.append("A single large box titled: 「共識權重上修（股票｜估算｜ETF）」")
    lines.append("Inside, list 6 lines, each: 「股票名 +X.XX億（ETF1/ETF2/ETF3）」")
    lines.append("")
    lines.append(f"Data date: {report_date} (use the numbers below exactly).")
    lines.append("")

    for code in DEFAULT_CODES:
        block = per_etf.get(code) or {}
        lines.append(f"[{code}]")
        for row in block.get("rows") or []:
            lines.append(row)
        lines.append("")

    lines.append("[Consensus Buys]")
    for item in cons[:6]:
        lines.append(f"{item['name']} {fmt_yi(float(item['value']))}（{'/'.join(item['etfs'])}）")

    return "\n".join(lines).strip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Build ImageGen prompt for three-column active ETF comparison card.")
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[1]))
    parser.add_argument("--date", default="", help="Report date (YYYY-MM-DD). Default from core_db meta.")
    parser.add_argument("--codes", nargs="*", default=DEFAULT_CODES)
    parser.add_argument("--out-dir", default="", help="Output dir. Default outputs/daily_publish/<reportDate>/")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    core = load_core_db(root)
    meta = core.get("meta") or {}
    report_date = args.date.strip() or str(meta.get("reportDate") or meta.get("asOf") or "").strip()
    if not report_date:
        raise SystemExit("Missing reportDate in core_db meta.")

    codes = [str(code).strip() for code in args.codes if str(code).strip()]
    if len(codes) != 3:
        raise SystemExit("Expected exactly 3 ETF codes.")

    from_label = "05/22"
    to_label = f"{report_date[5:7]}/{report_date[8:10]}"

    per_etf: dict[str, Any] = {}
    for code in codes:
        rows = pick_rows(core, report_date, code)
        lot_rows = sort_lot_rows(rows)
        weight_rows = sort_weight_rows(rows)
        out_rows: list[str] = []
        if lot_rows:
            for row in lot_rows[:5]:
                name = str(row.get("stockName") or "").strip()
                out_rows.append(f"{name} {fmt_lots(number(row.get('deltaLots')))}（{fmt_weight(number(row.get('weightDelta')))}）")
        else:
            for row in weight_rows[:5]:
                name = str(row.get("stockName") or "").strip()
                out_rows.append(f"{name} {fmt_weight(number(row.get('weightDelta')))}")
        per_etf[code] = {"rows": out_rows}

    cons = consensus_buys(core, report_date, codes)
    prompt = build_prompt(report_date, from_label, to_label, per_etf, cons)

    out_dir = Path(args.out_dir).expanduser() if args.out_dir else root / "outputs" / "daily_publish" / report_date
    out_dir.mkdir(parents=True, exist_ok=True)
    prompt_path = out_dir / f"active_etf_three_column_image_prompt_{report_date}.txt"
    data_path = out_dir / f"active_etf_three_column_image_prompt_data_{report_date}.json"
    prompt_path.write_text(prompt, encoding="utf-8")
    data_path.write_text(json.dumps({"reportDate": report_date, "codes": codes, "perEtf": per_etf, "consensusBuys": cons[:12]}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({"ok": True, "prompt": str(prompt_path), "data": str(data_path)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
