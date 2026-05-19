const YAHOO_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const CACHE_TTL_MS = Number(process.env.MARKET_CACHE_TTL_MS || 60_000);
const REQUEST_TIMEOUT_MS = Number(process.env.MARKET_REQUEST_TIMEOUT_MS || 12_000);

export const RADAR_SYMBOLS = [
  { symbol: "ACWI", label: "iShares MSCI ACWI", group: "global", role: "全球股票" },
  { symbol: "EFA", label: "iShares MSCI EAFE", group: "global", role: "已開發市場 ex-US" },
  { symbol: "VGK", label: "Vanguard FTSE Europe", group: "global", role: "歐洲" },
  { symbol: "EWJ", label: "iShares MSCI Japan", group: "global", role: "日本" },
  { symbol: "MCHI", label: "iShares MSCI China", group: "global", role: "中國" },
  { symbol: "EEM", label: "iShares MSCI EM", group: "global", role: "新興市場" },
  { symbol: "INDA", label: "iShares MSCI India", group: "global", role: "印度" },
  { symbol: "EWT", label: "iShares MSCI Taiwan", group: "global", role: "台灣" },
  { symbol: "SPY", label: "S&P 500", group: "broad", role: "大盤" },
  { symbol: "RSP", label: "S&P 500 Equal Weight ETF", group: "risk", role: "美股廣度" },
  { symbol: "QQQ", label: "Nasdaq 100", group: "broad", role: "科技成長" },
  { symbol: "DIA", label: "Dow", group: "broad", role: "傳產權值" },
  { symbol: "IWM", label: "Russell 2000", group: "broad", role: "風險偏好" },
  { symbol: "^VIX", displaySymbol: "VIX", label: "Cboe VIX", group: "risk", role: "波動風險" },
  { symbol: "^VIX3M", displaySymbol: "VIX3M", label: "Cboe 3M VIX", group: "risk", role: "波動曲線" },
  { symbol: "^VVIX", displaySymbol: "VVIX", label: "Cboe VVIX", group: "risk", role: "波動率的波動" },
  { symbol: "^SKEW", displaySymbol: "SKEW", label: "Cboe SKEW", group: "risk", role: "尾端風險" },
  { symbol: "HYG", label: "iShares High Yield Bond", group: "risk", role: "高收益信用" },
  { symbol: "LQD", label: "iShares IG Corporate Bond", group: "risk", role: "投資級信用" },
  { symbol: "GLD", label: "SPDR Gold Shares", group: "risk", role: "避險資產" },
  { symbol: "TLT", label: "20Y Treasury ETF", group: "macro", role: "長債" },
  { symbol: "UUP", label: "US Dollar ETF", group: "macro", role: "美元" },
  { symbol: "SMH", label: "VanEck Semiconductor", group: "semi", role: "半導體 ETF" },
  { symbol: "SOXX", label: "iShares Semiconductor", group: "semi", role: "半導體 ETF" },
  { symbol: "NVDA", label: "NVIDIA", group: "semi", role: "AI 加速器" },
  { symbol: "TSM", label: "TSMC ADR", group: "semi", role: "台積電 ADR" },
  { symbol: "AMD", label: "AMD", group: "semi", role: "AI/CPU/GPU" },
  { symbol: "AVGO", label: "Broadcom", group: "semi", role: "ASIC/網通" },
  { symbol: "ASML", label: "ASML", group: "semi", role: "先進製程設備" },
  { symbol: "ARM", label: "Arm", group: "semi", role: "CPU IP" },
  { symbol: "MU", label: "Micron", group: "semi", role: "記憶體" },
  { symbol: "AMAT", label: "Applied Materials", group: "semi", role: "設備" },
  { symbol: "LRCX", label: "Lam Research", group: "semi", role: "設備" },
  { symbol: "00981A.TW", displaySymbol: "00981A", label: "主動統一台股增長", group: "taiwan", role: "持倉 ETF" },
  { symbol: "00991A.TW", displaySymbol: "00991A", label: "主動群益科技創新", group: "taiwan", role: "持倉 ETF" },
  { symbol: "2330.TW", displaySymbol: "2330", label: "台積電", group: "taiwan", role: "持倉股票" },
  { symbol: "2454.TW", displaySymbol: "2454", label: "聯發科", group: "taiwan", role: "持倉股票" },
  { symbol: "8299.TWO", displaySymbol: "8299", label: "群聯", group: "taiwan", role: "持倉股票" },
];

const FALLBACK_QUOTES = {
  ACWI: 118,
  EFA: 82,
  VGK: 72,
  EWJ: 75,
  MCHI: 48,
  EEM: 45,
  INDA: 52,
  EWT: 58,
  SPY: 586,
  RSP: 170,
  QQQ: 513,
  DIA: 424,
  IWM: 212,
  "^VIX": 18.5,
  "^VIX3M": 21,
  "^VVIX": 92,
  "^SKEW": 140,
  HYG: 79,
  LQD: 109,
  GLD: 225,
  TLT: 88,
  UUP: 30,
  SMH: 280,
  SOXX: 245,
  NVDA: 210,
  TSM: 235,
  AMD: 180,
  AVGO: 265,
  ASML: 910,
  ARM: 145,
  MU: 155,
  AMAT: 225,
  LRCX: 92,
  "00981A.TW": 27,
  "00991A.TW": 11,
  "2330.TW": 1180,
  "2454.TW": 1420,
  "8299.TWO": 610,
};

const cache = new Map();

export function pct(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function clamp(value, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function average(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

export function weightedAverage(items) {
  const clean = items.filter((item) => Number.isFinite(item.value) && Number.isFinite(item.weight) && item.weight > 0);
  const weightSum = clean.reduce((sum, item) => sum + item.weight, 0);
  if (!weightSum) return null;
  return clean.reduce((sum, item) => sum + item.value * item.weight, 0) / weightSum;
}

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
        accept: "application/json,text/plain,*/*",
        "user-agent": "us-market-radar/0.1",
      },
    });
    if (!response.ok) throw new Error(`${label} HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, label) {
  const text = await fetchText(url, label);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} returned non-JSON payload`);
  }
}

function yahooUrl(symbol, range, interval) {
  const encoded = encodeURIComponent(symbol);
  const params = new URLSearchParams({
    range,
    interval,
    includePrePost: "true",
    events: "div,splits",
  });
  return `${YAHOO_BASE_URL}/${encoded}?${params.toString()}`;
}

async function fetchYahooChart(symbol, range, interval) {
  const url = yahooUrl(symbol, range, interval);
  const json = await fetchJson(url, `Yahoo chart ${symbol}`);
  const result = json?.chart?.result?.[0];
  const error = json?.chart?.error;
  if (!result || error) {
    throw new Error(error?.description || `Yahoo chart ${symbol} missing result`);
  }
  return result;
}

function normalizeBars(result) {
  const timestamps = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};
  return timestamps
    .map((seconds, index) => ({
      time: new Date(seconds * 1000).toISOString(),
      open: numberOrNull(quote.open?.[index]),
      high: numberOrNull(quote.high?.[index]),
      low: numberOrNull(quote.low?.[index]),
      close: numberOrNull(quote.close?.[index]),
      volume: numberOrNull(quote.volume?.[index]),
    }))
    .filter((bar) => Number.isFinite(bar.close));
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function valueAtLookback(bars, sessionsBack) {
  if (bars.length <= sessionsBack) return bars[0]?.close ?? null;
  return bars[bars.length - 1 - sessionsBack]?.close ?? null;
}

function marketState(meta = {}) {
  const state = meta.marketState || "UNKNOWN";
  return {
    raw: state,
    label:
      {
        PRE: "盤前",
        REGULAR: "盤中",
        POST: "盤後",
        POSTPOST: "盤後",
        CLOSED: "休市",
      }[state] || "未知",
  };
}

function freshnessFromTime(isoTime, isFallback = false) {
  if (isFallback || !isoTime) {
    return { status: "missing", label: "fallback", ageHours: null };
  }
  const ageHours = (Date.now() - new Date(isoTime).getTime()) / 3_600_000;
  if (ageHours <= 4) return { status: "live", label: "即時/近即時", ageHours: round(ageHours, 1) };
  if (ageHours <= 36) return { status: "recent", label: "近一交易日", ageHours: round(ageHours, 1) };
  if (ageHours <= 96) return { status: "stale", label: "偏舊", ageHours: round(ageHours, 1) };
  return { status: "missing", label: "過舊", ageHours: round(ageHours, 1) };
}

function buildFallbackAsset(definition, reason) {
  const base = FALLBACK_QUOTES[definition.symbol] || 100;
  const seed = [...definition.symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const dayPct = round(((seed % 13) - 6) / 10, 2);
  const fiveDayPct = round(((seed % 17) - 8) / 4, 2);
  const twentyDayPct = round(((seed % 23) - 11) / 3, 2);
  const latest = round(base * (1 + dayPct / 100), 2);
  const now = new Date();
  const bars = Array.from({ length: 20 }, (_, index) => {
    const drift = (index - 19) * 0.002 + Math.sin(index + seed) * 0.006;
    return {
      time: new Date(now.getTime() - (19 - index) * 86_400_000).toISOString(),
      open: round(base * (1 + drift - 0.002), 2),
      high: round(base * (1 + drift + 0.006), 2),
      low: round(base * (1 + drift - 0.006), 2),
      close: round(base * (1 + drift), 2),
      volume: 0,
    };
  });

  return {
    ...definition,
    displaySymbol: definition.displaySymbol || definition.symbol,
    latest,
    previousClose: round(latest / (1 + dayPct / 100), 2),
    dayPct,
    fiveDayPct,
    twentyDayPct,
    volumeRatio: null,
    currency: definition.symbol.endsWith(".TW") || definition.symbol.endsWith(".TWO") ? "TWD" : "USD",
    exchangeName: "fallback",
    marketState: { raw: "UNKNOWN", label: "fallback" },
    bars,
    dailyBars: bars,
    lastTime: bars.at(-1).time,
    freshness: freshnessFromTime(null, true),
    source: {
      name: "fallback",
      status: "missing",
      note: reason,
    },
  };
}

function buildAsset(definition, intradayResult, dailyResult) {
  const meta = intradayResult.meta || {};
  const bars = normalizeBars(intradayResult);
  const dailyBars = normalizeBars(dailyResult);
  const latestBar = bars.at(-1) || dailyBars.at(-1);
  const latest = numberOrNull(meta.regularMarketPrice) ?? latestBar?.close ?? null;
  const previousClose =
    numberOrNull(meta.regularMarketPreviousClose) ??
    numberOrNull(meta.chartPreviousClose) ??
    valueAtLookback(dailyBars, 1);
  const dayPct = pct(latest, previousClose);
  const fiveDayPct = pct(latest, valueAtLookback(dailyBars, 5));
  const twentyDayPct = pct(latest, valueAtLookback(dailyBars, 20));
  const latestVolume = dailyBars.at(-1)?.volume;
  const previousVolumes = dailyBars.slice(-21, -1).map((bar) => bar.volume).filter(Number.isFinite);
  const avgVolume = average(previousVolumes);
  const volumeRatio = Number.isFinite(latestVolume) && Number.isFinite(avgVolume) && avgVolume > 0 ? latestVolume / avgVolume : null;
  const lastTime = latestBar?.time || dailyBars.at(-1)?.time || null;
  const freshness = freshnessFromTime(lastTime);

  return {
    ...definition,
    displaySymbol: definition.displaySymbol || definition.symbol,
    latest: round(latest, 2),
    previousClose: round(previousClose, 2),
    dayPct: round(dayPct, 2),
    fiveDayPct: round(fiveDayPct, 2),
    twentyDayPct: round(twentyDayPct, 2),
    volumeRatio: round(volumeRatio, 2),
    currency: meta.currency || (definition.symbol.endsWith(".TW") || definition.symbol.endsWith(".TWO") ? "TWD" : "USD"),
    exchangeName: meta.fullExchangeName || meta.exchangeName || meta.exchange || "Yahoo Finance",
    marketState: marketState(meta),
    bars: bars.slice(-96),
    dailyBars: dailyBars.slice(-80),
    lastTime,
    freshness,
    source: {
      name: "Yahoo Finance chart",
      status: freshness.status,
      note: "unofficial chart endpoint",
    },
  };
}

async function fetchAsset(definition) {
  return cached(`asset:${definition.symbol}`, CACHE_TTL_MS, async () => {
    try {
      const [intradayResult, dailyResult] = await Promise.all([
        fetchYahooChart(definition.symbol, "5d", "15m"),
        fetchYahooChart(definition.symbol, "3mo", "1d"),
      ]);
      return buildAsset(definition, intradayResult, dailyResult);
    } catch (error) {
      return buildFallbackAsset(definition, error.message);
    }
  });
}

async function mapLimited(items, limit, mapper) {
  const results = [];
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function fetchRadarAssets(symbols = RADAR_SYMBOLS) {
  const assets = await mapLimited(symbols, 5, fetchAsset);
  const liveCount = assets.filter((asset) => asset.source.status === "live" || asset.source.status === "recent").length;
  const fallbackCount = assets.filter((asset) => asset.source.name === "fallback").length;
  const successRatio = assets.length ? liveCount / assets.length : 0;
  const latestAsOf = assets
    .map((asset) => asset.lastTime)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    assets,
    sourceHealth: {
      status: successRatio >= 0.8 ? "pass" : successRatio >= 0.45 ? "warning" : "fail",
      liveCount,
      fallbackCount,
      totalCount: assets.length,
      successRatio: round(successRatio * 100, 1),
      latestAsOf,
      checkedAt: new Date().toISOString(),
      provider: "Yahoo Finance chart endpoint; Alpaca/Polygon reserved for production real-time feed",
    },
  };
}
