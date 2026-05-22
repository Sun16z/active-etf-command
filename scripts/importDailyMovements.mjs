import { execFileSync } from "node:child_process";
import { access, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { etfs, snapshotMeta } from "../src/data/etfUniverse.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const optional = process.argv.includes("--optional");
const maxRows = Number(process.env.ACTIVE_ETF_DAILY_ROWS || 4000);
const fetchTimeoutMs = Number(process.env.ACTIVE_ETF_FETCH_TIMEOUT_MS || 30_000);
const reportDateOverride = toIsoDate(process.env.ACTIVE_ETF_REPORT_DATE || "");
const officialEtfCodes = new Set(etfs.map((row) => normalizeCode(row.code)).filter((code) => code.endsWith("A")));
const officialWeightOnlyThreshold = 0.05;
const unifiedOfficialFundCodeByEtf = {
  "00403A": "63YTW",
  "00981A": "49YTW",
  "00988A": "61YTW",
};
const cathayFundCodeByEtf = {
  "00400A": "EA",
};
const tsitOfficialEtfCodes = new Set(["00986A", "00987A"]);
const allianzOfficialEtfCodes = new Set(["00984A", "00993A"]);
const firstGoldFundIdByEtf = {
  "00994A": "182",
};
const megaProductIdByEtf = {
  "00996A": "23",
};
const jpmPcfXlsxByEtf = {
  "00401A": {
    url: "https://am.jpmorgan.com/content/dam/jpm-am-aem/asiapacific/tw/zh/regulatory/etf-supplement/jpm_apac_tw_etf_pcf_updates_00401A_TW00000401A1.xlsx",
    referer: "https://am.jpmorgan.com/tw/zh/asset-management/twetf/products/jpmorgan-taiwan-taiwan-equity-high-income-active-etf-tw00000401a1",
  },
  "00989A": {
    url: "https://am.jpmorgan.com/content/dam/jpm-am-aem/asiapacific/tw/zh/regulatory/etf-supplement/jpm_apac_tw_etf_pcf_updates_00989A_TW00000989A5.xlsx",
    referer: "https://am.jpmorgan.com/tw/zh/asset-management/twetf/products/jpmorgan-taiwan-u-s-tech-leaders-active-etf-tw00000989a5",
  },
};
const yuantaBridgeApiUrl = "https://etfapi.yuantaetfs.com/ectranslation/api/bridge";
let allianzFundNoByCodeCache = null;
let capitalFundIdByCodeCache = null;

const sourcePriorityRank = {
  "投信官方網站": 100,
  "投信官方網站二次核對": 110,
  "ETF資訊網 latestDiff": 40,
  "ETF資訊網歷史快照差異": 35,
  "投信/MoneyDJ 本機快照差異": 30,
};

const officialSources = {
  "00400A": {
    issuer: "國泰投信",
    pageUrl: "https://www.cathaysite.com.tw/funds/etf/index.aspx",
    apiUrl: "https://cwapi.cathaysite.com.tw/api/ETF/GetIndexStockWeights",
  },
  "00401A": {
    issuer: "摩根投信",
    pageUrl: "https://am.jpmorgan.com/tw/zh/asset-management/twetf/funds/jpmorgan-tw-equity-high-income-etf/",
  },
  "00403A": {
    issuer: "統一投信",
    pageUrl: "https://www.ezmoney.com.tw/ETF/Fund/Info?FundCode=63YTW",
    fundCode: "63YTW",
    apiUrl: "https://www.ezmoney.com.tw/ETF/Transaction/GetPCF",
  },
  "00980A": {
    issuer: "野村投信",
    pageUrl: "https://www.nomurafunds.com.tw/ETFWEB/pcf",
    apiUrl: "https://www.nomurafunds.com.tw/API/ETFAPI/api/Fund/GetFundAssets",
  },
  "00985A": {
    issuer: "野村投信",
    pageUrl: "https://www.nomurafunds.com.tw/ETFWEB/pcf",
    apiUrl: "https://www.nomurafunds.com.tw/API/ETFAPI/api/Fund/GetFundAssets",
  },
  "00981A": {
    issuer: "統一投信",
    pageUrl: "https://www.ezmoney.com.tw/ETF/Transaction/PCF?fundCode=61YTW",
    fundCode: "49YTW",
    apiUrl: "https://www.ezmoney.com.tw/ETF/Transaction/GetPCF",
  },
  "00982A": {
    issuer: "群益投信",
    pageUrl: "https://www.capitalfund.com.tw/etf",
    apiUrl: "https://www.capitalfund.com.tw/CFWeb/api/etf/buyback",
  },
  "00983A": {
    issuer: "中國信託投信",
    pageUrl: "https://www.ctbcinvestments.com.tw/CTWEB/Content/ETF/pcd.aspx?ETF_ID=00983A",
    apiUrl: "https://www.ctbcinvestments.com.tw/CTWEB/Content/ETF/pcd.aspx",
  },
  "00984A": {
    issuer: "安聯投信",
    pageUrl: "https://etf.allianzgi.com.tw/",
    apiUrl: "https://etf.allianzgi.com.tw/webapi/api/Fund/GetFundTradeInfo",
  },
  "00986A": {
    issuer: "台新投信",
    pageUrl: "https://www.tsit.com.tw/ETF/Home/Pcf/00986A?FundType=ALL",
    apiUrl: "https://www.tsit.com.tw/ETF/Home/Pcf/00986A",
  },
  "00987A": {
    issuer: "台新投信",
    pageUrl: "https://www.tsit.com.tw/ETF/Home/Pcf/00987A?FundType=ALL",
    apiUrl: "https://www.tsit.com.tw/ETF/Home/Pcf/00987A",
  },
  "00989A": {
    issuer: "摩根投信",
    pageUrl: "https://am.jpmorgan.com/tw/zh/asset-management/twetf/funds/jpmorgan-us-tech-leaders-etf/",
  },
  "00990A": {
    issuer: "元大投信",
    pageUrl: "https://www.yuantaetfs.com/tradeInfo/pcf/00990A",
    apiUrl: "https://etfapi.yuantaetfs.com/ectranslation/api/bridge",
  },
  "00988A": {
    issuer: "統一投信",
    pageUrl: "https://www.ezmoney.com.tw/ETF/Fund/Info?FundCode=61YTW",
    fundCode: "61YTW",
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
  "00993A": {
    issuer: "安聯投信",
    pageUrl: "https://etf.allianzgi.com.tw/",
    apiUrl: "https://etf.allianzgi.com.tw/webapi/api/Fund/GetFundTradeInfo",
  },
  "00994A": {
    issuer: "第一金投信",
    pageUrl: "https://www.fsitc.com.tw/FundDetail.aspx?ID=182",
    apiUrl: "https://www.fsitc.com.tw/WebAPI.aspx/Get_hd",
  },
  "00995A": {
    issuer: "中國信託投信",
    pageUrl: "https://www.ctbcinvestments.com.tw/CTWEB/Content/ETF/pcd.aspx?ETF_ID=00995A",
    apiUrl: "https://www.ctbcinvestments.com.tw/CTWEB/Content/ETF/pcd.aspx",
  },
  "00996A": {
    issuer: "兆豐投信",
    pageUrl: "https://www.megafunds.com.tw/MEGA/etf/etf_product.aspx?id=23",
    apiUrl: "https://www.megafunds.com.tw/MEGA/etf/etf_product.aspx",
  },
  "00997A": {
    issuer: "群益投信",
    pageUrl: "https://www.capitalfund.com.tw/etf",
    apiUrl: "https://www.capitalfund.com.tw/CFWeb/api/etf/buyback",
  },
  "00999A": {
    issuer: "野村投信",
    pageUrl: "https://www.nomurafunds.com.tw/ETFWEB/pcf",
    apiUrl: "https://www.nomurafunds.com.tw/API/ETFAPI/api/Fund/GetFundAssets",
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

function officialSourceInfo(etfCode) {
  const normalizedCode = normalizeCode(etfCode);
  const known = officialSources[normalizedCode] || {};
  const etf = etfs.find((row) => normalizeCode(row.code) === normalizedCode);
  const issuerName = String(known.issuer || etf?.issuer || "").trim();
  return {
    etfCode: normalizedCode,
    issuer: issuerName ? (issuerName.endsWith("投信") ? issuerName : `${issuerName}投信`) : "",
    pageUrl: String(known.pageUrl || etf?.issuerSite || ""),
    apiUrl: String(known.apiUrl || ""),
    fundCode: String(known.fundCode || ""),
    etfName: String(etf?.name || normalizedCode),
  };
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

function compactYmdToIso(value) {
  const match = String(value || "").match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${year}-${month}-${day}`;
}

function toSlashDate(isoDate) {
  const normalized = toIsoDate(isoDate);
  return normalized ? normalized.replaceAll("-", "/") : "";
}

function normalizeHtmlText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
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

function reportDateTaipeiIso() {
  return reportDateOverride || todayTaipeiIso();
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

function decodeBig5Html(buffer) {
  try {
    return new TextDecoder("big5").decode(buffer);
  } catch {
    return buffer.toString("utf8");
  }
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(fetchTimeoutMs),
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
    signal: AbortSignal.timeout(fetchTimeoutMs),
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
      signal: AbortSignal.timeout(fetchTimeoutMs),
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
  const response = await fetch(url, { signal: AbortSignal.timeout(fetchTimeoutMs) });
  if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function fetchTsitActiveByCode(etfCode, date = null) {
  const normalizedCode = normalizeCode(etfCode);
  const sourceInfo = officialSourceInfo(normalizedCode);
  const requestedDate = toIsoDate(date || todayTaipeiIso());
  const url = `${sourceInfo.apiUrl || `https://www.tsit.com.tw/ETF/Home/Pcf/${normalizedCode}`}?FundType=ALL&DataDate=${requestedDate}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(fetchTimeoutMs),
    headers: {
      accept: "text/html",
      "user-agent": "Mozilla/5.0 ActiveETFCommand/1.0",
      referer: sourceInfo.pageUrl || "https://www.tsit.com.tw/ETF/Home/Pcf",
    },
  });
  if (!response.ok) throw new Error(`台新 ${normalizedCode} PCF HTTP ${response.status}`);
  const html = await response.text();
  const publishedDate = toIsoDate(html.match(/name="PUB_DATE"[^>]*value="([^"]+)"/)?.[1] || requestedDate);
  if (date && publishedDate && publishedDate !== requestedDate) {
    throw new Error(`台新 ${normalizedCode} 查詢 ${requestedDate} 回傳 ${publishedDate}`);
  }

  const nav = normalizeHtmlText(html.match(/<th[^>]*>\s*每受益權單位淨資產價值\(元\)\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i)?.[1] || "");
  const aum = normalizeHtmlText(html.match(/<th[^>]*>\s*基金淨資產價值\(元\)\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i)?.[1] || "");
  const stockCard =
    html.match(/<div class="card-header text-bg-danger">[\s\S]*?<table class="table table-striped">([\s\S]*?)<\/table>/i)?.[1]
    || "";
  let holdings = [...stockCard.matchAll(/<tr>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)%?<\/td>\s*<\/tr>/g)]
    .map((match) => ({
      code: normalizeHtmlText(match[1]).replace(/\s+/g, " "),
      name: normalizeHtmlText(match[2]),
      shares: normalizeHtmlText(match[3]),
      weight: normalizeHtmlText(match[4]),
    }))
    .filter((row) => row.code && !row.code.includes("股票合計"));
  if (!holdings.length) {
    holdings = [...html.matchAll(/<tr>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)%?<\/td>\s*<\/tr>/g)]
      .map((match) => ({
        code: normalizeHtmlText(match[1]).replace(/\s+/g, " "),
        name: normalizeHtmlText(match[2]),
        shares: normalizeHtmlText(match[3]),
        weight: normalizeHtmlText(match[4]),
      }))
      .filter((row) => row.code && !row.code.includes("合計") && !row.code.includes("期貨"));
  }

  return createOfficialSnapshot({
    etfCode: normalizedCode,
    etfName: sourceInfo.etfName,
    date: publishedDate || requestedDate,
    nav,
    aumNtd: aum,
    sourceUrl: sourceInfo.pageUrl,
    downloadedUrl: url,
    rawSourceLabel: "PCF 網頁 (DataDate)",
    holdings,
  });
}

async function fetchAllianzXsrfContext() {
  const response = await fetch("https://etf.allianzgi.com.tw/webapi/api/AntiForgery/GetAntiForgeryToken", {
    signal: AbortSignal.timeout(fetchTimeoutMs),
    headers: {
      accept: "application/json, text/plain, */*",
      origin: "https://etf.allianzgi.com.tw",
      referer: "https://etf.allianzgi.com.tw/",
      "user-agent": "Mozilla/5.0 ActiveETFCommand/1.0",
    },
  });
  if (!response.ok) throw new Error(`安聯 anti-forgery HTTP ${response.status}`);
  const payload = await response.json();
  return {
    token: payload?.token || "",
    cookie: parseSetCookie(response.headers.get("set-cookie")),
  };
}

async function postAllianz(pathName, body, context) {
  const response = await fetch(`https://etf.allianzgi.com.tw/webapi/api/${pathName}`, {
    method: "POST",
    signal: AbortSignal.timeout(fetchTimeoutMs),
    headers: {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      origin: "https://etf.allianzgi.com.tw",
      referer: "https://etf.allianzgi.com.tw/",
      "user-agent": "Mozilla/5.0 ActiveETFCommand/1.0",
      ...(context?.cookie ? { cookie: context.cookie } : {}),
      ...(context?.token ? { "X-XSRF-TOKEN": context.token } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  if (!response.ok) throw new Error(`安聯 ${pathName} HTTP ${response.status}`);
  return response.json();
}

async function fetchAllianzFundNoByCode() {
  if (allianzFundNoByCodeCache instanceof Map) return allianzFundNoByCodeCache;
  const context = await fetchAllianzXsrfContext();
  const payload = await postAllianz("Category/GetFundDropdownOptions", { TypeID: 6 }, context);
  const map = new Map();
  for (const entry of payload?.Entries || []) {
    const code = normalizeCode(entry?.SecuritiesCode);
    const fundNo = String(entry?.FundNo || "").trim();
    if (code && fundNo) map.set(code, fundNo);
  }
  allianzFundNoByCodeCache = map;
  return map;
}

async function fetchAllianzActiveByCode(etfCode, date = null) {
  const normalizedCode = normalizeCode(etfCode);
  const sourceInfo = officialSourceInfo(normalizedCode);
  const fundNoByCode = await fetchAllianzFundNoByCode();
  const fundNo = fundNoByCode.get(normalizedCode);
  if (!fundNo) throw new Error(`安聯 ${normalizedCode} 找不到 FundNo`);

  const context = await fetchAllianzXsrfContext();
  const body = { FundNo: fundNo };
  if (date) body.Date = toIsoDate(date);
  const payload = await postAllianz("Fund/GetFundTradeInfo", body, context);
  const entries = payload?.Entries || {};
  const snapshotDate = toIsoDate(entries?.CPcfdate || entries?.CNavDt || body.Date || todayTaipeiIso());

  const stockTable = (entries.DynamicTableData || []).find((table) => String(table?.TableTitle || "").includes("股票")) || {};
  const holdings = (stockTable.Rows || []).map((row) => ({
    code: row?.[1] || row?.[0] || "",
    name: row?.[2] || row?.[1] || "",
    shares: row?.[3] || row?.[2] || 0,
    weight: row?.[4] || row?.[3] || 0,
  }));

  return createOfficialSnapshot({
    etfCode: normalizedCode,
    etfName: sourceInfo.etfName,
    date: snapshotDate,
    nav: entries?.CAnceNav || entries?.CNav || 0,
    aumNtd: entries?.CAnceTotalAv || 0,
    sourceUrl: sourceInfo.pageUrl,
    downloadedUrl: `https://etf.allianzgi.com.tw/webapi/api/Fund/GetFundTradeInfo?FundNo=${fundNo}`,
    rawSourceLabel: `Fund/GetFundTradeInfo FundNo=${fundNo}`,
    holdings,
  });
}

async function fetchYuantaActiveByCode(etfCode, date = null) {
  const normalizedCode = normalizeCode(etfCode);
  const sourceInfo = officialSourceInfo(normalizedCode);
  const params = {
    APIType: "ETFAPI",
    FuncId: "PCF/Daily",
    ticker: normalizedCode,
  };
  if (date) params.ndate = compactYmd(date);
  const url = `${yuantaBridgeApiUrl}?${new URLSearchParams(params).toString()}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(fetchTimeoutMs),
    headers: {
      accept: "application/json, text/plain, */*",
      "user-agent": "Mozilla/5.0 ActiveETFCommand/1.0",
      referer: sourceInfo.pageUrl,
    },
  });
  if (!response.ok) throw new Error(`元大 ${normalizedCode} PCF/Daily HTTP ${response.status}`);
  const payload = await response.json();
  const pcf = payload?.PCF || {};
  const stockWeights = payload?.FundWeights?.StockWeights || [];
  const snapshotDate = compactYmdToIso(pcf.trandate);
  const previousTradingDate = compactYmdToIso(pcf.predate);

  return createOfficialSnapshot({
    etfCode: normalizedCode,
    etfName: sourceInfo.etfName,
    date: snapshotDate,
    previousTradingDate: previousTradingDate && previousTradingDate < snapshotDate ? previousTradingDate : "",
    nav: pcf.nav,
    aumNtd: pcf.totalav,
    sourceUrl: sourceInfo.pageUrl,
    downloadedUrl: url,
    rawSourceLabel: "PCF/Daily bridge API",
    holdings: stockWeights.map((row) => ({
      code: row.code,
      name: row.name || row.ename,
      shares: row.qty,
      weight: row.weights,
    })),
  });
}

async function postFirstGoldWebApi(route, fundId, date) {
  const response = await fetch(`https://www.fsitc.com.tw/WebAPI.aspx/${route}`, {
    method: "POST",
    signal: AbortSignal.timeout(fetchTimeoutMs),
    headers: {
      accept: "application/json, text/javascript, */*; q=0.01",
      "content-type": "application/json; charset=utf-8",
      origin: "https://www.fsitc.com.tw",
      referer: `https://www.fsitc.com.tw/FundDetail.aspx?ID=${fundId}`,
      "user-agent": "Mozilla/5.0 ActiveETFCommand/1.0",
    },
    body: JSON.stringify({
      pStrFundID: String(fundId),
      pStrDate: date,
    }),
  });
  if (!response.ok) throw new Error(`第一金 ${route} HTTP ${response.status}`);
  const payload = await response.json();
  return payload?.d || "";
}

async function fetchFirstGoldActiveByCode(etfCode, date = null) {
  const normalizedCode = normalizeCode(etfCode);
  const sourceInfo = officialSourceInfo(normalizedCode);
  const fundId = firstGoldFundIdByEtf[normalizedCode];
  if (!fundId) throw new Error(`第一金 ${normalizedCode} 缺少 fundId`);
  const requestDate = toSlashDate(date || todayTaipeiIso());

  const hdRows = JSON.parse(await postFirstGoldWebApi("Get_hd", fundId, requestDate) || "[]");
  const stockRows = hdRows.filter((row) => String(row.group || "") === "1");
  const snapshotDate = toIsoDate(stockRows[0]?.sdate || requestDate);

  const buySellRows = JSON.parse(await postFirstGoldWebApi("Get_BuySellA", fundId, requestDate) || "[]");
  const aumText = buySellRows.find((row) => String(row.A || "").includes("基金淨資產價值"))?.B || "";
  const navText = buySellRows.find((row) => String(row.A || "").includes("每受益權單位淨資產價值"))?.B || "";

  return createOfficialSnapshot({
    etfCode: normalizedCode,
    etfName: sourceInfo.etfName,
    date: snapshotDate,
    nav: navText,
    aumNtd: aumText,
    sourceUrl: sourceInfo.pageUrl,
    downloadedUrl: `https://www.fsitc.com.tw/WebAPI.aspx/Get_hd?pStrFundID=${fundId}&pStrDate=${requestDate}`,
    rawSourceLabel: `WebAPI Get_hd / Get_BuySellA fundId=${fundId}`,
    holdings: stockRows.map((row) => ({
      code: row.A,
      name: row.B,
      shares: row.D,
      weight: row.C,
    })),
  });
}

async function fetchMegaActiveByCode(etfCode) {
  const normalizedCode = normalizeCode(etfCode);
  const sourceInfo = officialSourceInfo(normalizedCode);
  const productId = megaProductIdByEtf[normalizedCode];
  if (!productId) throw new Error(`兆豐 ${normalizedCode} 缺少 productId`);
  const url = `https://www.megafunds.com.tw/MEGA/etf/etf_product.aspx?id=${productId}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(fetchTimeoutMs),
    headers: {
      accept: "text/html",
      "user-agent": "Mozilla/5.0 ActiveETFCommand/1.0",
    },
  });
  if (!response.ok) throw new Error(`兆豐 ${normalizedCode} 持股頁 HTTP ${response.status}`);
  const html = await response.text();
  const snapshotDate = toIsoDate(html.match(/資料來源：兆豐投信，\s*(\d{4}\/\d{2}\/\d{2})/)?.[1] || "");
  const aumNtd = normalizeHtmlText(html.match(/淨資產價值<\/div>\s*<div class="si-amount">\s*([\d,]+)/)?.[1] || "");
  const nav = normalizeHtmlText(html.match(/每單位淨值<\/div>\s*<div class="si-amount">\s*([\d.]+)/)?.[1] || "");
  const holdings = [...html.matchAll(/<div class="fund-info content-list-1">\s*<div class="fund-content">\s*([^<]+?)\s*<\/div>\s*<div class="fund-content">\s*([^<]+?)\s*<\/div>\s*<div class="fund-content txt-right">\s*([^<]+?)\s*<\/div>\s*<div class="fund-content txt-right">\s*([^<]+?)\s*<\/div>/g)]
    .map((match) => ({
      code: normalizeHtmlText(match[1]),
      name: normalizeHtmlText(match[2]),
      shares: normalizeHtmlText(match[3]),
      weight: normalizeHtmlText(match[4]),
    }));

  return createOfficialSnapshot({
    etfCode: normalizedCode,
    etfName: sourceInfo.etfName,
    date: snapshotDate,
    nav,
    aumNtd,
    sourceUrl: sourceInfo.pageUrl,
    downloadedUrl: url,
    rawSourceLabel: "ETF 產品頁持股比重",
    holdings,
  });
}

async function fetchCtbcLegacyPcfByCode(etfCode) {
  const normalizedCode = normalizeCode(etfCode);
  const sourceInfo = officialSourceInfo(normalizedCode);
  const url = `https://www.ctbcinvestments.com.tw/CTWEB/Content/ETF/pcd.aspx?ETF_ID=${normalizedCode}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(fetchTimeoutMs),
    headers: {
      accept: "text/html",
      "user-agent": "Mozilla/5.0 ActiveETFCommand/1.0",
      referer: "https://www.ctbcinvestments.com.tw/CTWEB/Content/ETF/pcd.aspx",
    },
  });
  if (!response.ok) throw new Error(`中信 ${normalizedCode} pcd HTTP ${response.status}`);
  const html = decodeBig5Html(Buffer.from(await response.arrayBuffer()));
  const snapshotDate = toIsoDate(html.match(/id="Label_AUM01">([^<]+)/)?.[1] || "");
  const aumNtd = normalizeHtmlText(html.match(/id="Label_AUM02">([^<]+)/)?.[1] || "");
  const nav = normalizeHtmlText(html.match(/id="Label_AUM04">([^<]+)/)?.[1] || "");
  const stockTable = html.match(/<table id="Table_STOCK"[\s\S]*?<\/table>/i)?.[0] || "";
  const holdings = [...stockTable.matchAll(/<tr>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<\/tr>/g)]
    .map((match) => ({
      code: normalizeHtmlText(match[1]),
      name: normalizeHtmlText(match[2]),
      shares: normalizeHtmlText(match[3]),
      weight: normalizeHtmlText(match[4]),
    }))
    .filter((row) => row.code && row.code !== "股票代碼");

  return createOfficialSnapshot({
    etfCode: normalizedCode,
    etfName: sourceInfo.etfName,
    date: snapshotDate,
    nav,
    aumNtd,
    sourceUrl: sourceInfo.pageUrl,
    downloadedUrl: url,
    rawSourceLabel: "CTWEB pcd.aspx",
    holdings,
  });
}

async function fetchCathay00400A() {
  const etfCode = "00400A";
  const sourceInfo = officialSourceInfo(etfCode);
  const fundCode = cathayFundCodeByEtf[etfCode];
  const headers = {
    accept: "application/json, text/plain, */*",
    origin: "https://www.cathaysite.com.tw",
    referer: "https://www.cathaysite.com.tw/",
    "user-agent": "Mozilla/5.0 ActiveETFCommand/1.0",
  };
  const buySaleUrl = `https://cwapi.cathaysite.com.tw/api/BuySale/GetBuySale?FundCode=${fundCode}`;
  const weightUrl = `https://cwapi.cathaysite.com.tw/api/ETF/GetIndexStockWeights?FundCode=${fundCode}`;
  const [buySaleResponse, weightResponse] = await Promise.all([
    fetch(buySaleUrl, { signal: AbortSignal.timeout(fetchTimeoutMs), headers }),
    fetch(weightUrl, { signal: AbortSignal.timeout(fetchTimeoutMs), headers }),
  ]);
  if (!buySaleResponse.ok) throw new Error(`國泰 GetBuySale HTTP ${buySaleResponse.status}`);
  if (!weightResponse.ok) throw new Error(`國泰 GetIndexStockWeights HTTP ${weightResponse.status}`);
  const buySale = await buySaleResponse.json();
  const weight = await weightResponse.json();
  const buySaleResult = buySale?.result || {};
  const weightResult = weight?.result || {};
  return createOfficialSnapshot({
    etfCode,
    etfName: sourceInfo.etfName,
    date: toIsoDate(weightResult?.date || buySaleResult?.date || ""),
    nav: buySaleResult.nav,
    aumNtd: buySaleResult.aum,
    sourceUrl: sourceInfo.pageUrl,
    downloadedUrl: weightUrl,
    rawSourceLabel: `cwapi FundCode=${fundCode}`,
    holdings: (weightResult.stockWeights || []).map((row) => ({
      code: row.stockCode,
      name: row.stockName,
      shares: 0,
      weight: row.weights,
    })),
  });
}

async function fetchJpmActiveByCode(etfCode) {
  const normalizedCode = normalizeCode(etfCode);
  const sourceInfo = officialSourceInfo(normalizedCode);
  const config = jpmPcfXlsxByEtf[normalizedCode];
  if (!config) throw new Error(`摩根 ${normalizedCode} 缺少 PCF 檔案設定`);
  const response = await fetch(config.url, {
    signal: AbortSignal.timeout(fetchTimeoutMs),
    headers: {
      accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*",
      origin: "https://am.jpmorgan.com",
      referer: config.referer,
      "user-agent": "Mozilla/5.0 ActiveETFCommand/1.0",
    },
  });
  if (!response.ok) throw new Error(`摩根 ${normalizedCode} PCF 檔案 HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const isZip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  if (!isZip) throw new Error(`摩根 ${normalizedCode} PCF 檔案格式錯誤`);

  const tempDir = await mkdtemp(path.join(os.tmpdir(), `jpm-pcf-${normalizedCode}-`));
  const filePath = path.join(tempDir, "pcf.xlsx");
  try {
    await writeFile(filePath, buffer);
    const sharedXml = execFileSync("unzip", ["-p", filePath, "xl/sharedStrings.xml"], { encoding: "utf8" });
    const sheetXml = execFileSync("unzip", ["-p", filePath, "xl/worksheets/sheet1.xml"], { encoding: "utf8" });
    const sharedStrings = parseSharedStrings(sharedXml);
    const rows = parseXlsxRows(sheetXml, sharedStrings);
    const summary = rows.find((row) => String(row.A || "").trim() === "H") || {};
    const estimatedTotalMarketValue = toNumber(summary.O || summary.K || 0);
    const snapshotDate = compactYmdToIso(summary.G || "");
    const holdings = rows
      .filter((row) => String(row.A || "").trim() === "D")
      .map((row) => {
        const marketValueBase = toNumber(row.Q || 0);
        const inferredWeight = estimatedTotalMarketValue > 0 ? Number(((marketValueBase / estimatedTotalMarketValue) * 100).toFixed(4)) : 0;
        return {
          code: row.E,
          name: row.I,
          shares: row.J,
          marketValueNtd: marketValueBase,
          weight: inferredWeight,
        };
      });

    return createOfficialSnapshot({
      etfCode: normalizedCode,
      etfName: sourceInfo.etfName,
      date: snapshotDate,
      nav: summary.L || 0,
      aumNtd: summary.K || summary.O || 0,
      sourceUrl: sourceInfo.pageUrl,
      downloadedUrl: config.url,
      rawSourceLabel: "PCF xlsx",
      holdings,
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
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

async function fetchCapitalFundIdByCode() {
  if (capitalFundIdByCodeCache instanceof Map) return capitalFundIdByCodeCache;
  const response = await fetch("https://www.capitalfund.com.tw/etf", {
    signal: AbortSignal.timeout(fetchTimeoutMs),
    headers: {
      accept: "text/html",
      "user-agent": "Mozilla/5.0 ActiveETFCommand/1.0",
    },
  });
  if (!response.ok) throw new Error(`群益ETF頁 HTTP ${response.status}`);
  const html = await response.text();
  const fundIds = [...new Set([...html.matchAll(/\/etf\/product\/detail\/(\d+)\/basic/gi)].map((match) => match[1]))];
  const byCode = new Map();
  for (const fundId of fundIds) {
    try {
      const basicUrl = `https://www.capitalfund.com.tw/etf/product/detail/${fundId}/basic`;
      const detailResponse = await fetch(basicUrl, {
        signal: AbortSignal.timeout(fetchTimeoutMs),
        headers: {
          accept: "text/html",
          "user-agent": "Mozilla/5.0 ActiveETFCommand/1.0",
        },
      });
      if (!detailResponse.ok) continue;
      const detailHtml = await detailResponse.text();
      const code =
        detailHtml.match(/股票代號[\s\S]{0,160}?(\d{5}[A-Z])/)?.[1]
        || detailHtml.match(/\b(\d{5}[A-Z])\s*TT\b/)?.[1]
        || "";
      if (!code) continue;
      byCode.set(normalizeCode(code), fundId);
    } catch {
      // Keep resolving other fund ids.
    }
  }
  capitalFundIdByCodeCache = byCode;
  return byCode;
}

async function fetchCapitalActiveByCode(etfCode, date = null) {
  const normalizedCode = normalizeCode(etfCode);
  const fundIdByCode = await fetchCapitalFundIdByCode();
  const fundId = fundIdByCode.get(normalizedCode);
  if (!fundId) throw new Error(`${normalizedCode} 在群益官方網站找不到 fundId`);
  const payload = await postJson(officialSources["00992A"].apiUrl, { fundId, date });
  const data = payload.data || {};
  const pcf = data.pcf || {};
  const sourceInfo = officialSourceInfo(normalizedCode);
  return createOfficialSnapshot({
    etfCode: normalizedCode,
    etfName: sourceInfo.etfName,
    date: pcf.date1,
    previousTradingDate: pcf.date2,
    nav: pcf.pUnit,
    aumNtd: pcf.nav,
    sourceUrl: `https://www.capitalfund.com.tw/etf/product/detail/${fundId}/buyback`,
    rawSourceLabel: `申購買回清單 API fundId=${fundId}`,
    holdings: (data.stocks || []).map((row) => ({
      code: row.stocNo,
      name: row.stocName,
      shares: row.share,
      weight: row.weightRound ?? row.weight,
    })),
  });
}

async function fetchNomuraActiveByCode(etfCode, date = null) {
  const normalizedCode = normalizeCode(etfCode);
  const sourceInfo = officialSourceInfo(normalizedCode);
  const payload = await postJson(officialSources["00980A"].apiUrl, { FundID: normalizedCode, SearchDate: date });
  const data = payload?.Entries?.Data || {};
  const fundAsset = data.FundAsset || {};
  const stockTable = (data.Table || []).find((table) => table.TableTitle === "股票") || {};
  return createOfficialSnapshot({
    etfCode: normalizedCode,
    etfName: sourceInfo.etfName,
    date: stockTable.NavDate || fundAsset.NavDate,
    nav: fundAsset.Nav,
    aumNtd: fundAsset.Aum,
    sourceUrl: sourceInfo.pageUrl || officialSources["00980A"].pageUrl,
    rawSourceLabel: "PCF 官方 API",
    holdings: (stockTable.Rows || []).map(([code, name, shares, weight]) => ({
      code,
      name,
      shares,
      weight,
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
  const directBaseUrl = officialSources["00991A"].apiUrl;
  const targetIsoDate = date ? toIsoDate(date) : "";
  const today = todayTaipeiIso();
  const dateCandidates = targetIsoDate
    ? [targetIsoDate]
    : [today, ...previousDateCandidates(today).slice(0, 10)];
  const attemptErrors = [];

  async function fetchOneCandidate(candidateIsoDate) {
    const compactDate = compactYmd(candidateIsoDate);
    if (!compactDate) throw new Error(`日期格式無效: ${candidateIsoDate}`);
    const downloadedUrl = `${directBaseUrl}/${compactDate}`;
    const response = await fetch(downloadedUrl, {
      signal: AbortSignal.timeout(fetchTimeoutMs),
      headers: {
        accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/excel,*/*",
        referer: officialSources["00991A"].pageUrl,
        "user-agent": "Mozilla/5.0 ActiveETFCommand/1.0",
      },
    });
    if (!response.ok) throw new Error(`${downloadedUrl} HTTP ${response.status}`);
    const contentType = String(response.headers.get("content-type") || "");
    const buffer = Buffer.from(await response.arrayBuffer());
    const isZip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
    if (!isZip || /application\/json/i.test(contentType)) {
      const preview = buffer.toString("utf8", 0, 24).replace(/\s+/g, " ").trim();
      throw new Error(`無可用 Excel（ct=${contentType || "unknown"}；preview=${preview || "binary"}）`);
    }
    return parseFuhHwaAssetsExcel(buffer, downloadedUrl);
  }

  for (const candidate of dateCandidates) {
    try {
      return await fetchOneCandidate(candidate);
    } catch (error) {
      attemptErrors.push(`${candidate}: ${error?.message || "未知錯誤"}`);
    }
  }

  if (targetIsoDate) {
    throw new Error(`復華 ${targetIsoDate} 官方檔案下載失敗: ${attemptErrors.join(" | ") || "未知錯誤"}`);
  }

  const htmlResponse = await fetch(officialSources["00991A"].pageUrl, { signal: AbortSignal.timeout(fetchTimeoutMs) });
  if (!htmlResponse.ok) throw new Error(`復華官方頁 HTTP ${htmlResponse.status}`);
  const html = await htmlResponse.text();
  const link = html.match(/href="([^"]*\/api\/assetsExcel\/ETF23\/\d{8})"/)?.[1];
  if (!link) {
    throw new Error(`復華官方頁未找到 assetsExcel 下載連結；最近錯誤: ${attemptErrors.join(" | ") || "未知錯誤"}`);
  }
  const downloadedUrl = new URL(link, officialSources["00991A"].pageUrl).toString();
  return parseFuhHwaAssetsExcel(await fetchBuffer(downloadedUrl), downloadedUrl);
}

async function fetchEzMoneyActiveByCode(etfCode, date = null, specificDate = false) {
  const normalizedCode = normalizeCode(etfCode);
  const sourceInfo = officialSourceInfo(normalizedCode);
  const fundCode = unifiedOfficialFundCodeByEtf[normalizedCode] || sourceInfo.fundCode;
  if (!fundCode) throw new Error(`${normalizedCode} 缺少統一官網 fundCode`);
  const queryDate = date ? toRocDate(date) : toRocDate(todayTaipeiIso());
  const payload = await postJsonWithCookieRedirect(
    officialSources["00981A"].apiUrl,
    { fundCode, date: queryDate, specificDate },
    { referer: officialSources["00981A"].pageUrl },
  );
  const pUnit = (payload.pcf || []).find((row) => row.PCFCode === "P_UNIT") || {};
  const nav = (payload.pcf || []).find((row) => row.PCFCode === "NAV") || {};
  const stockAsset =
    (payload.asset || []).find((row) => row.AssetCode === "ST")
    || (payload.asset || []).find((row) => String(row.AssetCode || "").toUpperCase() === "EQ")
    || {};
  const fundShortName = String(payload?.fund?.sFundShortName || "").trim();
  const resolvedName = sourceInfo.etfName || fundShortName || normalizedCode;

  return createOfficialSnapshot({
    etfCode: normalizedCode,
    etfName: resolvedName,
    date: toIsoDate(pUnit.ValueDate),
    nav: pUnit.Amount,
    aumNtd: nav.Amount,
    sourceUrl: sourceInfo.pageUrl || officialSources["00981A"].pageUrl,
    rawSourceLabel: `PCF 官方 API fundCode=${fundCode}`,
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
  const previousDate = current.previousTradingDate && current.previousTradingDate < current.date ? current.previousTradingDate : "";
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
      current.etfCode === "00981A" ? "統一 PCF 來源: 00981A=49YTW" : "",
      current.etfCode === "00403A" ? "統一 PCF 來源: 00403A=63YTW" : "",
      current.etfCode === "00988A" ? "統一 PCF 來源: 00988A=61YTW" : "",
      `前五大與 ETF資訊網交叉命中 ${verification.matchedTopCount} 檔`,
      verification.dateMatches ? "資料日期一致" : `ETF資訊網日期 ${verification.etfInfoDate || "未揭露"}，官方資料較新`,
    ].filter(Boolean),
  };
}

function sourceHealthFallback(etfCode, error) {
  const etf = etfs.find((row) => row.code === etfCode);
  const official = officialSourceInfo(etfCode);
  return {
    etfCode,
    etfName: etf?.name || etfCode,
    issuer: official.issuer || "",
    status: "fallback",
    statusLabel: "官方取回失敗，使用 ETF資訊網備援",
    primarySource: `${official.issuer || etf?.issuer || "投信"} 官方網站`,
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

function sourceHealthOfficialCurrentOnly(snapshot, reason = "") {
  return {
    etfCode: snapshot.etfCode,
    etfName: snapshot.etfName,
    issuer: snapshot.issuer,
    status: "warning",
    statusLabel: "官方當日持股已取回，前日快照待補",
    primarySource: `${snapshot.issuer} ${snapshot.rawSourceLabel || "官方資料"}`,
    secondarySource: snapshotMeta.sourceUrl,
    latestDate: snapshot.date,
    previousDate: "",
    holdingCount: snapshot.holdings.length,
    sourceUrl: snapshot.sourceUrl,
    downloadedUrl: snapshot.downloadedUrl,
    fallbackUsed: true,
    fallbackReason: reason || "官方端點暫無可回溯前一交易日參數，先保留 ETF資訊網差異備援。",
    notes: [
      "官方當日快照已成功抓取",
      "待補可回溯前一交易日端點後，將自動升級為全官方比對",
    ],
  };
}

async function movementsFromOfficialSources() {
  const configs = new Map();
  const currentOnlyConfigs = new Map();
  for (const code of Object.keys(unifiedOfficialFundCodeByEtf)) {
    configs.set(
      code,
      async () => {
        const current = await fetchEzMoneyActiveByCode(code, null, false);
        const previous = await fetchEzMoneyActiveByCode(code, current.date, true);
        if (!previous?.date || !previous.holdings.length) throw new Error(`${code} 找不到前一交易日官方持股`);
        current.previousTradingDate = previous.date;
        const verification = verifyAgainstEtfInfo(current);
        return {
          etfCode: code,
          current,
          previous,
          verification,
          rows: compareOfficialSnapshots(current, previous, verification),
        };
      },
    );
  }
  for (const code of ["00980A", "00985A", "00999A"]) {
    configs.set(code, () => buildOfficialPair(code, () => fetchNomuraActiveByCode(code), (date) => fetchNomuraActiveByCode(code, date)));
  }
  configs.set("00991A", () => buildOfficialPair("00991A", () => fetchFuhHwa00991A(), (date) => fetchFuhHwa00991A(date)));
  for (const code of ["00982A", "00992A", "00997A"]) {
    configs.set(code, () => buildOfficialPair(code, () => fetchCapitalActiveByCode(code), (date) => fetchCapitalActiveByCode(code, date)));
  }
  for (const code of tsitOfficialEtfCodes) {
    configs.set(code, () => buildOfficialPair(code, () => fetchTsitActiveByCode(code), (queryDate) => fetchTsitActiveByCode(code, queryDate)));
  }
  for (const code of allianzOfficialEtfCodes) {
    configs.set(code, () => buildOfficialPair(code, () => fetchAllianzActiveByCode(code), (queryDate) => fetchAllianzActiveByCode(code, queryDate)));
  }
  configs.set("00990A", () => buildOfficialPair("00990A", () => fetchYuantaActiveByCode("00990A"), (queryDate) => fetchYuantaActiveByCode("00990A", queryDate)));
  configs.set("00994A", () => buildOfficialPair("00994A", () => fetchFirstGoldActiveByCode("00994A"), (queryDate) => fetchFirstGoldActiveByCode("00994A", queryDate)));
  currentOnlyConfigs.set("00401A", () => fetchJpmActiveByCode("00401A"));
  currentOnlyConfigs.set("00989A", () => fetchJpmActiveByCode("00989A"));
  currentOnlyConfigs.set("00400A", () => fetchCathay00400A());
  currentOnlyConfigs.set("00983A", () => fetchCtbcLegacyPcfByCode("00983A"));
  currentOnlyConfigs.set("00995A", () => fetchCtbcLegacyPcfByCode("00995A"));
  currentOnlyConfigs.set("00996A", () => fetchMegaActiveByCode("00996A"));

  const rows = [];
  const sourceHealth = [];

  const targetCodes = [...officialEtfCodes].sort();
  for (const etfCode of targetCodes) {
    const runner = configs.get(etfCode);
    const currentOnlyRunner = currentOnlyConfigs.get(etfCode);
    if (!runner) {
      if (!currentOnlyRunner) {
        sourceHealth.push(sourceHealthFallback(etfCode, new Error("尚未接入該投信官網當日持股端點")));
        continue;
      }
      try {
        const snapshot = await currentOnlyRunner();
        sourceHealth.push(sourceHealthOfficialCurrentOnly(snapshot));
      } catch (error) {
        sourceHealth.push(sourceHealthFallback(etfCode, error));
      }
      continue;
    }
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

function classifyMovementBucket(row, reportDate) {
  const fromDate = toIsoDate(row.fromDate);
  const toDate = toIsoDate(row.toDate || row.date);
  if (!toDate) return "undated";
  if (toDate === reportDate) return "today_official";
  if (fromDate === reportDate && toDate > reportDate) return "next_pcf";
  if (toDate > reportDate) return "future_pcf";
  return "historical";
}

function annotateMovementForReportDate(row, reportDate) {
  const dataBucket = classifyMovementBucket(row, reportDate);
  const reportEligible = dataBucket !== "next_pcf" && dataBucket !== "future_pcf";
  return {
    ...row,
    reportDate,
    dataBucket,
    reportEligible,
    pcfAlignmentNote: reportEligible
      ? "納入今日正式資料層"
      : "明日 PCF / 預揭露資料，保留但不納入今日共識、今日圖卡、今日回測",
  };
}

function annotateSourceHealthForReportDate(item, reportDate) {
  const latestDate = toIsoDate(item.latestDate);
  const previousDate = toIsoDate(item.previousDate);
  const dataBucket = latestDate > reportDate
    ? (previousDate === reportDate ? "next_pcf" : "future_pcf")
    : latestDate === reportDate
      ? "today_official"
      : "historical";
  return {
    ...item,
    reportDate,
    dataBucket,
    reportEligible: dataBucket !== "next_pcf" && dataBucket !== "future_pcf",
    pcfAlignmentNote: dataBucket === "next_pcf" || dataBucket === "future_pcf"
      ? "官方已揭露到未來 PCF；不納入今日正式比較"
      : "可納入今日正式比較或歷史資料",
  };
}

function bucketCounts(rows) {
  return rows.reduce((counts, row) => {
    const key = row.dataBucket || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
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

function serializeModule({ meta, rows, summaries, nextPcfRows, nextPcfSummaries, allRows }) {
  return [
    `export const dailyMovementMeta = ${JSON.stringify(meta, null, 2)};`,
    "",
    `export const dailyMovements = ${JSON.stringify(rows, null, 2)};`,
    "",
    `export const dailyEtfSummaries = ${JSON.stringify(summaries, null, 2)};`,
    "",
    `export const nextPcfMovements = ${JSON.stringify(nextPcfRows, null, 2)};`,
    "",
    `export const nextPcfEtfSummaries = ${JSON.stringify(nextPcfSummaries, null, 2)};`,
    "",
    `export const allCapturedMovements = ${JSON.stringify(allRows, null, 2)};`,
    "",
  ].join("\n");
}

async function main() {
  const reportDate = reportDateTaipeiIso();
  const official = await movementsFromOfficialSources();
  const sourceHealth = official.sourceHealth.map((item) => annotateSourceHealthForReportDate(item, reportDate));
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
  const allRows = [...byId.values()]
    .map((row) => annotateMovementForReportDate(row, reportDate))
    .sort((a, b) => b.date.localeCompare(a.date) || b.absEstimatedValueYi - a.absEstimatedValueYi)
    .slice(0, maxRows * 2);
  const nextPcfRows = allRows
    .filter((row) => row.dataBucket === "next_pcf" || row.dataBucket === "future_pcf")
    .slice(0, maxRows);
  const rows = allRows
    .filter((row) => row.reportEligible)
    .slice(0, maxRows);
  const dates = [...new Set(rows.map((row) => row.date))].sort();
  const capturedDates = [...new Set(allRows.map((row) => row.date))].sort();
  const nextPcfDates = [...new Set(nextPcfRows.map((row) => row.date))].sort();
  const etfCodes = [...new Set(rows.map((row) => row.etfCode))].sort();
  const nextPcfEtfCodes = [...new Set(nextPcfRows.map((row) => row.etfCode))].sort();
  const summaries = buildSummaries(rows);
  const nextPcfSummaries = buildSummaries(nextPcfRows);
  const meta = {
    generatedAt: new Date().toISOString(),
    reportDate,
    asOf: dates.includes(reportDate) ? reportDate : dates.at(-1) || snapshotMeta.asOf,
    latestCapturedDate: dates.at(-1) || "",
    latestCapturedDateAll: capturedDates.at(-1) || "",
    nextPcfDate: nextPcfDates.at(-1) || "",
    fromDate: dates[0] || "",
    toDate: dates.at(-1) || "",
    reportWindow: {
      officialTodayRule: "今日正式資料只納入 toDate <= reportDate，且今日共識/圖卡/回測預設使用 toDate = reportDate。",
      nextPcfRule: "fromDate = reportDate 且 toDate > reportDate 的資料保留為 nextPcfMovements，不納入 dailyMovements。",
      reportDateSource: reportDateOverride ? "ACTIVE_ETF_REPORT_DATE" : "Asia/Taipei today",
    },
    rowCount: rows.length,
    allCapturedRowCount: allRows.length,
    nextPcfRowCount: nextPcfRows.length,
    etfCount: etfCodes.length,
    nextPcfEtfCount: nextPcfEtfCodes.length,
    dates,
    capturedDates,
    nextPcfDates,
    etfCodes,
    nextPcfEtfCodes,
    bucketCounts: bucketCounts(allRows),
    source: "投信官方網站優先 + ETF資訊網備援",
    sourceUrl: snapshotMeta.sourceUrl,
    sourcePolicy: "主動式 ETF 全量名單優先取投信官方當日資料，與前一開盤日官方資料比較；dailyMovements 僅保留 reportDate 以前的正式資料，未來 PCF 統一分流至 nextPcfMovements。",
    sourceHealth,
    officialDisclosure: "TWSE 主動式 ETF 制度說明：投資組合每營業日於基金淨值結算後由投信公司揭露。",
    note: "異動金額為公開快照差異估算，適合用於價值順位比較，不等於基金實際成交價或成交時間。若投信於晚間揭露下一交易日 PCF，該資料只進 nextPcfMovements。",
  };

  await writeDailyReports({
    reportDate: meta.reportDate,
    generatedAt: meta.generatedAt,
    etfs,
    snapshotMeta,
    sourceHealth,
    rows,
  });

  await writeFile(path.join(projectRoot, "src/data/dailyMovements.js"), serializeModule({ meta, rows, summaries, nextPcfRows, nextPcfSummaries, allRows }));
  console.log(`Imported ${rows.length} daily movement rows; reportDate=${meta.reportDate}; asOf=${meta.asOf}; latestCaptured=${meta.latestCapturedDate || "n/a"}; nextPcfRows=${nextPcfRows.length}; etfs=${etfCodes.length}`);
}

async function writeDailyReports({ reportDate, generatedAt, etfs, snapshotMeta, sourceHealth, rows }) {
  const reportsDir = path.join(projectRoot, "outputs", "reports");
  await access(reportsDir).catch(() => mkdir(reportsDir, { recursive: true }));

  const universeByCode = new Map(etfs.map((row) => [normalizeCode(row.code), row]));
  const healthByCode = new Map(sourceHealth.map((row) => [normalizeCode(row.etfCode), row]));

  const allUniverseCodes = [...universeByCode.keys()].sort();
  const completionRows = allUniverseCodes.map((code) => {
    const uni = universeByCode.get(code) || {};
    const health = healthByCode.get(code);
    if (!health) {
      return {
        etfCode: code,
        etfName: String(uni.name || ""),
        issuer: String(uni.issuer || ""),
        completion: "未納入今日日變動來源健康表",
        status: "not_in_scope",
        statusLabel: "not_in_scope",
        primarySource: "",
        sourceUrl: "",
        downloadedUrl: "",
        latestDate: "",
        previousDate: "",
        holdingCount: "",
        blocker: "待確認是否屬於同一批可比對ETF範圍",
      };
    }

    const completion =
      health.status === "verified"
        ? "完成（前後日皆可比對）"
        : health.status === "warning"
          ? "部分完成（當日可抓，前日待補或用備援）"
          : "待確認";

    return {
      etfCode: health.etfCode,
      etfName: health.etfName,
      issuer: (health.issuer || "").replace("投信", ""),
      completion,
      status: health.status,
      statusLabel: health.statusLabel,
      primarySource: health.primarySource,
      sourceUrl: health.sourceUrl,
      downloadedUrl: health.downloadedUrl || "",
      latestDate: health.latestDate,
      previousDate: health.previousDate || "",
      holdingCount: health.holdingCount,
      blocker: health.fallbackUsed ? health.fallbackReason || "" : "",
    };
  });

  const csvHeader = [
    "etfCode",
    "etfName",
    "issuer",
    "completion",
    "status",
    "statusLabel",
    "primarySource",
    "sourceUrl",
    "downloadedUrl",
    "latestDate",
    "previousDate",
    "holdingCount",
    "blocker",
  ];
  const csvBody = completionRows
    .map((row) => csvHeader.map((key) => csvEscape(row[key] ?? "")).join(","))
    .join("\n");
  await writeFile(path.join(reportsDir, `${reportDate}_etf_download_completion.csv`), `${csvHeader.join(",")}\n${csvBody}\n`);

  const counts = {
    complete: completionRows.filter((row) => String(row.completion).startsWith("完成")).length,
    partial: completionRows.filter((row) => String(row.completion).startsWith("部分完成")).length,
    pending: completionRows.filter((row) => String(row.completion).includes("待確認")).length,
  };

  const mdLines = [];
  mdLines.push("# ETF下載完成度（最新刷新）", "");
  mdLines.push(`- 匯入時間：${generatedAt}`);
  mdLines.push(`- ETF總數：${completionRows.length}`);
  mdLines.push(`- 完成：${counts.complete}`);
  mdLines.push(`- 部分完成：${counts.partial}`);
  mdLines.push(`- 待確認範圍：${counts.pending}`, "");
  mdLines.push("| ETF | 名稱 | 完成度 | 來源 | 最新日 | 前一日 | 卡點 |");
  mdLines.push("|---|---|---|---|---|---|---|");
  for (const row of completionRows) {
    mdLines.push(
      `| ${row.etfCode} | ${row.etfName || "-"} | ${row.completion} | ${row.primarySource || "-"} | ${row.latestDate || "-"} | ${row.previousDate || "-"} | ${row.blocker || "-"} |`,
    );
  }
  await writeFile(path.join(reportsDir, `${reportDate}_etf_download_completion.md`), `${mdLines.join("\n")}\n`);

  const mdUrlLines = [];
  mdUrlLines.push("# ETF下載完成度（含來源URL）", "");
  mdUrlLines.push(`- 匯入時間：${generatedAt}`);
  mdUrlLines.push(`- reportDate：${reportDate}`);
  mdUrlLines.push(`- universeSnapshotAsOf：${String(snapshotMeta?.asOf || "")}`, "");
  mdUrlLines.push("| ETF | 名稱 | 主要來源 | sourceUrl | downloadedUrl | 最新日 | 前一日 | fallback |");
  mdUrlLines.push("|---|---|---|---|---|---|---|---|");
  for (const row of completionRows) {
    const health = healthByCode.get(normalizeCode(row.etfCode));
    mdUrlLines.push(
      `| ${row.etfCode} | ${row.etfName || "-"} | ${row.primarySource || "-"} | ${row.sourceUrl || "-"} | ${row.downloadedUrl || "-"} | ${row.latestDate || "-"} | ${row.previousDate || "-"} | ${health?.fallbackUsed ? "Y" : "N"} |`,
    );
  }
  await writeFile(path.join(reportsDir, `${reportDate}_etf_download_completion_with_urls.md`), `${mdUrlLines.join("\n")}\n`);

  await writeTargetEtfHoldingChanges({ reportDate, rows, reportsDir });
}

async function writeTargetEtfHoldingChanges({ reportDate, rows, reportsDir }) {
  const targetCodes = ["00981A", "00991A", "00403A"];
  const todayRows = rows.filter((row) => row.reportDate === reportDate && row.date === reportDate && row.reportEligible);
  const byEtf = new Map();
  for (const code of targetCodes) byEtf.set(code, []);
  for (const row of todayRows) {
    const code = normalizeCode(row.etfCode);
    if (byEtf.has(code)) byEtf.get(code).push(row);
  }

  const summaryHeader = [
    "etfCode",
    "etfName",
    "fromDate",
    "toDate",
    "totalChanges",
    "added",
    "increased",
    "decreased",
    "removed",
    "weight",
    "shareChanged",
    "weightOnly",
    "sourceUrl",
  ];
  const summaryRows = [];

  const detailHeader = [
    "etfCode",
    "etfName",
    "fromDate",
    "toDate",
    "stockCode",
    "stockName",
    "typeLabel",
    "oldWeight",
    "newWeight",
    "weightDelta",
    "deltaLots",
    "estimatedValueYi",
    "sourceUrl",
    "verificationLabel",
  ];
  const detailRows = [];

  for (const [code, changes] of byEtf.entries()) {
    if (changes.length === 0) continue;
    const sample = changes[0];
    const counts = { added: 0, increased: 0, decreased: 0, removed: 0, weightOnly: 0, shareChanged: 0, weight: 0 };
    for (const row of changes) {
      if (row.type === "added") counts.added += 1;
      if (row.type === "increased") counts.increased += 1;
      if (row.type === "decreased") counts.decreased += 1;
      if (row.type === "removed") counts.removed += 1;
      const sharesDelta = Number(row.sharesDelta || 0);
      if (sharesDelta !== 0) counts.shareChanged += 1;
      if (sharesDelta === 0 && Math.abs(Number(row.weightDelta || 0)) > 0) counts.weightOnly += 1;
      if (Math.abs(Number(row.weightDelta || 0)) > 0) counts.weight += 1;

      detailRows.push({
        etfCode: row.etfCode,
        etfName: row.etfName,
        fromDate: row.fromDate,
        toDate: row.toDate,
        stockCode: row.stockCode,
        stockName: row.stockName,
        typeLabel: row.typeLabel,
        oldWeight: row.oldWeight,
        newWeight: row.newWeight,
        weightDelta: row.weightDelta,
        deltaLots: row.deltaLots,
        estimatedValueYi: row.estimatedValueYi,
        sourceUrl: row.sourceUrl,
        verificationLabel: row.verificationLabel,
      });
    }

    summaryRows.push({
      etfCode: code,
      etfName: sample.etfName,
      fromDate: sample.fromDate,
      toDate: sample.toDate,
      totalChanges: changes.length,
      ...counts,
      sourceUrl: sample.sourceUrl,
    });
  }

  const summaryCsv =
    `${summaryHeader.join(",")}\n` +
    summaryRows.map((row) => summaryHeader.map((key) => csvEscape(row[key] ?? "")).join(",")).join("\n") +
    "\n";
  await writeFile(path.join(reportsDir, `${reportDate}_target_etf_holding_changes_summary.csv`), summaryCsv);

  const detailCsv =
    `${detailHeader.join(",")}\n` +
    detailRows.map((row) => detailHeader.map((key) => csvEscape(row[key] ?? "")).join(",")).join("\n") +
    "\n";
  await writeFile(path.join(reportsDir, `${reportDate}_target_etf_holding_changes_detail.csv`), detailCsv);

  await writeFile(
    path.join(reportsDir, `${reportDate}_target_etf_holding_changes.json`),
    JSON.stringify({ reportDate, targetCodes, summary: summaryRows, detail: detailRows }, null, 2) + "\n",
  );
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes("\"") || text.includes(",") || text.includes("\n")) return `"${text.replaceAll("\"", "\"\"")}"`;
  return text;
}

main().catch((error) => {
  if (optional) {
    console.warn(`Daily movements import skipped: ${error.message}`);
    return;
  }
  console.error(error);
  process.exitCode = 1;
});
