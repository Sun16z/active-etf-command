import { execFileSync } from "node:child_process";
import { access, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { etfs, snapshotMeta } from "../src/data/etfUniverse.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const optional = process.argv.includes("--optional");
const maxRows = Number(process.env.ACTIVE_ETF_DAILY_ROWS || 4000);
const officialEtfCodes = new Set(["00980A", "00981A", "00991A", "00992A"]);
const officialWeightOnlyThreshold = 0.05;

const sourcePriorityRank = {
  "投信官方網站": 100,
  "投信官方網站二次核對": 110,
  "ETF資訊網 latestDiff": 40,
  "ETF資訊網歷史快照差異": 35,
  "投信/MoneyDJ 本機快照差異": 30,
};

const officialSources = {
  "00980A": {
    issuer: "野村投信",
    pageUrl: "https://www.nomurafunds.com.tw/ETFWEB/pcf",
    apiUrl: "https://www.nomurafunds.com.tw/API/ETFAPI/api/Fund/GetFundAssets",
  },
  "00981A": {
    issuer: "統一投信",
    pageUrl: "https://www.ezmoney.com.tw/ETF/Transaction/PCF?fundCode=61YTW",
    selectedUrl: "https://www.ezmoney.com.tw/ETF/Transaction/PCF?fundCode=49YTW",
    fundCode: "49YTW",
    apiUrl: "https://www.ezmoney.com.tw/ETF/Transaction/GetPCF",
  },
  "00991A": {
    issuer: "復華投信",
    pageUrl: "https://www.fhtrust.com.tw/ETF/etf_detail/ETF23",
    apiUrl: "https://www.fhtrust.com.tw/api/assetsExcel/ETF23",
  },
  "00992A": {
    issuer: "群益投信",
    pageUrl: "https://www.capitalfund.com.tw/etf/product/detail/500/buyback",
    apiUrl: "https://www.capitalfund.com.tw/CFWeb/api/etf/buyback",
  },
};

const historyRoots = [
  path.resolve(projectRoot, "../tw_shortterm_screener/data/cache/etf_snapshots"),
  path.resolve(projectRoot, "../00981A持股與前日分析/data/four_etf_visual_snapshots"),
  path.resolve(projectRoot, "../00981A持股與前日分析/data/dual_etf_snapshots"),
  path.resolve(projectRoot, "../00981A持股與前日分析/data/official_snapshots"),
  path.resolve(process.env.HOME || "", "tw_shortterm_screener_runtime/data/cache/etf_snapshots"),
  path.resolve(process.env.HOME || "", "00981a_threads_runtime/data/four_etf_visual_snapshots"),
].filter(Boolean);

const displayNameAliases = new Map([
  ["2330", "台積電"],
  ["2383", "台光電"],
]);

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeName(code, value) {
  const normalizedCode = normalizeCode(code);
  if (displayNameAliases.has(normalizedCode)) return displayNameAliases.get(normalizedCode);
  return String(value || normalizedCode)
    .replace(/台灣積體/g, "台積電")
    .replace(/台光電子/g, "台光電")
    .replace(/股份$/g, "")
    .replace(/科技$/g, "")
    .trim();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").replace(/%/g, "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toIsoDate(value) {
  const text = String(value || "").trim();
  const rocMatch = text.match(/^(\d{2,3})\/(\d{1,2})\/(\d{1,2})/);
  if (rocMatch) {
    const [, year, month, day] = rocMatch;
    return `${String(Number(year) + 1911).padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const isoMatch = text.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return "";
}

function toRocDate(isoDate) {
  const normalized = toIsoDate(isoDate);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${String(Number(year) - 1911).padStart(3, "0")}/${month}/${day}`;
}

function todayTaipeiIso() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function previousDateCandidates(isoDate, maxDays = 10) {
  const date = new Date(`${isoDate}T12:00:00+08:00`);
  const candidates = [];
  for (let offset = 1; offset <= maxDays; offset += 1) {
    const next = new Date(date);
    next.setDate(date.getDate() - offset);
    const day = next.getDay();
    if (day === 0 || day === 6) continue;
    candidates.push(next.toISOString().slice(0, 10));
  }
  return candidates;
}

function compactYmd(isoDate) {
  return toIsoDate(isoDate).replaceAll("-", "");
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

function parseCsv(raw) {
  const rows = raw.split(/\r?\n/).filter((line) => line.trim());
  const header = parseCsvLine(rows.shift() || "");
  return rows.map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(header.map((key, index) => [key, cells[index] ?? ""]));
  });
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function parseSetCookie(raw) {
  return String(raw || "")
    .split(/,(?=[^;]+=)/)
    .map((part) => part.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json, text/javascript, */*; q=0.01",
      "content-type": "application/json; charset=UTF-8",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
  return response.json();
}

async function postJsonWithCookieRedirect(url, body, headers = {}) {
  const requestBody = JSON.stringify(body);
  const first = await fetch(url, {
    method: "POST",
    redirect: "manual",
    headers: {
      accept: "application/json, text/javascript, */*; q=0.01",
      "content-type": "application/json; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
      ...headers,
    },
    body: requestBody,
  });

  if ([301, 302, 303, 307, 308].includes(first.status)) {
    const location = first.headers.get("location") || url;
    const cookie = parseSetCookie(first.headers.get("set-cookie"));
    const second = await fetch(new URL(location, url), {
      method: "POST",
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "content-type": "application/json; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: requestBody,
    });
    if (!second.ok) throw new Error(`${url} redirected HTTP ${second.status}`);
    return second.json();
  }

  if (!first.ok) throw new Error(`${url} HTTP ${first.status}`);
  return first.json();
}

async function fetchBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readCsvIfExists(filePath) {
  if (!(await fileExists(filePath))) return [];
  const raw = await readFile(filePath, "utf8");
  return parseCsv(raw);
}

async function collectHistoryFiles(root) {
  if (!(await fileExists(root))) return [];
  const codes = await readdir(root, { withFileTypes: true });
  return codes
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name, "changes_history.csv"));
}

async function loadMarketAum(root, etfCode) {
  const rows = await readCsvIfExists(path.join(root, etfCode, "market_history.csv"));
  return new Map(
    rows
      .map((row) => [String(row.snapshot_date || ""), toNumber(row.aum, null)])
      .filter(([, value]) => value != null && Number.isFinite(value) && value > 0),
  );
}

function inferValueYi({ sharesDelta, oldShares, newShares, oldWeight, newWeight, weightDelta, aumNtd }) {
  const shareDelta = toNumber(sharesDelta);
  const oldShareCount = toNumber(oldShares);
  const newShareCount = toNumber(newShares);
  const oldWeightValue = toNumber(oldWeight);
  const newWeightValue = toNumber(newWeight);
  const weightDeltaValue = toNumber(weightDelta);
  const aum = toNumber(aumNtd);

  if (aum > 0 && shareDelta) {
    const oldPrice = oldShareCount > 0 && oldWeightValue > 0 ? (aum * (oldWeightValue / 100)) / oldShareCount : 0;
    const newPrice = newShareCount > 0 && newWeightValue > 0 ? (aum * (newWeightValue / 100)) / newShareCount : 0;
    const inferredPrice = Math.abs(shareDelta) > 0 && (newPrice || oldPrice) ? newPrice || oldPrice : 0;
    if (inferredPrice > 0) return Number(((shareDelta * inferredPrice) / 100_000_000).toFixed(2));
  }

  if (aum > 0 && weightDeltaValue) {
    return Number(((aum * (weightDeltaValue / 100)) / 100_000_000).toFixed(2));
  }

  return 0;
}

function typeFromLabel(label, type, sharesDelta) {
  if (type) return type;
  if (label === "新增") return "added";
  if (label === "刪除") return "removed";
  if (label === "加碼") return "increased";
  if (label === "減碼") return "decreased";
  if (sharesDelta > 0) return "increased";
  if (sharesDelta < 0) return "decreased";
  return "weight";
}

function labelFromType(type, sharesDelta) {
  return {
    added: "新增",
    removed: "刪除",
    increased: "加碼",
    decreased: "減碼",
    weight: "權重變動",
  }[type] || (sharesDelta > 0 ? "加碼" : sharesDelta < 0 ? "減碼" : "權重變動");
}

function normalizeMovement(row, context) {
  const etfCode = normalizeCode(row.etf_code || context.etfCode);
  const stockCode = normalizeCode(row.code);
  if (!etfCode || !stockCode || !/^\d{4}$/.test(stockCode)) return null;

  const sharesDelta = toNumber(row.sharesDelta);
  const oldWeight = toNumber(row.oldWeight ?? row.weightOld);
  const newWeight = toNumber(row.newWeight ?? row.weightNew);
  const weightDelta = row.weightDelta === "" || row.weightDelta == null ? Number((newWeight - oldWeight).toFixed(4)) : toNumber(row.weightDelta);
  const type = typeFromLabel(String(row.typeLabel || ""), String(row.type || ""), sharesDelta);
  const typeLabel = labelFromType(type, sharesDelta);
  const snapshotDate = String(row.snapshot_date || context.date || "").slice(0, 10);
  const fromDate = String(row.from_date || row.fromDate || context.fromDate || "");
  const toDate = String(row.to_date || row.toDate || context.toDate || snapshotDate);
  const date = String(toDate || snapshotDate).slice(0, 10);
  if (!date) return null;

  const aumNtd = context.aumByDate.get(date) || context.etfAumYi * 100_000_000;
  const estimatedValueYi = inferValueYi({
    sharesDelta,
    oldShares: row.oldShares ?? row.sharesOld,
    newShares: row.newShares ?? row.sharesNew,
    oldWeight,
    newWeight,
    weightDelta,
    aumNtd,
  });

  return {
    id: [
      date,
      etfCode,
      stockCode,
      row.from_date || row.fromDate || context.fromDate || "",
      row.to_date || row.toDate || context.toDate || "",
      typeLabel,
    ].join("|"),
    date,
    snapshotDate,
    fromDate,
    toDate,
    etfCode,
    etfName: String(row.etf_name || context.etfName || etfCode).replace(" 主動式 ETF 操盤追蹤｜加碼減碼與持股異動", ""),
    stockCode,
    stockName: normalizeName(stockCode, row.name || row.nameNew || row.nameOld),
    industry: String(row.industry || "未分類"),
    type,
    typeLabel,
    oldWeight,
    newWeight,
    weightDelta: Number(weightDelta.toFixed(4)),
    oldShares: toNumber(row.oldShares ?? row.sharesOld),
    newShares: toNumber(row.newShares ?? row.sharesNew),
    sharesDelta,
    deltaLots: toNumber(row.deltaLots) || Math.round(sharesDelta / 1000),
    estimatedValueYi,
    absEstimatedValueYi: Math.abs(estimatedValueYi),
    source: context.source,
    sourceUrl: context.sourceUrl,
    sourcePriority: context.sourcePriority ?? sourcePriorityRank[context.source] ?? 0,
    verificationStatus: context.verificationStatus || "fallback",
    verificationLabel: context.verificationLabel || "待核對",
    primarySource: context.primarySource || context.source,
    secondarySource: context.secondarySource || "",
    valueBasis: estimatedValueYi ? "AUM x 權重/股數推估" : "權重變化",
  };
}

function normalizeOfficialHolding({ code, name, shares, weight, marketValueNtd }) {
  const stockCode = normalizeCode(code).replace(/\s.+$/, "");
  if (!/^\d{4}$/.test(stockCode)) return null;
  return {
    code: stockCode,
    name: normalizeName(stockCode, name),
    shares: toNumber(shares),
    weight: toNumber(weight),
    marketValueNtd: toNumber(marketValueNtd),
  };
}

function createOfficialSnapshot({ etfCode, etfName, date, previousTradingDate, nav, aumNtd, holdings, sourceUrl, downloadedUrl, rawSourceLabel }) {
  const official = officialSources[etfCode] || {};
  return {
    etfCode,
    etfName,
    date: toIsoDate(date),
    previousTradingDate: toIsoDate(previousTradingDate),
    nav: toNumber(nav),
    aumNtd: toNumber(aumNtd),
    holdings: holdings.map(normalizeOfficialHolding).filter(Boolean),
    issuer: official.issuer || "",
    source: "投信官方網站",
    sourceUrl: sourceUrl || official.pageUrl || "",
    downloadedUrl: downloadedUrl || "",
    rawSourceLabel: rawSourceLabel || "",
  };
}

function officialHoldingValueYi(current, previous, sharesDelta, snapshot) {
  const currentPrice = current?.shares > 0 && current?.marketValueNtd > 0 ? current.marketValueNtd / current.shares : 0;
  const previousPrice = previous?.shares > 0 && previous?.marketValueNtd > 0 ? previous.marketValueNtd / previous.shares : 0;
  const currentWeightPrice =
    current?.shares > 0 && current?.weight > 0 && snapshot.aumNtd > 0 ? (snapshot.aumNtd * (current.weight / 100)) / current.shares : 0;
  const previousWeightPrice =
    previous?.shares > 0 && previous?.weight > 0 && snapshot.aumNtd > 0 ? (snapshot.aumNtd * (previous.weight / 100)) / previous.shares : 0;
  const inferredPrice = sharesDelta >= 0 ? currentPrice || currentWeightPrice || previousPrice || previousWeightPrice : previousPrice || currentPrice || previousWeightPrice || currentWeightPrice;

  if (sharesDelta && inferredPrice > 0) return Number(((sharesDelta * inferredPrice) / 100_000_000).toFixed(2));
  if (current?.marketValueNtd || previous?.marketValueNtd) return Number((((current?.marketValueNtd || 0) - (previous?.marketValueNtd || 0)) / 100_000_000).toFixed(2));
  if (snapshot.aumNtd > 0) return Number(((snapshot.aumNtd * (((current?.weight || 0) - (previous?.weight || 0)) / 100)) / 100_000_000).toFixed(2));
  return 0;
}

function movementFromOfficialPair(current, previous, snapshot, verification) {
  const oldShares = previous?.shares || 0;
  const newShares = current?.shares || 0;
  const sharesDelta = newShares - oldShares;
  const oldWeight = previous?.weight || 0;
  const newWeight = current?.weight || 0;
  const weightDelta = Number((newWeight - oldWeight).toFixed(4));
  if (!sharesDelta && Math.abs(weightDelta) < officialWeightOnlyThreshold) return null;

  const stockCode = current?.code || previous?.code;
  const stockName = current?.name || previous?.name || stockCode;
  const type = !previous ? "added" : !current ? "removed" : sharesDelta > 0 ? "increased" : sharesDelta < 0 ? "decreased" : "weight";
  const typeLabel = labelFromType(type, sharesDelta);
  const estimatedValueYi = officialHoldingValueYi(current, previous, sharesDelta, snapshot);

  return {
    id: [snapshot.date, snapshot.etfCode, stockCode, snapshot.previousTradingDate, snapshot.date, typeLabel].join("|"),
    date: snapshot.date,
    snapshotDate: snapshot.date,
    fromDate: snapshot.previousTradingDate,
    toDate: snapshot.date,
    etfCode: snapshot.etfCode,
    etfName: snapshot.etfName,
    stockCode,
    stockName,
    industry: "官方持股",
    type,
    typeLabel,
    oldWeight,
    newWeight,
    weightDelta,
    oldShares,
    newShares,
    sharesDelta,
    deltaLots: Math.round(sharesDelta / 1000),
    estimatedValueYi,
    absEstimatedValueYi: Math.abs(estimatedValueYi),
    source: "投信官方網站",
    sourceUrl: snapshot.sourceUrl,
    sourcePriority: verification.status === "verified" ? sourcePriorityRank["投信官方網站二次核對"] : sourcePriorityRank["投信官方網站"],
    verificationStatus: verification.status,
    verificationLabel: verification.label,
    primarySource: `${snapshot.issuer} ${snapshot.rawSourceLabel || "官方資料"}`,
    secondarySource: verification.secondarySource,
    valueBasis: sharesDelta ? "官方持股差異 x 官方揭露金額反推價格" : "官方 AUM x 權重變化",
  };
}

function compareOfficialSnapshots(current, previous, verification) {
  const currentByCode = new Map(current.holdings.map((holding) => [holding.code, holding]));
  const previousByCode = new Map(previous.holdings.map((holding) => [holding.code, holding]));
  const codes = [...new Set([...currentByCode.keys(), ...previousByCode.keys()])].sort();
  return codes
    .map((code) => movementFromOfficialPair(currentByCode.get(code), previousByCode.get(code), current, verification))
    .filter(Boolean);
}

function verifyAgainstEtfInfo(snapshot) {
  const etf = etfs.find((row) => row.code === snapshot.etfCode);
  const etfHoldings = etf?.holdings || etf?.topHoldings || [];
  const etfCodes = new Set(etfHoldings.slice(0, 10).map((row) => normalizeCode(Array.isArray(row) ? row[0] : row.code)));
  const officialTop = snapshot.holdings.slice(0, 5).map((row) => row.code);
  const matchedTopCount = officialTop.filter((code) => etfCodes.has(code)).length;
  const dateMatches = !etf?.dataDate || !snapshot.date || etf.dataDate === snapshot.date;
  const pass = matchedTopCount >= Math.min(3, officialTop.length);

  return {
    status: pass ? "verified" : "warning",
    label: pass ? (dateMatches ? "官方 + ETF資訊網核對" : "官方取回，第三方日期落後") : "官方已取回，待人工複核",
    secondarySource: etf?.sourceUrl || snapshotMeta.sourceUrl,
    matchedTopCount,
    dateMatches,
    etfInfoDate: etf?.dataDate || "",
  };
}

function parseSharedStrings(xml) {
  return [...String(xml || "").matchAll(/<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g)].map((match) => {
    const textParts = [...match[1].matchAll(/<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((textMatch) => decodeXml(textMatch[1]));
    return textParts.join("");
  });
}

function parseXlsxRows(sheetXml, sharedStrings) {
  const rows = [];
  const rowRegex = /<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g;
  for (const rowMatch of String(sheetXml || "").matchAll(rowRegex)) {
    const cells = {};
    const cellRegex = /<(?:\w+:)?c\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?c>/g;
    for (const cellMatch of rowMatch[1].matchAll(cellRegex)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1];
      if (!ref) continue;
      const type = attrs.match(/\bt="([^"]+)"/)?.[1];
      const rawValue = body.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1] || "";
      cells[ref] = type === "s" ? sharedStrings[Number(rawValue)] || "" : decodeXml(rawValue);
    }
    if (Object.keys(cells).length) rows.push(cells);
  }
  return rows;
}

async function parseFuhHwaAssetsExcel(buffer, downloadedUrl) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "fhtrust-etf-"));
  const filePath = path.join(tempDir, "assets.xlsx");
  try {
    await writeFile(filePath, buffer);
    const sharedXml = execFileSync("unzip", ["-p", filePath, "xl/sharedStrings.xml"], { encoding: "utf8" });
    const sheetXml = execFileSync("unzip", ["-p", filePath, "xl/worksheets/sheet1.xml"], { encoding: "utf8" });
    const sharedStrings = parseSharedStrings(sharedXml);
    const rows = parseXlsxRows(sheetXml, sharedStrings);
    const date = toIsoDate(sharedStrings.find((item) => item.includes("日期"))?.replace(/^日期[:：]\s*/, ""));
    const aumIndex = sharedStrings.findIndex((item) => item.includes("基金資產淨值"));
    const navIndex = sharedStrings.findIndex((item) => item.includes("基金每單位淨值"));

    return createOfficialSnapshot({
      etfCode: "00991A",
      etfName: "主動復華未來50",
      date,
      nav: navIndex >= 0 ? sharedStrings[navIndex + 1] : 0,
      aumNtd: aumIndex >= 0 ? sharedStrings[aumIndex + 1] : 0,
      sourceUrl: officialSources["00991A"].pageUrl,
      downloadedUrl,
      rawSourceLabel: "官方 Excel 下載",
      holdings: rows
        .filter((row) => /^\d{4}$/.test(String(row.A || "").trim()))
        .map((row) => ({
          code: row.A,
          name: row.B,
          shares: row.C,
          marketValueNtd: row.D,
          weight: row.E,
        })),
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function fetchCapital00992A(date = null) {
  const payload = await postJson(officialSources["00992A"].apiUrl, { fundId: "500", date });
  const data = payload.data || {};
  const pcf = data.pcf || {};
  return createOfficialSnapshot({
    etfCode: "00992A",
    etfName: "主動群益科技創新",
    date: pcf.date1,
    previousTradingDate: pcf.date2,
    nav: pcf.pUnit,
    aumNtd: pcf.nav,
    sourceUrl: officialSources["00992A"].pageUrl,
    rawSourceLabel: "申購買回清單 API",
    holdings: (data.stocks || []).map((row) => ({
      code: row.stocNo,
      name: row.stocName,
      shares: row.share,
      weight: row.weightRound ?? row.weight,
    })),
  });
}

async function fetchNomura00980A(date = null) {
  const payload = await postJson(officialSources["00980A"].apiUrl, { FundID: "00980A", SearchDate: date });
  const data = payload?.Entries?.Data || {};
  const fundAsset = data.FundAsset || {};
  const stockTable = (data.Table || []).find((table) => table.TableTitle === "股票") || {};
  return createOfficialSnapshot({
    etfCode: "00980A",
    etfName: "主動野村臺灣優選",
    date: stockTable.NavDate || fundAsset.NavDate,
    nav: fundAsset.Nav,
    aumNtd: fundAsset.Aum,
    sourceUrl: officialSources["00980A"].pageUrl,
    rawSourceLabel: "PCF 官方 API",
    holdings: (stockTable.Rows || []).map(([code, name, shares, weight]) => ({
      code,
      name,
      shares,
      weight,
    })),
  });
}

async function fetchFuhHwa00991A(date = null) {
  const targetDate = date ? compactYmd(date) : "";
  let downloadedUrl = "";

  if (targetDate) {
    downloadedUrl = `${officialSources["00991A"].apiUrl}/${targetDate}`;
  } else {
    const html = await (await fetch(officialSources["00991A"].pageUrl)).text();
    const link = html.match(/href="([^"]*\/api\/assetsExcel\/ETF23\/\d{8})"/)?.[1];
    if (!link) throw new Error("復華官方頁未找到 assetsExcel 下載連結");
    downloadedUrl = new URL(link, officialSources["00991A"].pageUrl).toString();
  }

  return parseFuhHwaAssetsExcel(await fetchBuffer(downloadedUrl), downloadedUrl);
}

async function fetchEzMoney00981A(date = null, specificDate = false) {
  const queryDate = date ? toRocDate(date) : toRocDate(todayTaipeiIso());
  const payload = await postJsonWithCookieRedirect(
    officialSources["00981A"].apiUrl,
    { fundCode: officialSources["00981A"].fundCode, date: queryDate, specificDate },
    { referer: officialSources["00981A"].pageUrl },
  );
  const pUnit = (payload.pcf || []).find((row) => row.PCFCode === "P_UNIT") || {};
  const nav = (payload.pcf || []).find((row) => row.PCFCode === "NAV") || {};
  const stockAsset = (payload.asset || []).find((row) => row.AssetCode === "ST") || {};

  return createOfficialSnapshot({
    etfCode: "00981A",
    etfName: "主動統一台股增長",
    date: toIsoDate(pUnit.ValueDate),
    nav: pUnit.Amount,
    aumNtd: nav.Amount,
    sourceUrl: officialSources["00981A"].pageUrl,
    rawSourceLabel: "PCF 官方 API（下拉選單 00981A）",
    holdings: (stockAsset.Details || []).map((row) => ({
      code: row.DetailCode,
      name: row.DetailName,
      shares: row.Share,
      marketValueNtd: row.Amount,
      weight: row.NavRate,
    })),
  });
}

async function findPreviousOfficialSnapshot(fetcher, currentDate) {
  for (const candidate of previousDateCandidates(currentDate)) {
    try {
      const snapshot = await fetcher(candidate);
      if (snapshot?.date && snapshot.date < currentDate && snapshot.holdings.length) return snapshot;
    } catch {
      // Some issuer endpoints return 404/empty for holidays; keep walking back.
    }
  }
  return null;
}

async function buildOfficialPair(etfCode, fetcher, previousFetcher = fetcher) {
  const current = await fetcher();
  if (!current?.date || !current.holdings.length) throw new Error(`${etfCode} 官方資料缺少日期或持股`);
  const previousDate = current.previousTradingDate || "";
  const previous = previousDate ? await previousFetcher(previousDate) : await findPreviousOfficialSnapshot(previousFetcher, current.date);
  if (!previous?.date || !previous.holdings.length) throw new Error(`${etfCode} 找不到前一交易日官方持股`);
  current.previousTradingDate = previous.date;
  const verification = verifyAgainstEtfInfo(current);
  return {
    etfCode,
    current,
    previous,
    verification,
    rows: compareOfficialSnapshots(current, previous, verification),
  };
}

function sourceHealthFromOfficialPair(result) {
  const { current, previous, verification } = result;
  return {
    etfCode: current.etfCode,
    etfName: current.etfName,
    issuer: current.issuer,
    status: verification.status,
    statusLabel: verification.label,
    primarySource: `${current.issuer} ${current.rawSourceLabel}`,
    secondarySource: verification.secondarySource,
    latestDate: current.date,
    previousDate: previous.date,
    holdingCount: current.holdings.length,
    sourceUrl: current.sourceUrl,
    downloadedUrl: current.downloadedUrl,
    fallbackUsed: false,
    matchedTopCount: verification.matchedTopCount,
    notes: [
      current.etfCode === "00981A" ? "統一 PCF 入口下拉選單可切 00981A / 00988A / 00403A；程式抓取 00981A fundCode=49YTW" : "",
      `前五大與 ETF資訊網交叉命中 ${verification.matchedTopCount} 檔`,
      verification.dateMatches ? "資料日期一致" : `ETF資訊網日期 ${verification.etfInfoDate || "未揭露"}，官方資料較新`,
    ].filter(Boolean),
  };
}

function sourceHealthFallback(etfCode, error) {
  const etf = etfs.find((row) => row.code === etfCode);
  const official = officialSources[etfCode] || {};
  return {
    etfCode,
    etfName: etf?.name || etfCode,
    issuer: official.issuer || "",
    status: "fallback",
    statusLabel: "官方取回失敗，使用 ETF資訊網備援",
    primarySource: `${official.issuer || "投信"} 官方網站`,
    secondarySource: etf?.sourceUrl || snapshotMeta.sourceUrl,
    latestDate: etf?.comparisonToDate || etf?.dataDate || "",
    previousDate: etf?.comparisonFromDate || "",
    holdingCount: etf?.holdingsCount || etf?.holdings?.length || 0,
    sourceUrl: official.pageUrl || "",
    fallbackUsed: true,
    fallbackReason: error?.message || "官方來源暫時無法取得",
    notes: ["保留 ETF資訊網 latestDiff 備援，待下一輪官方成功後自動覆蓋"],
  };
}

async function movementsFromOfficialSources() {
  const configs = [
    ["00980A", () => buildOfficialPair("00980A", () => fetchNomura00980A(), (date) => fetchNomura00980A(date))],
    [
      "00981A",
      async () => {
        const current = await fetchEzMoney00981A(null, false);
        const previous = await fetchEzMoney00981A(current.date, true);
        if (!previous?.date || !previous.holdings.length) throw new Error("00981A 找不到前一交易日官方持股");
        current.previousTradingDate = previous.date;
        const verification = verifyAgainstEtfInfo(current);
        return {
          etfCode: "00981A",
          current,
          previous,
          verification,
          rows: compareOfficialSnapshots(current, previous, verification),
        };
      },
    ],
    ["00991A", () => buildOfficialPair("00991A", () => fetchFuhHwa00991A(), (date) => fetchFuhHwa00991A(date))],
    ["00992A", () => buildOfficialPair("00992A", () => fetchCapital00992A(), (date) => fetchCapital00992A(date))],
  ];
  const rows = [];
  const sourceHealth = [];

  for (const [etfCode, runner] of configs) {
    try {
      const result = await runner();
      rows.push(...result.rows);
      sourceHealth.push(sourceHealthFromOfficialPair(result));
    } catch (error) {
      sourceHealth.push(sourceHealthFallback(etfCode, error));
    }
  }

  return { rows, sourceHealth };
}

function movementsFromCurrentEtfs() {
  return etfs.flatMap((etf) => {
    const rows = etf.flowChanges || [];
    return rows
      .map(([stockCode, stockName, sharesDelta, weight, detail = {}]) =>
        normalizeMovement(
          {
            snapshot_date: etf.comparisonToDate || etf.dataDate,
            from_date: etf.comparisonFromDate,
            to_date: etf.comparisonToDate || etf.dataDate,
            etf_code: etf.code,
            etf_name: etf.name,
            code: stockCode,
            name: stockName,
            industry: detail.industry,
            type: detail.type,
            typeLabel: detail.typeLabel,
            oldWeight: detail.oldWeight,
            newWeight: detail.newWeight,
            weightDelta: detail.weightDelta || weight,
            oldShares: detail.oldShares,
            newShares: detail.newShares,
            sharesDelta,
          },
          {
            etfCode: etf.code,
            etfName: etf.name,
            etfAumYi: etf.aum,
            aumByDate: new Map([[etf.dataDate, etf.aum * 100_000_000]]),
            source: "ETF資訊網 latestDiff",
            sourceUrl: etf.sourceUrl || snapshotMeta.sourceUrl,
            sourcePriority: sourcePriorityRank["ETF資訊網 latestDiff"],
            verificationStatus: officialEtfCodes.has(etf.code) ? "fallback" : "third-party",
            verificationLabel: officialEtfCodes.has(etf.code) ? "官方失敗才用備援" : "第三方快照",
            primarySource: "ETF資訊網 latestDiff",
            secondarySource: "",
          },
        ),
      )
      .filter(Boolean)
      .map((row, index) => {
        const estimatedValueYi = Number(detailValue(rows[index]?.[4]?.flowYi, row.estimatedValueYi).toFixed(2));
        return {
          ...row,
          estimatedValueYi,
          absEstimatedValueYi: Math.abs(estimatedValueYi),
        };
      });
  });
}

function detailValue(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : fallback;
}

async function movementsFromHistory() {
  const etfByCode = new Map(etfs.map((etf) => [etf.code, etf]));
  const rows = [];

  for (const root of historyRoots) {
    const files = await collectHistoryFiles(root);
    for (const filePath of files) {
      const etfCode = path.basename(path.dirname(filePath));
      const etf = etfByCode.get(etfCode);
      const aumByDate = await loadMarketAum(root, etfCode);
      const csvRows = await readCsvIfExists(filePath);
      const source = root.includes("official_snapshots") ? "投信/MoneyDJ 本機快照差異" : "ETF資訊網歷史快照差異";
      for (const row of csvRows) {
        const movement = normalizeMovement(row, {
          etfCode,
          etfName: etf?.name || etfCode,
          etfAumYi: etf?.aum || 0,
          aumByDate,
          source,
          sourceUrl: etf?.sourceUrl || snapshotMeta.sourceUrl,
          sourcePriority: sourcePriorityRank[source] || 0,
          verificationStatus: officialEtfCodes.has(etfCode) ? "fallback" : "historical",
          verificationLabel: officialEtfCodes.has(etfCode) ? "官方失敗才用備援" : "歷史快照",
          primarySource: source,
          secondarySource: "",
        });
        if (movement) rows.push(movement);
      }
    }
  }

  return rows;
}

function buildSummaries(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.date}|${row.etfCode}`;
    const summary =
      groups.get(key) ||
      {
        date: row.date,
        etfCode: row.etfCode,
        etfName: row.etfName,
        fromDate: row.fromDate,
        toDate: row.toDate,
        addCount: 0,
        cutCount: 0,
        weightOnlyCount: 0,
        buyValueYi: 0,
        sellValueYi: 0,
        netValueYi: 0,
        largestBuy: null,
        largestSell: null,
      };
    if (row.estimatedValueYi > 0) summary.buyValueYi += row.estimatedValueYi;
    if (row.estimatedValueYi < 0) summary.sellValueYi += row.estimatedValueYi;
    if (["新增", "加碼"].includes(row.typeLabel)) summary.addCount += 1;
    if (["刪除", "減碼"].includes(row.typeLabel)) summary.cutCount += 1;
    if (row.typeLabel === "權重變動") summary.weightOnlyCount += 1;
    summary.netValueYi += row.estimatedValueYi;
    if (row.estimatedValueYi > 0 && (!summary.largestBuy || row.absEstimatedValueYi > summary.largestBuy.absEstimatedValueYi)) {
      summary.largestBuy = row;
    }
    if (row.estimatedValueYi < 0 && (!summary.largestSell || row.absEstimatedValueYi > summary.largestSell.absEstimatedValueYi)) {
      summary.largestSell = row;
    }
    groups.set(key, summary);
  }

  return [...groups.values()]
    .map((summary) => ({
      ...summary,
      buyValueYi: Number(summary.buyValueYi.toFixed(2)),
      sellValueYi: Number(summary.sellValueYi.toFixed(2)),
      netValueYi: Number(summary.netValueYi.toFixed(2)),
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || Math.abs(b.netValueYi) - Math.abs(a.netValueYi));
}

function mergeMovement(existing, incoming) {
  if (!existing) return incoming;
  if ((incoming.sourcePriority || 0) < (existing.sourcePriority || 0)) return existing;
  const merged = { ...existing, ...incoming };
  for (const field of ["oldShares", "newShares", "sharesDelta", "deltaLots", "oldWeight", "newWeight", "weightDelta"]) {
    if (!incoming[field] && existing[field]) merged[field] = existing[field];
  }
  return merged;
}

function serializeModule({ meta, rows, summaries }) {
  return [
    `export const dailyMovementMeta = ${JSON.stringify(meta, null, 2)};`,
    "",
    `export const dailyMovements = ${JSON.stringify(rows, null, 2)};`,
    "",
    `export const dailyEtfSummaries = ${JSON.stringify(summaries, null, 2)};`,
    "",
  ].join("\n");
}

async function main() {
  const official = await movementsFromOfficialSources();
  const officialDateKeys = new Set(
    official.sourceHealth
      .filter((item) => !item.fallbackUsed && item.latestDate)
      .map((item) => `${item.etfCode}|${item.latestDate}`),
  );
  const historical = await movementsFromHistory();
  const current = movementsFromCurrentEtfs();
  const byId = new Map();

  official.rows.forEach((row) => {
    byId.set(row.id, mergeMovement(byId.get(row.id), row));
  });
  [...historical, ...current].forEach((row) => {
    if (officialDateKeys.has(`${row.etfCode}|${row.date}`)) return;
    byId.set(row.id, mergeMovement(byId.get(row.id), row));
  });
  const rows = [...byId.values()]
    .sort((a, b) => b.date.localeCompare(a.date) || b.absEstimatedValueYi - a.absEstimatedValueYi)
    .slice(0, maxRows);
  const dates = [...new Set(rows.map((row) => row.date))].sort();
  const etfCodes = [...new Set(rows.map((row) => row.etfCode))].sort();
  const summaries = buildSummaries(rows);
  const meta = {
    generatedAt: new Date().toISOString(),
    asOf: dates.at(-1) || snapshotMeta.asOf,
    fromDate: dates[0] || "",
    toDate: dates.at(-1) || "",
    rowCount: rows.length,
    etfCount: etfCodes.length,
    dates,
    etfCodes,
    source: "投信官方網站優先 + ETF資訊網備援",
    sourceUrl: snapshotMeta.sourceUrl,
    sourcePolicy: "00980A、00981A、00991A、00992A 先取投信官方可觀看或可下載的當日資料，與前一開盤日官方資料比較；再用 ETF資訊網公開快照做二次查核。官方來源失敗時才保留 ETF資訊網備援。",
    sourceHealth: official.sourceHealth,
    officialDisclosure: "TWSE 主動式 ETF 制度說明：投資組合每營業日於基金淨值結算後由投信公司揭露。",
    note: "異動金額為公開快照差異估算，適合用於價值順位比較，不等於基金實際成交價或成交時間。",
  };

  await writeFile(path.join(projectRoot, "src/data/dailyMovements.js"), serializeModule({ meta, rows, summaries }));
  console.log(`Imported ${rows.length} daily movement rows; asOf=${meta.asOf}; etfs=${etfCodes.length}`);
}

main().catch((error) => {
  if (optional) {
    console.warn(`Daily movements import skipped: ${error.message}`);
    return;
  }
  console.error(error);
  process.exitCode = 1;
});
