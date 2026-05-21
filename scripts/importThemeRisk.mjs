import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dailyMovementMeta, dailyMovements } from "../src/data/dailyMovements.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const optional = process.argv.includes("--optional");
const fetchTimeoutMs = Number(process.env.THEME_RISK_FETCH_TIMEOUT_MS || 18_000);
const yahooBaseUrl = "https://query1.finance.yahoo.com/v8/finance/chart";

const watchlist = [
  { code: "DRAM", yahoo: "DRAM", name: "DRAM ETF", market: "美股", theme: "DRAM/HBM", tier: "core", demandBase: 86 },
  { code: "MU", yahoo: "MU", name: "Micron", market: "美股", theme: "DRAM/HBM", tier: "core", demandBase: 88 },
  { code: "SNDK", yahoo: "SNDK", name: "SanDisk", market: "美股", theme: "NAND/儲存", tier: "memory", demandBase: 82 },
  { code: "WDC", yahoo: "WDC", name: "Western Digital", market: "美股", theme: "NAND/儲存", tier: "memory", demandBase: 80 },
  { code: "STX", yahoo: "STX", name: "Seagate", market: "美股", theme: "儲存", tier: "memory", demandBase: 76 },
  { code: "SMH", yahoo: "SMH", name: "SMH 半導體 ETF", market: "美股", theme: "半導體總風險", tier: "semi", demandBase: 70 },
  { code: "SOXX", yahoo: "SOXX", name: "SOXX 半導體 ETF", market: "美股", theme: "半導體總風險", tier: "semi", demandBase: 70 },
  { code: "NVDA", yahoo: "NVDA", name: "NVIDIA", market: "美股", theme: "AI 半導體", tier: "semi", demandBase: 74 },
  { code: "AMD", yahoo: "AMD", name: "AMD", market: "美股", theme: "AI 半導體", tier: "semi", demandBase: 68 },
  { code: "TSM", yahoo: "TSM", name: "台積電 ADR", market: "美股", theme: "半導體總風險", tier: "holding", demandBase: 68 },
  { code: "2408", yahoo: "2408.TW", name: "南亞科", market: "台股", theme: "DRAM", tier: "core", demandBase: 88 },
  { code: "2344", yahoo: "2344.TW", name: "華邦電", market: "台股", theme: "DRAM/NOR", tier: "core", demandBase: 84 },
  { code: "8299", yahoo: "8299.TWO", name: "群聯", market: "台股", theme: "NAND 控制晶片", tier: "core", demandBase: 84 },
  { code: "3260", yahoo: "3260.TWO", name: "威剛", market: "台股", theme: "記憶體模組", tier: "memory", demandBase: 78 },
  { code: "2451", yahoo: "2451.TW", name: "創見", market: "台股", theme: "記憶體模組", tier: "memory", demandBase: 74 },
  { code: "5289", yahoo: "5289.TWO", name: "宜鼎", market: "台股", theme: "工控記憶體", tier: "memory", demandBase: 74 },
  { code: "2330", yahoo: "2330.TW", name: "台積電", market: "台股", theme: "半導體總風險", tier: "holding", demandBase: 70 },
  { code: "2454", yahoo: "2454.TW", name: "聯發科", market: "台股", theme: "半導體總風險", tier: "holding", demandBase: 66 },
  { code: "2383", yahoo: "2383.TW", name: "台光電", market: "台股", theme: "AI PCB", tier: "semi", demandBase: 72 },
  { code: "3017", yahoo: "3017.TW", name: "奇鋐", market: "台股", theme: "AI 散熱", tier: "semi", demandBase: 72 },
  { code: "3037", yahoo: "3037.TW", name: "欣興", market: "台股", theme: "AI PCB/ABF", tier: "semi", demandBase: 68 },
  { code: "6669", yahoo: "6669.TW", name: "緯穎", market: "台股", theme: "AI 伺服器", tier: "semi", demandBase: 72 },
];

function clamp(value, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function pct(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function rsi(closes, period = 14) {
  if (closes.length <= period) return null;
  const changes = [];
  for (let index = closes.length - period; index < closes.length; index += 1) {
    changes.push(closes[index] - closes[index - 1]);
  }
  const gains = changes.map((change) => Math.max(change, 0));
  const losses = changes.map((change) => Math.max(-change, 0));
  const avgGain = average(gains) || 0;
  const avgLoss = average(losses) || 0;
  if (!avgLoss) return 100;
  const relativeStrength = avgGain / avgLoss;
  return 100 - 100 / (1 + relativeStrength);
}

async function fetchYahooBars(symbol) {
  const params = new URLSearchParams({ range: "3mo", interval: "1d", includePrePost: "false", events: "div,splits" });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
  try {
    const response = await fetch(`${yahooBaseUrl}/${encodeURIComponent(symbol)}?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        accept: "application/json,text/plain,*/*",
        "user-agent": "active-etf-command/0.1 theme-risk",
      },
    });
    if (!response.ok) throw new Error(`Yahoo ${symbol} HTTP ${response.status}`);
    const json = await response.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error(`Yahoo ${symbol} missing result`);
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    return timestamps
      .map((seconds, index) => ({
        date: new Date(seconds * 1000).toISOString().slice(0, 10),
        close: Number(quote.close?.[index]),
        volume: Number(quote.volume?.[index]),
      }))
      .filter((bar) => Number.isFinite(bar.close));
  } finally {
    clearTimeout(timeout);
  }
}

function recentFlowFor(code) {
  const dates = [...(dailyMovementMeta.dates || [])].slice(-5);
  const rows = dailyMovements.filter((row) => dates.includes(row.date) && String(row.stockCode) === code);
  const buyValueYi = rows.filter((row) => row.estimatedValueYi > 0).reduce((sum, row) => sum + row.estimatedValueYi, 0);
  const sellValueYi = rows.filter((row) => row.estimatedValueYi < 0).reduce((sum, row) => sum + row.estimatedValueYi, 0);
  const latestRows = rows.filter((row) => row.date === dates.at(-1));
  return {
    rows: rows.length,
    buyValueYi: round(buyValueYi, 2) || 0,
    sellValueYi: round(sellValueYi, 2) || 0,
    netValueYi: round(buyValueYi + sellValueYi, 2) || 0,
    latestEtfs: [...new Set(latestRows.map((row) => row.etfCode))],
  };
}

function overheatLabel(score) {
  if (score >= 82) return "極熱";
  if (score >= 68) return "過熱";
  if (score >= 52) return "觀察";
  return "正常";
}

function riskLabel(score) {
  if (score >= 76) return "高";
  if (score >= 60) return "中高";
  if (score >= 42) return "中";
  return "低";
}

function demandLabel(score) {
  if (score >= 78) return "強";
  if (score >= 62) return "偏強";
  if (score >= 45) return "中性";
  return "轉弱";
}

function trendLabel({ demandScore, overheatScore, pullbackRiskScore }) {
  if (demandScore >= 70 && overheatScore >= 68 && pullbackRiskScore >= 60) return "需求強但短線過熱";
  if (demandScore >= 70 && overheatScore >= 68) return "趨勢強，追價風險升高";
  if (demandScore < 55 && overheatScore >= 60) return "需求轉弱後仍偏熱";
  if (demandScore >= 70) return "需求支撐仍在";
  return "觀察題材降溫";
}

function scoreRow(item, bars) {
  const closes = bars.map((bar) => bar.close);
  const volumes = bars.map((bar) => bar.volume).filter(Number.isFinite);
  const latest = bars.at(-1);
  const latestClose = latest?.close ?? null;
  const previousClose = bars.at(-2)?.close ?? null;
  const ma5 = average(closes.slice(-5));
  const ma20 = average(closes.slice(-20));
  const avgVolume20 = average(volumes.slice(-20));
  const latestVolume = latest?.volume ?? null;
  const rsi14 = rsi(closes);
  const pct5 = pct(latestClose, closes.at(-6));
  const pct20 = pct(latestClose, closes.at(-21));
  const dayPct = pct(latestClose, previousClose);
  const ma20DistancePct = pct(latestClose, ma20);
  const volumeRatio20 = Number.isFinite(latestVolume) && Number.isFinite(avgVolume20) && avgVolume20 > 0 ? latestVolume / avgVolume20 : null;
  const flow = recentFlowFor(item.code);

  const overheatScore = clamp(
    (rsi14 ?? 50) * 0.55 +
      clamp((pct20 ?? 0) * 1.1, -16, 30) +
      clamp((ma20DistancePct ?? 0) * 1.2, -12, 22) +
      clamp(((volumeRatio20 ?? 1) - 1) * 10, -5, 14),
  );
  const demandScore = clamp(
    item.demandBase +
      clamp((pct20 ?? 0) * 0.35, -12, 12) +
      clamp(flow.netValueYi * 0.9, -10, 10) +
      (flow.rows >= 3 ? 4 : 0),
  );
  const pullbackRiskScore = clamp(
    overheatScore * 0.62 +
      (dayPct != null && dayPct < -2.5 ? 12 : 0) +
      (latestClose != null && ma5 != null && latestClose < ma5 ? 9 : 0) +
      (volumeRatio20 != null && volumeRatio20 > 1.35 && dayPct != null && dayPct < 0 ? 8 : 0) +
      (pct5 != null && pct5 < -3 ? 7 : 0),
  );

  return {
    ...item,
    displayName: `${item.name}（${item.code}）`,
    status: bars.length >= 25 ? "verified" : "partial",
    asOf: latest?.date || "",
    latestClose: round(latestClose, 2),
    dayPct: round(dayPct, 2),
    pct5: round(pct5, 2),
    pct20: round(pct20, 2),
    rsi14: round(rsi14, 1),
    ma20DistancePct: round(ma20DistancePct, 2),
    volumeRatio20: round(volumeRatio20, 2),
    demandScore: round(demandScore, 1),
    demandLabel: demandLabel(demandScore),
    overheatScore: round(overheatScore, 1),
    overheatLabel: overheatLabel(overheatScore),
    pullbackRiskScore: round(pullbackRiskScore, 1),
    pullbackRiskLabel: riskLabel(pullbackRiskScore),
    trendLabel: trendLabel({ demandScore, overheatScore, pullbackRiskScore }),
    flow,
    notes: [
      rsi14 >= 75 ? "RSI 偏高" : "",
      pct20 >= 20 ? "20 日漲幅偏大" : "",
      ma20DistancePct >= 12 ? "高於月線幅度偏大" : "",
      dayPct <= -3 ? "已出現單日回檔" : "",
      flow.netValueYi > 0 ? `近 5 交易日 ETF 淨加碼 ${flow.netValueYi} 億` : "",
    ].filter(Boolean),
  };
}

function fallbackRow(item, error) {
  const flow = recentFlowFor(item.code);
  const demandScore = clamp(item.demandBase + clamp(flow.netValueYi * 0.9, -10, 10));
  const overheatScore = item.tier === "core" ? 66 : item.tier === "memory" ? 58 : 48;
  const pullbackRiskScore = item.tier === "core" ? 56 : 46;
  return {
    ...item,
    displayName: `${item.name}（${item.code}）`,
    status: "fallback",
    asOf: "",
    latestClose: null,
    dayPct: null,
    pct5: null,
    pct20: null,
    rsi14: null,
    ma20DistancePct: null,
    volumeRatio20: null,
    demandScore,
    demandLabel: demandLabel(demandScore),
    overheatScore,
    overheatLabel: overheatLabel(overheatScore),
    pullbackRiskScore,
    pullbackRiskLabel: riskLabel(pullbackRiskScore),
    trendLabel: "價格資料不足，先以題材曝險觀察",
    flow,
    notes: [`Yahoo 資料失敗：${error.message}`],
  };
}

function buildMeta(rows, failures) {
  const verifiedRows = rows.filter((row) => row.status === "verified");
  const highRiskRows = rows.filter((row) => row.pullbackRiskLabel === "高");
  const hotRows = rows.filter((row) => ["極熱", "過熱"].includes(row.overheatLabel));
  return {
    generatedAt: new Date().toISOString(),
    asOf: [...new Set(rows.map((row) => row.asOf).filter(Boolean))].sort().at(-1) || "",
    source: "Yahoo Finance 日線 + 主動 ETF 每日持股異動",
    sourceUrl: "https://query1.finance.yahoo.com/v8/finance/chart",
    localFlowAsOf: dailyMovementMeta.asOf,
    rowCount: rows.length,
    verifiedCount: verifiedRows.length,
    failureCount: failures.length,
    highRiskCount: highRiskRows.length,
    hotCount: hotRows.length,
    status: failures.length ? "partial" : "verified",
    modelVersion: "theme-risk-v1",
    summary: `DRAM/HBM 監控 ${rows.length} 檔，${hotRows.length} 檔過熱，${highRiskRows.length} 檔回檔風險高。`,
    failures,
  };
}

function serializeModule({ meta, rows }) {
  return [
    `export const themeRiskMeta = ${JSON.stringify(meta, null, 2)};`,
    "",
    `export const themeRiskRows = ${JSON.stringify(rows, null, 2)};`,
    "",
  ].join("\n");
}

async function main() {
  const rows = [];
  const failures = [];
  for (const item of watchlist) {
    try {
      const bars = await fetchYahooBars(item.yahoo);
      rows.push(scoreRow(item, bars));
    } catch (error) {
      failures.push({ code: item.code, yahoo: item.yahoo, message: error.message });
      rows.push(fallbackRow(item, error));
    }
  }

  rows.sort(
    (a, b) =>
      b.pullbackRiskScore - a.pullbackRiskScore ||
      b.overheatScore - a.overheatScore ||
      b.demandScore - a.demandScore,
  );
  const meta = buildMeta(rows, failures);
  const moduleText = serializeModule({ meta, rows });
  await writeFile(path.join(projectRoot, "src/data/themeRisk.js"), moduleText);
  const publicDataDir = path.join(projectRoot, "public", "data");
  await mkdir(publicDataDir, { recursive: true });
  await writeFile(path.join(publicDataDir, "theme-risk-latest.json"), JSON.stringify({ meta, rows }, null, 2));
  console.log(`Imported ${rows.length} theme-risk rows; asOf=${meta.asOf || "NA"}; hot=${meta.hotCount}; highRisk=${meta.highRiskCount}; failures=${failures.length}`);
}

main().catch((error) => {
  if (optional) {
    console.warn(`Theme risk import skipped: ${error.message}`);
    return;
  }
  console.error(error);
  process.exitCode = 1;
});
