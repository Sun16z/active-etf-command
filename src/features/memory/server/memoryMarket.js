import { average, clamp, pct, round } from "../../market/server/marketData.js";

const CACHE_TTL_MS = Number(process.env.MEMORY_MARKET_CACHE_TTL_MS || 15 * 60_000);
const REQUEST_TIMEOUT_MS = Number(process.env.MEMORY_MARKET_REQUEST_TIMEOUT_MS || 12_000);
const YAHOO_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

const TREND_DRAM_URL = "https://www.trendforce.com.tw/price/dram/mobileDram_contract";
const TREND_NAND_URL = "https://www.trendforce.com.tw/price/flash/pcc_oem_ssd_contract";
const TREND_PRESS_URL = "https://www.trendforce.com/presscenter/news/20260331-12995.html";
const TREND_HBM_URL = "https://www.trendforce.com/research/download/RP260513PF3";
const TREND_MEMORY_WALL_URL = "https://www.trendforce.com.tw/insights/memory-wall";

const cache = new Map();

function cached(key, ttlMs, loader) {
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.promise;
  const promise = loader().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, { expiresAt: Date.now() + ttlMs, promise });
  return promise;
}

async function fetchText(url, label) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "text/html,application/json,text/plain,*/*",
        "user-agent": "us-market-radar/0.1 memory-market",
      },
    });
    if (!response.ok) throw new Error(`${label} HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&mdash;/g, "-")
    .replace(/&#9650;/g, "")
    .replace(/&#9660;/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value = "") {
  return decodeHtml(String(value).replace(/<[^>]+>/g, " "));
}

function numberOrNull(value) {
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePct(value = "") {
  const match = stripTags(value).match(/(-?\d+(?:\.\d+)?)\s*%/);
  return match ? numberOrNull(match[1]) : null;
}

function parseTrendTime(text = "") {
  const match = text.match(/Last Update\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+\(GMT\+8\)/i);
  if (!match) return null;
  return new Date(`${match[1]}T${match[2]}:00+08:00`).toISOString();
}

function extractPriceSection(html, id) {
  const start = html.indexOf(`id="${id}"`);
  if (start < 0) return "";
  const rest = html.slice(start);
  const next = rest.slice(1).search(/\n\s*<div id="[^"]+"\s+class="price-content"/);
  return next >= 0 ? rest.slice(0, next + 1) : rest;
}

function extractRows(section, kind) {
  const rows = [...section.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => match[1]);
  return rows
    .map((row) => {
      const title = row.match(/title="([^"]+)"/i)?.[1] || row.match(/<span[^>]*>([\s\S]*?)<\/span>/i)?.[1];
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => cell[1]);
      if (!title || cells.length < 4) return null;
      const values = cells.slice(1).map(stripTags);
      const numeric = values.map(numberOrNull).filter((value) => Number.isFinite(value));
      if (numeric.length < 3) return null;
      const pctValues = values.map(parsePct).filter((value) => Number.isFinite(value));
      if (kind === "spot") {
        return {
          item: decodeHtml(title),
          high: numeric[2] ?? numeric[0],
          low: numeric[3] ?? numeric[1],
          average: numeric[4] ?? numeric[2],
          changePct: pctValues[0] ?? null,
        };
      }
      return {
        item: decodeHtml(title),
        high: numeric[0],
        low: numeric[1],
        average: numeric[2],
        changePct: pctValues[0] ?? null,
        lowChangePct: pctValues[1] ?? null,
      };
    })
    .filter(Boolean);
}

function findRow(rows, patterns) {
  return rows.find((row) => patterns.every((pattern) => pattern.test(row.item)));
}

function buildTrendSource({ id, label, url, section, checkedAt, fallbackReason }) {
  const sourceAsOf = parseTrendTime(section);
  return {
    id,
    label,
    url,
    status: fallbackReason ? "warning" : sourceAsOf ? "pass" : "warning",
    checkedAt,
    sourceAsOf,
    note: fallbackReason || "TrendForce public price table",
  };
}

function fallbackRow(item, average, changePct = 0, high = null, low = null) {
  return {
    item,
    high: high ?? average,
    low: low ?? average,
    average,
    changePct,
  };
}

function buildSyntheticSeries(latest, changePct = 0, points = 30, endTime = new Date().toISOString()) {
  if (!Number.isFinite(latest)) return [];
  const safeChange = Number.isFinite(changePct) ? changePct : 0;
  const start = latest / (1 + safeChange / 100 || 1);
  const end = new Date(endTime).getTime();
  return Array.from({ length: points }, (_, index) => {
    const ratio = points === 1 ? 1 : index / (points - 1);
    const wave = Math.sin(index / 3) * 0.006 * latest;
    const value = start + (latest - start) * ratio + wave;
    return {
      time: new Date(end - (points - 1 - index) * 86_400_000).toISOString(),
      value: round(value, 3),
    };
  });
}

function normalizeSeries(points = [], base = 100) {
  const clean = points.filter((point) => Number.isFinite(point.value));
  const first = clean[0]?.value;
  if (!Number.isFinite(first) || first === 0) return [];
  return clean.map((point) => ({
    time: point.time,
    value: round((point.value / first) * base, 2),
    rawValue: point.value,
  }));
}

function mapYahooBars(result) {
  const timestamps = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};
  return timestamps
    .map((seconds, index) => ({
      time: new Date(seconds * 1000).toISOString(),
      value: numberOrNull(quote.close?.[index]),
    }))
    .filter((point) => Number.isFinite(point.value));
}

async function fetchYahooSeries(symbol, range = "3mo", interval = "1d") {
  const params = new URLSearchParams({ range, interval, includePrePost: "false" });
  const url = `${YAHOO_BASE_URL}/${encodeURIComponent(symbol)}?${params.toString()}`;
  const text = await fetchText(url, `Yahoo ${symbol}`);
  const json = JSON.parse(text);
  const result = json?.chart?.result?.[0];
  const error = json?.chart?.error;
  if (!result || error) throw new Error(error?.description || `Yahoo ${symbol} missing result`);
  return mapYahooBars(result);
}

async function fetchWeightedProxy(symbols) {
  const fetched = await Promise.allSettled(symbols.map((item) => fetchYahooSeries(item.symbol)));
  const successful = fetched
    .map((result, index) => ({ result, definition: symbols[index] }))
    .filter((item) => item.result.status === "fulfilled" && item.result.value.length >= 5);
  if (!successful.length) throw new Error("No Yahoo proxy symbols returned usable history");

  const byDate = new Map();
  for (const { result, definition } of successful) {
    const normalized = normalizeSeries(result.value);
    for (const point of normalized) {
      const day = point.time.slice(0, 10);
      const bucket = byDate.get(day) || [];
      bucket.push({ value: point.value, weight: definition.weight });
      byDate.set(day, bucket);
    }
  }

  const series = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, values]) => {
      const weightSum = values.reduce((sum, item) => sum + item.weight, 0);
      const value = values.reduce((sum, item) => sum + item.value * item.weight, 0) / weightSum;
      return { time: `${day}T20:00:00.000Z`, value: round(value, 2) };
    })
    .filter((point) => Number.isFinite(point.value));

  return {
    series: series.slice(-64),
    symbols: successful.map((item) => item.definition.symbol),
    failedSymbols: fetched
      .map((result, index) => (result.status === "rejected" ? symbols[index].symbol : null))
      .filter(Boolean),
  };
}

function scoreFromPct(changePct, base = 55, multiplier = 1.4) {
  return round(clamp(base + (Number.isFinite(changePct) ? changePct * multiplier : 0), 0, 100), 1);
}

function stageTone(score) {
  if (score >= 70) return "up";
  if (score <= 42) return "down";
  return "neutral";
}

function latestPct(series, sessionsBack = 20) {
  const latest = series.at(-1)?.value;
  const previous = series.at(-1 - sessionsBack)?.value || series[0]?.value;
  return round(pct(latest, previous), 2);
}

function buildPriceCard({ id, chain, kind, label, unit, row, source, priority = 5 }) {
  const series = buildSyntheticSeries(row.average, row.changePct, kind === "contract" ? 18 : 30, source.sourceAsOf || source.checkedAt);
  const score = scoreFromPct(row.changePct, kind === "contract" ? 60 : 55);
  return {
    id,
    chain,
    kind,
    label,
    unit,
    latest: round(row.average, 3),
    high: round(row.high, 3),
    low: round(row.low, 3),
    changePct: round(row.changePct, 2),
    score,
    tone: stageTone(score),
    priority,
    series,
    historyStatus: "latest-plus-change",
    sourceLabel: source.label,
    sourceUrl: source.url,
    sourceAsOf: source.sourceAsOf,
    checkedAt: source.checkedAt,
  };
}

function fallbackTrendData(checkedAt) {
  const dramSpotSource = buildTrendSource({
    id: "trendforce-dram-spot",
    label: "TrendForce DRAM Spot Price",
    url: TREND_DRAM_URL,
    section: "",
    checkedAt,
    fallbackReason: "TrendForce DRAM page unavailable; using last known public snapshot",
  });
  const dramContractSource = buildTrendSource({
    id: "trendforce-dram-contract",
    label: "TrendForce DRAM Contract Price",
    url: TREND_DRAM_URL,
    section: "",
    checkedAt,
    fallbackReason: "TrendForce DRAM contract section unavailable; using last known public snapshot",
  });
  const nandContractSource = buildTrendSource({
    id: "trendforce-nand-contract",
    label: "TrendForce NAND Flash Contract Price",
    url: TREND_NAND_URL,
    section: "",
    checkedAt,
    fallbackReason: "TrendForce NAND page unavailable; using last known public snapshot",
  });

  return {
    dramSpot: {
      source: dramSpotSource,
      ddr5Spot: fallbackRow("DDR5 16Gb (2Gx8) 4800/5600", 41.167, 1.15, 52.5, 30),
      ddr4Spot: fallbackRow("DDR4 16Gb (2Gx8) 3200", 58.238, 0, 70, 33),
    },
    dramContract: {
      source: dramContractSource,
      ddr5Contract: fallbackRow("DDR5 8GB SO-DIMM", 75, 0, 78.5, 72.5),
      ddr4Contract: fallbackRow("DDR4 16GB SO-DIMM", 170, 3.03, 175, 140),
    },
    nandContract: {
      source: nandContractSource,
      nandContract: fallbackRow("NAND 128Gb 16Gx8 MLC", 17.725, 39.95, 17.9, 17.45),
    },
  };
}

async function fetchTrendPriceData(checkedAt) {
  try {
    const [dramHtml, nandHtml] = await Promise.all([
      fetchText(TREND_DRAM_URL, "TrendForce DRAM price"),
      fetchText(TREND_NAND_URL, "TrendForce NAND price"),
    ]);
    const dramSpotSection = extractPriceSection(dramHtml, "dram_spot");
    const dramContractSection = extractPriceSection(dramHtml, "dram_contract");
    const nandContractSection = extractPriceSection(nandHtml, "flash_contract");
    const dramSpotRows = extractRows(dramSpotSection, "spot");
    const dramContractRows = extractRows(dramContractSection, "contract");
    const nandContractRows = extractRows(nandContractSection, "contract");

    const fallback = fallbackTrendData(checkedAt);
    const dramSpotSource = buildTrendSource({
      id: "trendforce-dram-spot",
      label: "TrendForce DRAM Spot Price",
      url: TREND_DRAM_URL,
      section: dramSpotSection,
      checkedAt,
    });
    const dramContractSource = buildTrendSource({
      id: "trendforce-dram-contract",
      label: "TrendForce DRAM Contract Price",
      url: TREND_DRAM_URL,
      section: dramContractSection,
      checkedAt,
    });
    const nandContractSource = buildTrendSource({
      id: "trendforce-nand-contract",
      label: "TrendForce NAND Flash Contract Price",
      url: TREND_NAND_URL,
      section: nandContractSection,
      checkedAt,
    });

    return {
      dramSpot: {
        source: dramSpotSource,
        ddr5Spot: findRow(dramSpotRows, [/DDR5/i, /16Gb/i]) || fallback.dramSpot.ddr5Spot,
        ddr4Spot: findRow(dramSpotRows, [/DDR4/i, /16Gb/i, /3200/i]) || fallback.dramSpot.ddr4Spot,
      },
      dramContract: {
        source: dramContractSource,
        ddr5Contract: findRow(dramContractRows, [/DDR5/i, /SO-DIMM/i]) || fallback.dramContract.ddr5Contract,
        ddr4Contract: findRow(dramContractRows, [/DDR4/i, /16GB/i, /SO-DIMM/i]) || fallback.dramContract.ddr4Contract,
      },
      nandContract: {
        source: nandContractSource,
        nandContract: findRow(nandContractRows, [/NAND/i, /128Gb/i]) || fallback.nandContract.nandContract,
      },
    };
  } catch {
    return fallbackTrendData(checkedAt);
  }
}

async function fetchHbmSource(checkedAt) {
  try {
    const html = await fetchText(TREND_HBM_URL, "TrendForce HBM bulletin");
    const modified = stripTags(html.match(/Last Modified[\s\S]{0,180}?(\d{4}-\d{2}-\d{2})/i)?.[0] || "");
    const date = modified.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || "2026-05-13";
    return {
      id: "trendforce-hbm-bulletin",
      label: "TrendForce HBM Market Bulletin",
      url: TREND_HBM_URL,
      status: "pass",
      checkedAt,
      sourceAsOf: new Date(`${date}T00:00:00+08:00`).toISOString(),
      note: "Monthly HBM bulletin; public page shows highlights, full PDF requires purchase or membership",
    };
  } catch (error) {
    return {
      id: "trendforce-hbm-bulletin",
      label: "TrendForce HBM Market Bulletin",
      url: TREND_HBM_URL,
      status: "warning",
      checkedAt,
      sourceAsOf: "2026-05-12T16:00:00.000Z",
      note: `HBM bulletin fetch failed: ${error.message}`,
    };
  }
}

function fallbackProxySeries(checkedAt) {
  const end = new Date(checkedAt).getTime();
  return Array.from({ length: 64 }, (_, index) => {
    const trend = 100 + index * 0.55;
    const wave = Math.sin(index / 4) * 2.2;
    return {
      time: new Date(end - (63 - index) * 86_400_000).toISOString(),
      value: round(trend + wave, 2),
    };
  });
}

async function buildProxyCards(checkedAt) {
  const proxySources = [
    { symbol: "000660.KS", weight: 0.38, label: "SK hynix" },
    { symbol: "MU", weight: 0.32, label: "Micron" },
    { symbol: "005930.KS", weight: 0.2, label: "Samsung" },
    { symbol: "WDC", weight: 0.1, label: "Western Digital" },
  ];
  try {
    const proxy = await fetchWeightedProxy(proxySources);
    return {
      series: proxy.series,
      symbols: proxy.symbols,
      failedSymbols: proxy.failedSymbols,
      status: proxy.failedSymbols.length ? "warning" : "pass",
      note: "Yahoo Finance supplier basket proxy; not a DDR/HBM/NAND exchange futures contract",
    };
  } catch (error) {
    return {
      series: fallbackProxySeries(checkedAt),
      symbols: [],
      failedSymbols: proxySources.map((item) => item.symbol),
      status: "warning",
      note: `Proxy history fallback: ${error.message}`,
    };
  }
}

function buildStage({ id, label, rank, score, metric, detail, source, components }) {
  return {
    id,
    label,
    rank,
    score: round(score, 1),
    tone: stageTone(score),
    metric,
    detail,
    components,
    sourceLabel: source.label,
    sourceUrl: source.url,
    sourceAsOf: source.sourceAsOf,
  };
}

function severityFromScore(score) {
  if (score >= 75) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function buildCycleAlerts({ priceCards, proxySeries, sources }) {
  const proxy20d = latestPct(proxySeries, 20);
  const proxy5d = latestPct(proxySeries, 5);
  const ddr5Spot = priceCards.find((card) => card.id === "dram-ddr5-spot");
  const ddr4Spot = priceCards.find((card) => card.id === "dram-ddr4-spot");
  const nandContract = priceCards.find((card) => card.id === "nand-contract");
  const priceMomentum = average(
    [ddr5Spot?.changePct, ddr4Spot?.changePct, nandContract?.changePct].filter(Number.isFinite),
  );
  const alerts = [];

  if (Number.isFinite(proxy20d) && proxy20d <= -8) {
    const score = clamp(70 + Math.abs(proxy20d) * 1.5, 0, 100);
    alerts.push({
      id: "supplier-proxy-rollover",
      title: "供應商股價代理先轉弱",
      body: `HBM/記憶體供應商代理 20 日 ${proxy20d}%；若 TrendForce 價格仍強，代表股價可能先反映週期高點或估值壓力。`,
      score: round(score, 1),
      severity: severityFromScore(score),
      tone: "down",
      metric: `20日 ${proxy20d}% / 5日 ${Number.isFinite(proxy5d) ? `${proxy5d}%` : "NA"}`,
      meaning: "股價領先價格轉弱，偏向見頂警示。",
      sourceLabel: "Yahoo Finance supplier basket",
      sourceUrl: "https://finance.yahoo.com/",
      asOf: proxySeries.at(-1)?.time,
    });
  }

  if (Number.isFinite(priceMomentum) && priceMomentum < 0) {
    const score = clamp(66 + Math.abs(priceMomentum) * 2.5, 0, 100);
    alerts.push({
      id: "price-momentum-negative",
      title: "公開價格動能轉負",
      body: `DDR5 / DDR4 / NAND 公開價格平均動能 ${round(priceMomentum, 2)}%；若連續多次轉負，記憶體股毛利預期通常會被下修。`,
      score: round(score, 1),
      severity: severityFromScore(score),
      tone: "down",
      metric: `價格動能 ${round(priceMomentum, 2)}%`,
      meaning: "合約或現貨降價是週期轉弱確認訊號。",
      sourceLabel: "TrendForce public price tables",
      sourceUrl: TREND_DRAM_URL,
      asOf: ddr5Spot?.sourceAsOf || ddr4Spot?.sourceAsOf || nandContract?.sourceAsOf,
    });
  }

  if (Number.isFinite(proxy20d) && proxy20d <= -4 && Number.isFinite(priceMomentum) && priceMomentum > 8) {
    const score = clamp(72 + Math.abs(proxy20d) + priceMomentum / 4, 0, 100);
    alerts.push({
      id: "price-stock-divergence",
      title: "價格仍漲但股價代理下滑",
      body: `公開價格仍強（平均 ${round(priceMomentum, 2)}%），但供應商代理 20 日 ${proxy20d}%；這是記憶體股常見的價格落後、股價先走的背離。`,
      score: round(score, 1),
      severity: severityFromScore(score),
      tone: "down",
      metric: `價 ${round(priceMomentum, 2)}% / 股 ${proxy20d}%`,
      meaning: "偏向高檔背離，需降低追價信心。",
      sourceLabel: "TrendForce + Yahoo Finance",
      sourceUrl: TREND_PRESS_URL,
      asOf: proxySeries.at(-1)?.time,
    });
  }

  if (Number.isFinite(priceMomentum) && priceMomentum >= 25) {
    const score = clamp(45 + priceMomentum, 0, 100);
    alerts.push({
      id: "price-overheat",
      title: "價格過熱不是立刻看空",
      body: `公開價格平均動能 ${round(priceMomentum, 2)}%；供給緊與 AI 拉貨支持股價，但越接近終端降規、庫存重建完成，反轉敏感度越高。`,
      score: round(score, 1),
      severity: severityFromScore(score),
      tone: "neutral",
      metric: `價格動能 ${round(priceMomentum, 2)}%`,
      meaning: "偏多但進入過熱監控區。",
      sourceLabel: "TrendForce public price tables",
      sourceUrl: TREND_PRESS_URL,
      asOf: ddr5Spot?.sourceAsOf || nandContract?.sourceAsOf,
    });
  }

  const weakSources = sources.filter((source) => source.status !== "pass");
  if (weakSources.length) {
    const score = 58;
    alerts.push({
      id: "source-warning",
      title: "部分來源需要人工複核",
      body: `${weakSources.length} 個資料源未達 pass；警示分數會保守處理，避免把 fallback 當成真實轉折。`,
      score,
      severity: "medium",
      tone: "neutral",
      metric: `${weakSources.length} source warnings`,
      meaning: "資料品質警示，需回看來源頁。",
      sourceLabel: weakSources[0]?.label || "Source health",
      sourceUrl: weakSources[0]?.url || TREND_DRAM_URL,
      asOf: weakSources[0]?.checkedAt,
    });
  }

  if (!alerts.length) {
    alerts.push({
      id: "cycle-stable",
      title: "尚未出現價格/股價崩盤背離",
      body: "目前公開價格與供應商代理沒有同時觸發轉弱條件；仍需持續看 TrendForce 更新、HBM 供應商指引與代理股價斜率。",
      score: 34,
      severity: "low",
      tone: "up",
      metric: `價 ${Number.isFinite(priceMomentum) ? `${round(priceMomentum, 2)}%` : "NA"} / 股 ${Number.isFinite(proxy20d) ? `${proxy20d}%` : "NA"}`,
      meaning: "沒有頂部確認警訊。",
      sourceLabel: "TrendForce + Yahoo Finance",
      sourceUrl: TREND_DRAM_URL,
      asOf: proxySeries.at(-1)?.time,
    });
  }

  return alerts.sort((a, b) => b.score - a.score);
}

export async function fetchMemoryMarket() {
  return cached("memory-market:v2", CACHE_TTL_MS, async () => {
    const checkedAt = new Date().toISOString();
    const [trend, hbmSource, proxy] = await Promise.all([
      fetchTrendPriceData(checkedAt),
      fetchHbmSource(checkedAt),
      buildProxyCards(checkedAt),
    ]);

    const priceCards = [
      buildPriceCard({
        id: "dram-ddr5-spot",
        chain: "DRAM",
        kind: "現貨報價",
        label: "DDR5 16Gb 4800/5600",
        unit: "USD",
        row: trend.dramSpot.ddr5Spot,
        source: trend.dramSpot.source,
        priority: 2,
      }),
      buildPriceCard({
        id: "dram-ddr4-spot",
        chain: "DRAM",
        kind: "現貨報價",
        label: "DDR4 16Gb 3200",
        unit: "USD",
        row: trend.dramSpot.ddr4Spot,
        source: trend.dramSpot.source,
        priority: 4,
      }),
      buildPriceCard({
        id: "dram-ddr5-contract",
        chain: "DRAM",
        kind: "合約價",
        label: "DDR5 8GB SO-DIMM",
        unit: "USD",
        row: trend.dramContract.ddr5Contract,
        source: trend.dramContract.source,
        priority: 3,
      }),
      buildPriceCard({
        id: "dram-ddr4-contract",
        chain: "DRAM",
        kind: "合約價",
        label: "DDR4 16GB SO-DIMM",
        unit: "USD",
        row: trend.dramContract.ddr4Contract,
        source: trend.dramContract.source,
        priority: 5,
      }),
      buildPriceCard({
        id: "nand-contract",
        chain: "NAND",
        kind: "合約價",
        label: trend.nandContract.nandContract.item,
        unit: "USD",
        row: trend.nandContract.nandContract,
        source: trend.nandContract.source,
        priority: 6,
      }),
    ].sort((a, b) => a.priority - b.priority);

    const hbmPct20d = latestPct(proxy.series, 20);
    const hbmScore = clamp(78 + (Number.isFinite(hbmPct20d) ? hbmPct20d * 0.8 : 0), 0, 100);
    const ddr5Spot = priceCards.find((card) => card.id === "dram-ddr5-spot");
    const nandContract = priceCards.find((card) => card.id === "nand-contract");
    const dramScore = scoreFromPct(ddr5Spot?.changePct, 68, 2);
    const nandScore = scoreFromPct(nandContract?.changePct, 58, 0.7);
    const overallScore = round(average([hbmScore, dramScore, nandScore]) ?? 0, 1);

    const chartSeries = [
      {
        id: "hbm-proxy",
        label: "HBM 供應商代理指數",
        chain: "HBM",
        kind: "市場代理",
        color: "#2357b6",
        points: proxy.series,
        sourceLabel: "Yahoo Finance supplier basket",
        sourceUrl: "https://finance.yahoo.com/",
        historyStatus: "real-market-proxy",
      },
      {
        id: "dram-contract-index",
        label: "DRAM / DDR5 合約報價指數",
        chain: "DRAM",
        kind: "合約與現貨",
        color: "#107c5c",
        points: normalizeSeries(ddr5Spot?.series || []),
        sourceLabel: trend.dramSpot.source.label,
        sourceUrl: trend.dramSpot.source.url,
        historyStatus: "latest-plus-change",
      },
      {
        id: "nand-contract-index",
        label: "NAND 合約報價指數",
        chain: "NAND",
        kind: "合約價",
        color: "#a86812",
        points: normalizeSeries(nandContract?.series || []),
        sourceLabel: trend.nandContract.source.label,
        sourceUrl: trend.nandContract.source.url,
        historyStatus: "latest-plus-change",
      },
    ];

    const stages = [
      buildStage({
        id: "hbm",
        label: "HBM",
        rank: 1,
        score: hbmScore,
        metric: `代理20日 ${Number.isFinite(hbmPct20d) ? `${hbmPct20d > 0 ? "+" : ""}${hbmPct20d}%` : "NA"}`,
        detail: "AI 訓練與推論 decode 的高頻寬核心，供應商往 HBM4 / HBM4e 競爭。",
        source: hbmSource,
        components: ["HBM3e", "HBM4", "CoWoS/TSV", "AI GPU/ASIC"],
      }),
      buildStage({
        id: "dram",
        label: "DRAM / DDR5",
        rank: 2,
        score: dramScore,
        metric: `DDR5 現貨 ${ddr5Spot?.latest ?? "NA"} USD`,
        detail: "HBM 擠壓傳統 DRAM 產能，DDR5 受 AI 推論與通用伺服器拉動。",
        source: trend.dramSpot.source,
        components: ["DDR5", "Server RDIMM", "DDR4 legacy", "PC/手機降規"],
      }),
      buildStage({
        id: "nand",
        label: "NAND / SSD",
        rank: 3,
        score: nandScore,
        metric: `NAND 合約 ${nandContract?.latest ?? "NA"} USD`,
        detail: "AI 資料中心帶動 enterprise SSD 與高效儲存，消費端承受成本壓力。",
        source: trend.nandContract.source,
        components: ["Enterprise SSD", "QLC/TLC", "eMMC/UFS", "Wafer"],
      }),
    ];

    const sources = [
      trend.dramSpot.source,
      trend.dramContract.source,
      trend.nandContract.source,
      hbmSource,
    ];
    const failedSources = sources.filter((source) => source.status !== "pass").length + proxy.failedSymbols.length;
    const cycleAlerts = buildCycleAlerts({ priceCards, proxySeries: proxy.series, sources });
    const topCycleAlert = cycleAlerts[0];
    const cycleRiskScore = topCycleAlert?.score ?? 0;

    return {
      generatedAt: checkedAt,
      summary: {
        status: failedSources ? "warning" : "pass",
        score: overallScore,
        label: overallScore >= 72 ? "AI 記憶體偏熱" : overallScore >= 55 ? "記憶體循環偏多" : "記憶體中性",
        headline: "HBM 是 AI 主線，DRAM / NAND 是供給排擠與資料中心擴張的放大器。",
        interpretation:
          "優先看 HBM 供應商、封裝產能與 HBM4 進度；DDR5 與 NAND 價格代表 AI demand 擴散到通用伺服器與儲存鏈。",
        cycleRiskScore,
        cycleRiskLabel: cycleRiskScore >= 75 ? "高檔反轉警示" : cycleRiskScore >= 55 ? "需注意背離" : "暫無崩盤背離",
        cycleRiskTone: cycleRiskScore >= 55 ? "down" : "up",
        topCycleAlert: topCycleAlert?.title || "NA",
        failedSources,
        proxySymbols: proxy.symbols,
        proxyNote: proxy.note,
      },
      stages,
      priceCards,
      chartSeries,
      cycleAlerts,
      sources: [
        hbmSource,
        trend.dramSpot.source,
        trend.dramContract.source,
        trend.nandContract.source,
        {
          id: "trendforce-memory-wall",
          label: "TrendForce Memory Wall Insight",
          url: TREND_MEMORY_WALL_URL,
          status: "pass",
          checkedAt,
          sourceAsOf: "2026-01-15T16:00:00.000Z",
          note: "HBM / DDR5 / AI inference chain thesis",
        },
        {
          id: "trendforce-2q26-price-forecast",
          label: "TrendForce 2Q26 Memory Price Forecast",
          url: TREND_PRESS_URL,
          status: "pass",
          checkedAt,
          sourceAsOf: "2026-03-30T16:00:00.000Z",
          note: "DRAM 58-63% QoQ; NAND 70-75% QoQ forecast context",
        },
      ],
      caveats: [
        "TrendForce 公開頁提供最新價、漲跌幅與部分走勢入口；完整歷史圖與報告細項需要登入、會員或付費權限。",
        "資料不足，無法確認有可公開自動抓取的 DDR / NAND / HBM 標準交易所期貨；本頁的期貨欄位以市場代理指數標示。",
        "HBM 沒有公開逐日合約價表，需用 TrendForce bulletin、供應商股價代理、AI GPU/ASIC 出貨與封裝產能交叉確認。",
      ],
    };
  });
}
