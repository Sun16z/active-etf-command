import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const cacheRoot = path.resolve(projectRoot, "../tw_shortterm_screener/data/cache/etf_snapshots");
const etfInfoHubUrl = "https://www.etfinfo.tw/etf";
const etfInfoActiveUrl = "https://www.etfinfo.tw/etf/{code}/active";
const optional = process.argv.includes("--optional");
const defaultScope = process.env.ACTIVE_ETF_SCOPE || "all";
const fetchTimeoutMs = Number(process.env.ACTIVE_ETF_FETCH_TIMEOUT_MS || 30_000);
const requestedCodes = (process.env.ACTIVE_ETF_CODES || "")
  .split(",")
  .map((code) => code.trim().toUpperCase())
  .filter(Boolean);

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }

  cells.push(cell);
  return cells;
}

async function fetchText(url, referer) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(fetchTimeoutMs),
    headers: {
      "Accept": "text/html,application/json",
      "User-Agent": "Mozilla/5.0 ActiveETFCommand/1.0",
      ...(referer ? { "Referer": referer } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} from ${url}`);
  }
  return response.text();
}

async function fetchEmbeddedPayload(url) {
  const html = await fetchText(url);
  const title = html.match(/<title>(.*?)<\/title>/is)?.[1]?.trim() || null;
  const payloadHref = html.match(/href="([^"]*_payload\.json[^"]*)"/i)?.[1];

  if (payloadHref) {
    const payloadUrl = new URL(payloadHref, url).toString();
    const payloadText = await fetchText(payloadUrl, url);
    return { payload: JSON.parse(payloadText), title };
  }

  const embedded = html.match(/<script type="application\/json"[^>]*>(.*?)<\/script>/is)?.[1];
  if (!embedded) {
    throw new Error(`Could not find Nuxt payload from ${url}`);
  }

  return { payload: JSON.parse(embedded), title };
}

function findNuxtStateRoot(payload, etfCode = "") {
  const detailKey = etfCode ? `etf-detail-base-${etfCode}` : "";
  const changesKey = etfCode ? `active-changes-${etfCode}` : "";

  for (const item of payload) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    if (detailKey && Object.hasOwn(item, detailKey)) return item;
    if (changesKey && Object.hasOwn(item, changesKey)) return item;
    if (Object.hasOwn(item, "etf-list") || Object.hasOwn(item, "etf-list-compact")) return item;
  }

  for (const item of payload) {
    if (item && typeof item === "object" && !Array.isArray(item) && Object.hasOwn(item, "data")) {
      return item.data;
    }
  }

  if (payload[1]?.data) return payload[1].data;
  throw new Error("Missing Nuxt state root");
}

function resolveNuxtPayload(payload, ref) {
  function resolveRef(value) {
    if (Number.isInteger(value) && value >= 0 && value < payload.length) {
      return resolveValue(payload[value]);
    }
    return resolveValue(value);
  }

  function resolveValue(value) {
    if (Array.isArray(value)) {
      if (value.length === 2 && ["ShallowReactive", "Reactive"].includes(value[0])) {
        return resolveRef(value[1]);
      }
      return value.map(resolveRef);
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveRef(item)]));
    }
    return value;
  }

  return resolveRef(ref);
}

function scopeMatches(item, scope) {
  if (item.managementStyle !== "active") return false;
  const type = item.type || "";
  if (scope === "all") return true;
  if (scope === "tw-equity") return type.includes("國內成分證券") && type.includes("股票");
  if (scope === "stock") return type.includes("股票") && item.code.endsWith("A");
  throw new Error(`Unsupported ACTIVE_ETF_SCOPE=${scope}`);
}

async function fetchActiveEtfCatalog(scope) {
  const { payload } = await fetchEmbeddedPayload(etfInfoHubUrl);
  const root = resolveNuxtPayload(payload, findNuxtStateRoot(payload));
  const items = root["etf-list"]?.items || [];
  const catalog = items
    .map((item) => {
      const latestMarket = item.latestMarket || {};
      return {
        code: normalizeCode(item.code),
        name: String(item.name || ""),
        type: String(item.type || ""),
        managementStyle: String(item.managementStyle || "").trim().toLowerCase(),
        marketDate: String(latestMarket.date || ""),
        aum: latestMarket.aum ?? null,
        beneficiaries: latestMarket.beneficiaries ?? null,
      };
    })
    .filter((item) => item.code && scopeMatches(item, scope))
    .sort((a, b) => a.code.localeCompare(b.code));

  if (!requestedCodes.length) return catalog;
  const byCode = new Map(catalog.map((item) => [item.code, item]));
  return requestedCodes.map((code) => byCode.get(code) || { code, name: code, type: "", managementStyle: "active" });
}

async function fetchActiveEtfSnapshot(code) {
  const normalizedCode = normalizeCode(code);
  const { payload, title } = await fetchEmbeddedPayload(etfInfoActiveUrl.replace("{code}", normalizedCode));
  const root = resolveNuxtPayload(payload, findNuxtStateRoot(payload, normalizedCode));
  const detail = root[`etf-detail-base-${normalizedCode}`];
  const activeChanges = root[`active-changes-${normalizedCode}`];

  if (!detail || !activeChanges) {
    throw new Error(`Missing ETF detail payload for ${normalizedCode}`);
  }

  const info = detail.info || {};
  const latestMarket = detail.latestMarket || {};
  const holdings = detail.holdings?.holdings || [];
  const latestDiff = activeChanges.latestDiff || {};
  const changes = latestDiff.changes || [];
  const fallbackName = title
    ?.replace(" - ETF資訊網", "")
    .replace(`${normalizedCode} `, "")
    .replace(" 操盤追蹤", "")
    .trim();

  return {
    code: normalizedCode,
    name: info.name || latestMarket.name || activeChanges.name || fallbackName || normalizedCode,
    info,
    latestMarket,
    trailingYield: detail.trailingYield ?? null,
    returnStats: detail.returnStats || {},
    holdingsSource: detail.holdings?.source || "",
    holdings,
    latestDiff,
    changes,
  };
}

async function readCachedPricePath(code, livePrice, liveDate) {
  const historyPath = path.join(cacheRoot, code, "market_history.csv");
  let prices = [];

  try {
    const raw = await readFile(historyPath, "utf8");
    const rows = raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map(parseCsvLine);
    const header = rows.shift() || [];
    const priceIndex = header.indexOf("price");
    const dateIndex = header.indexOf("snapshot_date");
    prices = rows
      .map((row) => ({
        date: dateIndex >= 0 ? row[dateIndex] : "",
        price: toNumber(row[priceIndex], null),
      }))
      .filter((row) => row.price != null)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map((row) => row.price);
  } catch {
    prices = [];
  }

  if (livePrice > 0) {
    const lastPrice = prices.at(-1);
    if (!prices.length || lastPrice !== livePrice || !liveDate) {
      prices.push(livePrice);
    }
  }

  const trimmed = prices.slice(-12);
  if (trimmed.length >= 2) return trimmed;
  if (trimmed.length === 1) return [trimmed[0], trimmed[0]];
  return livePrice > 0 ? [livePrice, livePrice] : [0, 0];
}

function dividendLabel(value) {
  return {
    monthly: "月配",
    quarterly: "季配",
    semiannually: "半年配",
    semiannual: "半年配",
    annually: "年配",
    annual: "年配",
  }[String(value || "").toLowerCase()] || "未公告";
}

function themeLabel(info) {
  const type = String(info.type || "");
  const fullName = String(info.fullName || info.name || "");
  if (type.includes("債券") || type.includes("固定收益") || fullName.includes("收益") || fullName.includes("非投")) return "主動收益";
  if (type.includes("國外")) return "海外股票";
  if (fullName.includes("高息")) return "高息策略";
  if (fullName.includes("科技") || fullName.includes("AI")) return "科技成長";
  if (fullName.includes("50")) return "台灣50 增強";
  if (fullName.includes("優選")) return "台股優選";
  if (fullName.includes("強棒")) return "台股強勢股";
  return type.includes("國內") ? "台股主動" : "主動 ETF";
}

function holdingTuple(holding, includeShares = false) {
  const row = [normalizeCode(holding.code), String(holding.name || holding.code || ""), toNumber(holding.weight)];
  if (includeShares) row.push(toNumber(holding.shares));
  return row;
}

function estimateChangeFlowYi(change, aumNtd) {
  const sharesDelta = toNumber(change.sharesDelta);
  const newShares = toNumber(change.newShares);
  const oldShares = toNumber(change.oldShares);
  const newWeight = toNumber(change.newWeight);
  const oldWeight = toNumber(change.oldWeight);
  const weightDelta = toNumber(change.weightDelta);
  const newPrice = newShares > 0 && newWeight > 0 ? (aumNtd * (newWeight / 100)) / newShares : null;
  const oldPrice = oldShares > 0 && oldWeight > 0 ? (aumNtd * (oldWeight / 100)) / oldShares : null;
  const inferredPrice = newPrice || oldPrice;

  if (inferredPrice && sharesDelta) {
    return Number(((sharesDelta * inferredPrice) / 100_000_000).toFixed(2));
  }

  if (weightDelta) {
    return Number(((aumNtd * (weightDelta / 100)) / 100_000_000).toFixed(2));
  }

  return 0;
}

function changeTuple(change, aumNtd) {
  const sharesDelta = toNumber(change.sharesDelta);
  const weight = change.newWeight ?? change.oldWeight ?? change.weightDelta ?? 0;
  const type = String(change.type || "");
  const typeLabel = {
    added: "新增",
    removed: "刪除",
    increased: "加碼",
    decreased: "減碼",
  }[type] || type;

  return [
    normalizeCode(change.code),
    String(change.name || change.code || ""),
    sharesDelta,
    toNumber(weight),
    {
      industry: String(change.industry || "未分類"),
      type,
      typeLabel,
      newWeight: toNumber(change.newWeight),
      oldWeight: toNumber(change.oldWeight),
      weightDelta: toNumber(change.weightDelta),
      flowYi: estimateChangeFlowYi(change, aumNtd),
    },
  ];
}

function sourceUrl(code) {
  return etfInfoActiveUrl.replace("{code}", code);
}

async function toEtfRecord(snapshot) {
  const { code, info, latestMarket, holdings, latestDiff, changes, trailingYield, returnStats, holdingsSource } = snapshot;
  const aumNtd = toNumber(latestMarket.aum);
  const livePrice = toNumber(latestMarket.price);
  const aumYi = aumNtd / 100_000_000;
  const fullHoldings = holdings
    .map((holding) => holdingTuple(holding, true))
    .filter(([holdingCode]) => holdingCode)
    .sort((a, b) => b[2] - a[2]);
  const topHoldings = fullHoldings.slice(0, 5).map(([holdingCode, name, weight]) => [holdingCode, name, weight]);
  const tsmcHolding = holdings.find((holding) => normalizeCode(holding.code) === "2330");
  const tsmcWeight = toNumber(tsmcHolding?.weight);
  const tsmcShares = toNumber(tsmcHolding?.shares);
  const positiveChangesAll = changes
    .filter((change) => toNumber(change.sharesDelta) > 0)
    .map((change) => changeTuple(change, aumNtd))
    .sort((a, b) => Math.abs(b[2]) - Math.abs(a[2]));
  const negativeChangesAll = changes
    .filter((change) => toNumber(change.sharesDelta) < 0)
    .map((change) => changeTuple(change, aumNtd))
    .sort((a, b) => Math.abs(b[2]) - Math.abs(a[2]));
  const positiveChanges = positiveChangesAll.slice(0, 8);
  const negativeChanges = negativeChangesAll.slice(0, 8);

  return {
    code,
    name: snapshot.name,
    fullName: String(info.fullName || snapshot.name),
    issuer: String(info.issuer || ""),
    theme: themeLabel(info),
    fundType: String(info.type || ""),
    aum: Number(aumYi.toFixed(1)),
    nav: toNumber(latestMarket.nav),
    price: livePrice,
    premium: toNumber(latestMarket.premium),
    fee: toNumber(info.managementFee ?? info.totalExpenseRatio),
    managementFee: toNumber(info.managementFee),
    custodyFee: info.custodyFee == null ? null : toNumber(info.custodyFee),
    totalExpenseRatio: info.totalExpenseRatio == null ? null : toNumber(info.totalExpenseRatio),
    dividend: dividendLabel(info.dividendFrequency),
    dividendFrequency: String(info.dividendFrequency || ""),
    holders: Math.round(toNumber(latestMarket.beneficiaries)),
    manager: String(info.manager || ""),
    launchDate: String(info.launchDate || ""),
    trackingIndex: String(info.trackingIndex || ""),
    issuerSite: String(info.issuerSite || ""),
    trailingYield: trailingYield == null ? null : toNumber(trailingYield),
    returnStats,
    holdingsSource,
    dataDate: String(latestMarket.date || ""),
    sourceUrl: sourceUrl(code),
    comparisonFromDate: String(latestDiff.fromDate || ""),
    comparisonToDate: String(latestDiff.toDate || ""),
    tsmcWeight,
    tsmcShares,
    tsmcHeadroomYi: Number(((aumYi * (25 - tsmcWeight)) / 100).toFixed(1)),
    holdings: fullHoldings,
    holdingsCount: fullHoldings.length,
    topHoldings,
    adds: positiveChanges,
    cuts: negativeChanges,
    flowChanges: [...positiveChangesAll, ...negativeChangesAll].sort((a, b) => Math.abs(b[4]?.flowYi || 0) - Math.abs(a[4]?.flowYi || 0)),
    newPositions: changes
      .filter((change) => change.type === "added")
      .map((change) => `${normalizeCode(change.code)} ${change.name || ""}`.trim()),
    exits: changes
      .filter((change) => change.type === "removed")
      .map((change) => `${normalizeCode(change.code)} ${change.name || ""}`.trim()),
    pricePath: await readCachedPricePath(code, livePrice, String(latestMarket.date || "")),
  };
}

function buildWatchlist(etfs) {
  const byCode = new Map();
  etfs.forEach((etf) => {
    [...etf.adds, ...etf.cuts].forEach(([code, name, shares, weight]) => {
      if (!code || Math.abs(shares) === 0) return;
      const row = byCode.get(code) || {
        code,
        name,
        buyCount: 0,
        sellCount: 0,
        maxWeight: 0,
        netShares: 0,
      };
      if (shares > 0) row.buyCount += 1;
      if (shares < 0) row.sellCount += 1;
      row.maxWeight = Math.max(row.maxWeight, weight);
      row.netShares += shares;
      byCode.set(code, row);
    });
  });

  return [...byCode.values()]
    .sort((a, b) => b.buyCount - a.buyCount || Math.abs(b.netShares) - Math.abs(a.netShares))
    .slice(0, 8)
    .map((row) => ({
      code: row.code,
      name: row.name,
      reason: `${row.buyCount} 檔加碼、${row.sellCount} 檔減碼，最大權重 ${row.maxWeight.toFixed(2)}%`,
      sector: row.buyCount >= row.sellCount ? "共識加碼" : "共識減碼",
    }));
}

function buildReports(meta) {
  return [
    {
      id: "morning",
      title: "盤前雷達",
      time: "08:20",
      tone: "交易清單",
      items: [`追蹤 ${meta.coverage} 檔主動股票 ETF`, `持股資料日 ${meta.asOf}`, "標記台積電權重與折溢價異常"],
    },
    {
      id: "flow",
      title: "資金流摘要",
      time: "18:20",
      tone: "盤後",
      items: ["統計加減碼張數與權重變化", "分 ETF 淨流入與共識個股", "攻擊量交集併入隔日觀察清單"],
    },
    {
      id: "weekly",
      title: "週報",
      time: "週五 20:00",
      tone: "結構變化",
      items: ["經理人風格偏移", "台積電上限利用率", "高重疊持股風險"],
    },
  ];
}

function serializeModule({ meta, etfs, watchlist, reports }) {
  return [
    `export const snapshotMeta = ${JSON.stringify(meta, null, 2)};`,
    "",
    `export const etfs = ${JSON.stringify(etfs, null, 2)};`,
    "",
    `export const watchlist = ${JSON.stringify(watchlist, null, 2)};`,
    "",
    `export const reports = ${JSON.stringify(reports, null, 2)};`,
    "",
  ].join("\n");
}

async function main() {
  const generatedAt = new Date().toISOString();
  const catalog = await fetchActiveEtfCatalog(defaultScope);
  const successful = [];
  const failed = [];

  for (const item of catalog) {
    try {
      const snapshot = await fetchActiveEtfSnapshot(item.code);
      successful.push(await toEtfRecord(snapshot));
    } catch (error) {
      failed.push({ code: item.code, error: `${error.name}: ${error.message}` });
      console.warn(`ETF import failed: ${item.code} ${error.message}`);
    }
  }

  if (!successful.length) {
    throw new Error("No live ETF snapshots were imported");
  }

  successful.sort((a, b) => b.aum - a.aum);
  const dates = successful.map((etf) => etf.dataDate).filter(Boolean).sort();
  const asOf = dates.at(-1) || generatedAt.slice(0, 10);
  const meta = {
    asOf,
    marketClose: "真實快照",
    coverage: successful.length,
    source: "ETF資訊網 active ETF payload",
    sourceUrl: etfInfoHubUrl,
    sourceNote: "Live import from each ETF active page: latestMarket, holdings, latestDiff.",
    scope: defaultScope,
    generatedAt,
    failedCodes: failed,
  };
  const watchlist = buildWatchlist(successful);
  const reports = buildReports(meta);
  const output = serializeModule({ meta, etfs: successful, watchlist, reports });

  await mkdir(path.join(projectRoot, "src/data"), { recursive: true });
  await writeFile(path.join(projectRoot, "src/data/etfUniverse.js"), output);
  console.log(`Imported ${successful.length} real ETF snapshots from ETF資訊網; asOf=${asOf}; failed=${failed.length}`);
}

main().catch((error) => {
  if (optional) {
    console.warn(`ETF universe import skipped: ${error.message}`);
    return;
  }
  console.error(error.message);
  process.exitCode = 1;
});
