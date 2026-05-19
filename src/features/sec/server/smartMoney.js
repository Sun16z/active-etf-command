import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SEC_BASE = "https://www.sec.gov";
const SEC_DATA_BASE = "https://data.sec.gov";
const SEC_CACHE_TTL_MS = Number(process.env.SEC_CACHE_TTL_MS || 15 * 60_000);
const SEC_TIMEOUT_MS = Number(process.env.SEC_TIMEOUT_MS || 15_000);
const SEC_MIN_INTERVAL_MS = Number(process.env.SEC_MIN_INTERVAL_MS || 350);
const SEC_USER_AGENT =
  process.env.SEC_USER_AGENT || "us-market-radar/0.1 local research justin@example.invalid";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../../..");

export const GURU_MANAGERS = [
  { id: "berkshire", name: "Berkshire Hathaway", lead: "Warren Buffett", cik: "0001067983", style: "價值 / 保險浮存金" },
  { id: "bridgewater", name: "Bridgewater Associates", lead: "Ray Dalio legacy", cik: "0001350694", style: "宏觀 / 風險平價" },
  { id: "scion", name: "Scion Asset Management", lead: "Michael Burry", cik: "0001649339", style: "逆向 / 集中押注" },
  { id: "pershing", name: "Pershing Square", lead: "Bill Ackman", cik: "0001336528", style: "集中 / 品牌現金流" },
  { id: "appaloosa", name: "Appaloosa", lead: "David Tepper", cik: "0001006438", style: "機會型 / 週期" },
  { id: "renaissance", name: "Renaissance Technologies", lead: "Jim Simons legacy", cik: "0001037389", style: "量化 / 多因子" },
  { id: "ark", name: "ARK Investment Management", lead: "Cathie Wood", cik: "0001697748", style: "創新成長" },
  { id: "coatue", name: "Coatue Management", lead: "Philippe Laffont", cik: "0001135730", style: "科技成長" },
  { id: "tiger", name: "Tiger Global", lead: "Chase Coleman", cik: "0001167483", style: "網路 / 成長" },
  { id: "duquesne", name: "Duquesne Family Office", lead: "Stanley Druckenmiller", cik: "0001536411", style: "宏觀 / 成長" },
  { id: "soros", name: "Soros Fund Management", lead: "George Soros legacy", cik: "0001029160", style: "宏觀 / 事件" },
  { id: "baupost", name: "Baupost Group", lead: "Seth Klarman", cik: "0001061768", style: "深度價值" },
  { id: "greenlight", name: "Greenlight Capital", lead: "David Einhorn", cik: "0001079114", style: "價值 / 空頭研究" },
  { id: "lonepine", name: "Lone Pine Capital", lead: "Stephen Mandel legacy", cik: "0001061165", style: "品質成長" },
  { id: "viking", name: "Viking Global", lead: "Andreas Halvorsen", cik: "0001103804", style: "多空 / 成長" },
  { id: "thirdpoint", name: "Third Point", lead: "Dan Loeb", cik: "0001040273", style: "事件驅動" },
  { id: "d1", name: "D1 Capital Partners", lead: "Dan Sundheim", cik: "0001747057", style: "成長 / 私募交叉" },
  { id: "point72", name: "Point72 Asset Management", lead: "Steve Cohen", cik: "0001603466", style: "多策略" },
  { id: "citadel", name: "Citadel Advisors", lead: "Ken Griffin", cik: "0001423053", style: "多策略 / 做市" },
  { id: "millennium", name: "Millennium Management", lead: "Israel Englander", cik: "0001273087", style: "多經理人" },
];

export const INSIDER_COMPANIES = [
  { ticker: "NVDA", name: "NVIDIA", cik: "0001045810", theme: "AI GPU" },
  { ticker: "TSLA", name: "Tesla", cik: "0001318605", theme: "EV / AI" },
  { ticker: "AAPL", name: "Apple", cik: "0000320193", theme: "消費電子" },
  { ticker: "MSFT", name: "Microsoft", cik: "0000789019", theme: "AI cloud" },
  { ticker: "META", name: "Meta", cik: "0001326801", theme: "AI ads" },
  { ticker: "GOOGL", name: "Alphabet", cik: "0001652044", theme: "Search / AI" },
  { ticker: "AMD", name: "AMD", cik: "0000002488", theme: "AI GPU / CPU" },
  { ticker: "AVGO", name: "Broadcom", cik: "0001730168", theme: "ASIC / 網通" },
  { ticker: "PLTR", name: "Palantir", cik: "0001321655", theme: "AI software" },
  { ticker: "SMCI", name: "Super Micro", cik: "0001375365", theme: "AI server" },
  { ticker: "AMZN", name: "Amazon", cik: "0001018724", theme: "Cloud / retail" },
  { ticker: "NFLX", name: "Netflix", cik: "0001065280", theme: "Streaming" },
  { ticker: "ORCL", name: "Oracle", cik: "0001341439", theme: "Cloud infra" },
  { ticker: "CRM", name: "Salesforce", cik: "0001108524", theme: "Enterprise AI" },
  { ticker: "ARM", name: "Arm", cik: "0001973239", theme: "CPU IP" },
  { ticker: "ASML", name: "ASML", cik: "0000937966", theme: "半導體設備" },
  { ticker: "MU", name: "Micron", cik: "0000723125", theme: "Memory" },
  { ticker: "INTC", name: "Intel", cik: "0000050863", theme: "Foundry / CPU" },
  { ticker: "COIN", name: "Coinbase", cik: "0001679788", theme: "Crypto" },
  { ticker: "MSTR", name: "MicroStrategy", cik: "0001050446", theme: "Bitcoin proxy" },
];

const ACTIVIST_FORMS = ["SC 13D", "SC 13D/A", "SC 13G", "SC 13G/A"];

const STRATEGIC_TERMS = [
  { match: "NVIDIA", ticker: "NVDA", theme: "AI 加速器", weight: 1.2 },
  { match: "TAIWAN SEMICONDUCTOR", ticker: "TSM", theme: "台積電 ADR", weight: 1.15 },
  { match: "ADVANCED MICRO", ticker: "AMD", theme: "AI GPU / CPU", weight: 1 },
  { match: "BROADCOM", ticker: "AVGO", theme: "ASIC / 網通", weight: 1 },
  { match: "MICRON", ticker: "MU", theme: "記憶體", weight: 0.95 },
  { match: "ASML", ticker: "ASML", theme: "設備", weight: 0.95 },
  { match: "ARM", ticker: "ARM", theme: "CPU IP", weight: 0.9 },
  { match: "APPLE", ticker: "AAPL", theme: "大型科技", weight: 0.85 },
  { match: "MICROSOFT", ticker: "MSFT", theme: "AI cloud", weight: 0.85 },
  { match: "ALPHABET", ticker: "GOOGL", theme: "AI platform", weight: 0.8 },
  { match: "META", ticker: "META", theme: "AI ads", weight: 0.8 },
  { match: "PALANTIR", ticker: "PLTR", theme: "AI software", weight: 0.85 },
];

const cache = new Map();
let nextSecRequestAt = 0;

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

function padCik(cik) {
  return String(cik).replace(/\D/g, "").padStart(10, "0");
}

function archiveCik(cik) {
  return String(Number(String(cik).replace(/\D/g, "")));
}

function accessionPath(accessionNumber) {
  return accessionNumber.replaceAll("-", "");
}

function filingBaseUrl(cik, accessionNumber) {
  return `${SEC_BASE}/Archives/edgar/data/${archiveCik(cik)}/${accessionPath(accessionNumber)}`;
}

function filingIndexUrl(cik, accessionNumber) {
  return `${filingBaseUrl(cik, accessionNumber)}-index.html`;
}

function stripTags(text = "") {
  return decodeXml(text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function decodeXml(value = "") {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .trim();
}

function tagValue(text, tag) {
  const match = String(text).match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripTags(match[1]) : null;
}

function nestedValue(text, wrapperTag) {
  const block = String(text).match(new RegExp(`<${wrapperTag}[^>]*>([\\s\\S]*?)<\\/${wrapperTag}>`, "i"))?.[1];
  return block ? tagValue(block, "value") : null;
}

function boolTag(text, tag) {
  return tagValue(text, tag) === "true";
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sortTime(value) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function transactionSortValue(transaction = {}) {
  return sortTime(transaction.acceptanceDateTime)
    || sortTime(transaction.filingDate)
    || sortTime(transaction.transactionDate);
}

function compareTransactionsByTime(a = {}, b = {}) {
  const timeDiff = transactionSortValue(b) - transactionSortValue(a);
  if (timeDiff) return timeDiff;
  const tradeDateDiff = sortTime(b.transactionDate) - sortTime(a.transactionDate);
  if (tradeDateDiff) return tradeDateDiff;
  const accessionDiff = String(b.accessionNumber || "").localeCompare(String(a.accessionNumber || ""));
  if (accessionDiff) return accessionDiff;
  const scoreDiff = (b.score || 0) - (a.score || 0);
  if (scoreDiff) return scoreDiff;
  return (b.value || 0) - (a.value || 0);
}

function pct(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

async function fetchText(url, label, accept = "application/json,text/plain,*/*") {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await waitForSecSlot();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SEC_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept,
          "user-agent": SEC_USER_AGENT,
        },
      });
      if (response.ok) return await response.text();
      if (response.status === 429 || response.status === 403) {
        await sleep(900 * (attempt + 1) ** 2);
        continue;
      }
      throw new Error(`${label} HTTP ${response.status}`);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`${label} HTTP 429 after retries`);
}

async function waitForSecSlot() {
  const now = Date.now();
  const waitMs = Math.max(0, nextSecRequestAt - now);
  nextSecRequestAt = Math.max(now, nextSecRequestAt) + SEC_MIN_INTERVAL_MS;
  if (waitMs > 0) await sleep(waitMs);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, label) {
  const text = await fetchText(url, label, "application/json");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} returned non-JSON`);
  }
}

async function fetchSubmissions(cik) {
  return cached(`submissions:${padCik(cik)}`, SEC_CACHE_TTL_MS, () =>
    fetchJson(`${SEC_DATA_BASE}/submissions/CIK${padCik(cik)}.json`, `SEC submissions ${cik}`),
  );
}

async function fetchFilingIndex(cik, accessionNumber) {
  return cached(`index:${cik}:${accessionNumber}`, SEC_CACHE_TTL_MS, () =>
    fetchJson(`${filingBaseUrl(cik, accessionNumber)}/index.json`, `SEC filing index ${accessionNumber}`),
  );
}

function filingRows(submissions) {
  const recent = submissions?.filings?.recent || {};
  const forms = recent.form || [];
  return forms.map((form, index) => ({
    form,
    accessionNumber: recent.accessionNumber?.[index],
    filingDate: recent.filingDate?.[index],
    acceptanceDateTime: recent.acceptanceDateTime?.[index],
    reportDate: recent.reportDate?.[index],
    primaryDocument: recent.primaryDocument?.[index],
    primaryDocDescription: recent.primaryDocDescription?.[index],
  }));
}

function findFilings(submissions, forms, limit = 5) {
  const accepted = new Set(forms);
  return filingRows(submissions)
    .filter((row) => accepted.has(row.form))
    .sort((a, b) => {
      const timeDiff = sortTime(b.acceptanceDateTime) - sortTime(a.acceptanceDateTime);
      if (timeDiff) return timeDiff;
      const filingDateDiff = sortTime(b.filingDate) - sortTime(a.filingDate);
      if (filingDateDiff) return filingDateDiff;
      return String(b.accessionNumber || "").localeCompare(String(a.accessionNumber || ""));
    })
    .slice(0, limit);
}

async function getXmlFileFromIndex(cik, filing, preferred) {
  const index = await fetchFilingIndex(cik, filing.accessionNumber);
  const items = index?.directory?.item || [];
  if (preferred === "13f") {
    const xml = items.find((item) => item.name.endsWith(".xml") && !item.name.includes("primary_doc"));
    if (xml) return xml.name;
  }
  if (preferred === "form4") {
    const xml = items.find((item) => item.name === "form4.xml") || items.find((item) => item.name.endsWith(".xml"));
    if (xml) return xml.name;
  }
  return filing.primaryDocument?.split("/").pop();
}

function parseInfoTable(xmlText) {
  const blocks = [...String(xmlText).matchAll(/<infoTable>([\s\S]*?)<\/infoTable>/gi)].map((match) => match[1]);
  return blocks
    .map((block) => {
      const issuer = tagValue(block, "nameOfIssuer");
      const cusip = tagValue(block, "cusip");
      const value = toNumber(tagValue(block, "value"));
      const shares = toNumber(tagValue(block, "sshPrnamt"));
      const putCall = tagValue(block, "putCall") || "";
      const strategic = STRATEGIC_TERMS.find((term) => issuer?.toUpperCase().includes(term.match));
      return {
        issuer,
        ticker: strategic?.ticker || null,
        theme: strategic?.theme || null,
        strategicWeight: strategic?.weight || 0.5,
        classTitle: tagValue(block, "titleOfClass"),
        cusip,
        value,
        shares,
        putCall,
        shareType: tagValue(block, "sshPrnamtType"),
      };
    })
    .filter((holding) => holding.issuer && Number.isFinite(holding.value));
}

function aggregateHoldings(holdings) {
  const map = new Map();
  for (const holding of holdings) {
    const key = `${holding.cusip}:${holding.putCall || ""}`;
    const current = map.get(key) || { ...holding, value: 0, shares: 0 };
    current.value += holding.value || 0;
    current.shares += holding.shares || 0;
    if (!current.ticker && holding.ticker) current.ticker = holding.ticker;
    if (!current.theme && holding.theme) current.theme = holding.theme;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => (b.value || 0) - (a.value || 0));
}

function compareHoldings(current, previous) {
  const currentMap = new Map(current.map((holding) => [`${holding.cusip}:${holding.putCall || ""}`, holding]));
  const previousMap = new Map(previous.map((holding) => [`${holding.cusip}:${holding.putCall || ""}`, holding]));
  const keys = new Set([...currentMap.keys(), ...previousMap.keys()]);
  return [...keys]
    .map((key) => {
      const now = currentMap.get(key);
      const before = previousMap.get(key);
      const value = now?.value || 0;
      const previousValue = before?.value || 0;
      const shares = now?.shares || 0;
      const previousShares = before?.shares || 0;
      const base = now || before;
      const deltaValue = value - previousValue;
      const deltaShares = shares - previousShares;
      const status = !before ? "NEW" : !now ? "CLOSED" : deltaShares > 0 ? "INCREASED" : deltaShares < 0 ? "DECREASED" : "UNCHANGED";
      return {
        issuer: base.issuer,
        ticker: base.ticker,
        theme: base.theme,
        cusip: base.cusip,
        putCall: base.putCall || "",
        status,
        value,
        previousValue,
        deltaValue,
        shares,
        previousShares,
        deltaShares,
        percentChange: pct(shares, previousShares),
      };
    })
    .filter((row) => row.status !== "UNCHANGED")
    .sort((a, b) => Math.abs(b.deltaValue || b.value || b.previousValue) - Math.abs(a.deltaValue || a.value || a.previousValue));
}

async function fetch13fReport(manager) {
  try {
    const submissions = await fetchSubmissions(manager.cik);
    const filings = findFilings(submissions, ["13F-HR", "13F-HR/A"], 3);
    if (!filings.length) throw new Error("No recent 13F-HR filing");
    const [latest, previous] = filings;
    const latestXmlName = await getXmlFileFromIndex(manager.cik, latest, "13f");
    if (!latestXmlName) throw new Error("13F information table XML missing");
    const latestXml = await fetchText(`${filingBaseUrl(manager.cik, latest.accessionNumber)}/${latestXmlName}`, `13F ${manager.name}`, "application/xml,text/plain,*/*");
    const latestHoldings = aggregateHoldings(parseInfoTable(latestXml));
    let previousHoldings = [];
    if (previous) {
      const previousXmlName = await getXmlFileFromIndex(manager.cik, previous, "13f");
      if (previousXmlName) {
        const previousXml = await fetchText(`${filingBaseUrl(manager.cik, previous.accessionNumber)}/${previousXmlName}`, `13F previous ${manager.name}`, "application/xml,text/plain,*/*");
        previousHoldings = aggregateHoldings(parseInfoTable(previousXml));
      }
    }
    const totalValue = latestHoldings.reduce((sum, holding) => sum + (holding.value || 0), 0);
    const strategicHoldings = latestHoldings.filter((holding) => holding.ticker).slice(0, 8);
    return {
      ...manager,
      status: "ok",
      filingDate: latest.filingDate,
      acceptanceDateTime: latest.acceptanceDateTime,
      reportDate: latest.reportDate,
      accessionNumber: latest.accessionNumber,
      filingUrl: `${filingBaseUrl(manager.cik, latest.accessionNumber)}/${latestXmlName}`,
      sourceForm: latest.form,
      sourceLabel: "SEC 13F 持倉申報",
      totalValue,
      holdingCount: latestHoldings.length,
      topHoldings: latestHoldings.slice(0, 8),
      strategicHoldings,
      changes: compareHoldings(latestHoldings, previousHoldings).slice(0, 10),
    };
  } catch (error) {
    return {
      ...manager,
      status: "error",
      error: error.message,
      totalValue: 0,
      holdingCount: 0,
      topHoldings: [],
      strategicHoldings: [],
      changes: [],
    };
  }
}

function ownerTitle(documentText) {
  const relationship = String(documentText).match(/<reportingOwnerRelationship>([\s\S]*?)<\/reportingOwnerRelationship>/i)?.[1] || "";
  const title = tagValue(relationship, "officerTitle");
  const labels = [];
  if (title) labels.push(title);
  if (boolTag(relationship, "isDirector")) labels.push("Director");
  if (boolTag(relationship, "isTenPercentOwner")) labels.push("10% Owner");
  if (boolTag(relationship, "isOther")) labels.push("Other");
  return labels.length ? [...new Set(labels)].join(" / ") : "Insider";
}

function actionFromCode(code, acquiredDisposed) {
  const table = {
    P: "公開市場買進",
    S: "公開市場賣出",
    A: "公司授予 / 獎酬",
    D: "交還公司 / 處分",
    F: "稅務扣繳",
    M: "選擇權行使",
    G: "贈與",
    V: "自願揭露交易",
  };
  if (table[code]) return table[code];
  if (acquiredDisposed === "A") return "取得";
  if (acquiredDisposed === "D") return "處分";
  return "其他";
}

function scoreTransaction(transaction, title, hasPlan) {
  const value = transaction.value || 0;
  const magnitude = Math.min(18, Math.log10(Math.max(value, 1)) * 2.6);
  const titleText = title.toLowerCase();
  const titleBoost = titleText.includes("chief executive") || titleText.includes("ceo")
    ? 10
    : titleText.includes("chief financial") || titleText.includes("cfo")
      ? 8
      : titleText.includes("chief technology") || titleText.includes("cto")
        ? 8
        : titleText.includes("director")
          ? 4
          : 2;
  let base = 50;
  if (transaction.code === "P") base = 68;
  if (transaction.code === "S") base = hasPlan ? 34 : 40;
  if (transaction.code === "F") base = 48;
  if (transaction.code === "M") base = 46;
  if (transaction.code === "A") base = 44;
  const direction = transaction.code === "P" ? 1 : transaction.code === "S" ? -0.55 : 0.15;
  return round(Math.max(0, Math.min(100, base + magnitude * direction + titleBoost)), 1);
}

function parseForm4(xmlText, filing, company) {
  const issuerSymbol = tagValue(xmlText, "issuerTradingSymbol") || company.ticker;
  const issuerName = tagValue(xmlText, "issuerName") || company.name;
  const ownerName = tagValue(xmlText, "rptOwnerName") || "Unknown insider";
  const title = ownerTitle(xmlText);
  const hasPlan = tagValue(xmlText, "aff10b5One") === "true" || /10b5-1/i.test(xmlText);
  const transactionBlocks = [...String(xmlText).matchAll(/<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/gi)].map((match) => match[1]);
  const transactions = transactionBlocks.map((block) => {
    const shares = toNumber(nestedValue(block, "transactionShares"));
    const price = toNumber(nestedValue(block, "transactionPricePerShare"));
    const code = tagValue(block, "transactionCode");
    const acquiredDisposed = nestedValue(block, "transactionAcquiredDisposedCode");
    const transaction = {
      ticker: issuerSymbol,
      issuerName,
      ownerName,
      title,
      code,
      action: actionFromCode(code, acquiredDisposed),
      acquiredDisposed,
      transactionDate: nestedValue(block, "transactionDate"),
      filingDate: filing.filingDate,
      acceptanceDateTime: filing.acceptanceDateTime,
      sourceForm: filing.form,
      sourceLabel: "SEC Form 4 內部人申報",
      shares,
      price,
      value: Number.isFinite(shares) && Number.isFinite(price) ? shares * price : null,
      sharesOwnedAfter: toNumber(nestedValue(block, "sharesOwnedFollowingTransaction")),
      hasPlan,
      accessionNumber: filing.accessionNumber,
      filingUrl: `${filingBaseUrl(company.cik, filing.accessionNumber)}/form4.xml`,
      companyTheme: company.theme,
    };
    return {
      ...transaction,
      score: scoreTransaction(transaction, title, hasPlan),
    };
  });
  return transactions.filter((transaction) => transaction.code || transaction.shares || transaction.price);
}

async function fetchCompanyInsiderTransactions(company) {
  try {
    const submissions = await fetchSubmissions(company.cik);
    const filings = findFilings(submissions, ["4", "4/A"], 3);
    const activistFilings = findFilings(submissions, ACTIVIST_FORMS, 2);
    const transactions = [];
    for (const filing of filings) {
      const xmlName = await getXmlFileFromIndex(company.cik, filing, "form4");
      if (!xmlName) continue;
      const xml = await fetchText(`${filingBaseUrl(company.cik, filing.accessionNumber)}/${xmlName}`, `Form 4 ${company.ticker}`, "application/xml,text/plain,*/*");
      transactions.push(...parseForm4(xml, filing, company));
    }
    const latestActivist = activistFilings[0];
    const activist = latestActivist
      ? {
          status: "ok",
          form: latestActivist.form,
          filingDate: latestActivist.filingDate,
          reportDate: latestActivist.reportDate,
          accessionNumber: latestActivist.accessionNumber,
          filingUrl: filingIndexUrl(company.cik, latestActivist.accessionNumber),
          sourceForm: latestActivist.form,
          sourceLabel: latestActivist.form.startsWith("SC 13D") ? "SEC Schedule 13D" : "SEC Schedule 13G",
        }
      : { status: "none" };
    return {
      ...company,
      status: "ok",
      transactionCount: transactions.length,
      transactions,
      activist,
    };
  } catch (error) {
    return {
      ...company,
      status: "error",
      error: error.message,
      transactionCount: 0,
      transactions: [],
      activist: { status: "error", error: error.message },
    };
  }
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

function normalizeDateOnly(value) {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calendarDaysBetween(startValue, endValue = new Date()) {
  const start = normalizeDateOnly(startValue);
  const end = normalizeDateOnly(endValue);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function businessDaysBetween(startValue, endValue = new Date()) {
  const start = normalizeDateOnly(startValue);
  const end = normalizeDateOnly(endValue);
  if (!start || !end) return null;
  if (start > end) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

function addDays(dateValue, days) {
  const date = normalizeDateOnly(dateValue);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function nextForm13fDeadline(now = new Date()) {
  const today = normalizeDateOnly(now);
  if (!today) return { deadline: null, quarter: null, daysUntil: null, reportDate: null };
  const candidates = [];
  for (const year of [today.getUTCFullYear() - 1, today.getUTCFullYear(), today.getUTCFullYear() + 1]) {
    for (const [quarter, month, day, reportMonth, reportDay] of [
      ["1Q", 3, 31, 5, 15],
      ["2Q", 6, 30, 8, 14],
      ["3Q", 9, 30, 11, 14],
      ["4Q", 12, 31, 2, 14],
    ]) {
      const quarterEnd = new Date(Date.UTC(year, month - 1, day));
      const deadline = addDays(quarterEnd, 45);
      if (month === 12) deadline.setUTCFullYear(year + 1);
      if (deadline?.getUTCDay() === 6) deadline.setUTCDate(deadline.getUTCDate() + 2);
      else if (deadline?.getUTCDay() === 0) deadline.setUTCDate(deadline.getUTCDate() + 1);
      const reportYear = month === 12 ? year : year;
      candidates.push({
        quarter,
        reportDate: `${reportYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        deadline,
      });
    }
  }
  const next = candidates
    .filter((candidate) => candidate.deadline && candidate.deadline >= today)
    .sort((a, b) => a.deadline - b.deadline)[0];
  if (!next) return { deadline: null, quarter: null, daysUntil: null, reportDate: null };
  return {
    quarter: next.quarter,
    reportDate: next.reportDate,
    deadline: next.deadline.toISOString().slice(0, 10),
    daysUntil: calendarDaysBetween(today, next.deadline),
  };
}

function buildAlerts(funds, companies, transactions) {
  const alerts = [];
  for (const transaction of transactions) {
    if (transaction.code === "P" && transaction.score >= 82) {
      alerts.push({
        id: `insider-${transaction.accessionNumber}-${transaction.ownerName}`,
        type: "insider-buy",
        severity: "high",
        title: `${transaction.ticker} 高品質內部人買進`,
        body: `${transaction.ownerName} (${transaction.title}) 買進約 $${Math.round(transaction.value || 0).toLocaleString("en-US")}，Form 4 分數 ${transaction.score}。`,
        score: transaction.score,
        filingUrl: transaction.filingUrl,
        filingDate: transaction.filingDate,
        transactionDate: transaction.transactionDate,
        sourceLabel: transaction.sourceLabel || "SEC Form 4 內部人申報",
        sourceForm: transaction.sourceForm || "4",
      });
    }
    if (transaction.code === "S" && transaction.score <= 35 && !transaction.hasPlan) {
      alerts.push({
        id: `insider-sale-${transaction.accessionNumber}-${transaction.ownerName}`,
        type: "insider-sale",
        severity: "medium",
        title: `${transaction.ticker} 非計畫型賣出需觀察`,
        body: `${transaction.ownerName} (${transaction.title}) 賣出，未偵測到 10b5-1 標記。`,
        score: transaction.score,
        filingUrl: transaction.filingUrl,
        filingDate: transaction.filingDate,
        transactionDate: transaction.transactionDate,
        sourceLabel: transaction.sourceLabel || "SEC Form 4 內部人申報",
        sourceForm: transaction.sourceForm || "4",
      });
    }
  }

  for (const fund of funds) {
    for (const change of fund.changes.slice(0, 5)) {
      if (change.ticker && ["NEW", "INCREASED"].includes(change.status)) {
        alerts.push({
          id: `fund-${fund.id}-${change.cusip}-${change.status}`,
          type: "fund-flow",
          severity: change.status === "NEW" ? "high" : "medium",
          title: `${fund.name} ${change.status === "NEW" ? "新進" : "加碼"} ${change.ticker}`,
          body: `${change.issuer} 變動約 $${Math.abs(Math.round(change.deltaValue || change.value || 0)).toLocaleString("en-US")}，主題：${change.theme}。`,
          score: change.status === "NEW" ? 78 : 68,
          filingUrl: fund.filingUrl,
          filingDate: fund.filingDate,
          reportDate: fund.reportDate,
          sourceLabel: fund.sourceLabel || "SEC 13F 持倉申報",
          sourceForm: fund.sourceForm || "13F-HR",
        });
      }
    }
  }

  for (const company of companies) {
    const activist = company.activist;
    if (activist?.status !== "ok") continue;
    if (activist.form?.startsWith("SC 13D")) {
      alerts.push({
        id: `activist-13d-${company.cik}-${activist.accessionNumber}`,
        type: "activist-stake",
        severity: "high",
        title: `${company.ticker} 新 13D 持股申報`,
        body: `${company.name} 出現 13D，代表持股與意圖需要優先關注。`,
        score: 86,
        filingUrl: activist.filingUrl,
        filingDate: activist.filingDate,
        reportDate: activist.reportDate,
        sourceLabel: activist.sourceLabel || "SEC Schedule 13D",
        sourceForm: activist.sourceForm || "SC 13D",
      });
    } else if (activist.form?.startsWith("SC 13G")) {
      alerts.push({
        id: `activist-13g-${company.cik}-${activist.accessionNumber}`,
        type: "activist-stake",
        severity: "medium",
        title: `${company.ticker} 13G 持股更新`,
        body: `${company.name} 出現 13G，屬於較被動的 5%+ 持股揭露。`,
        score: 72,
        filingUrl: activist.filingUrl,
        filingDate: activist.filingDate,
        reportDate: activist.reportDate,
        sourceLabel: activist.sourceLabel || "SEC Schedule 13G",
        sourceForm: activist.sourceForm || "SC 13G",
      });
    }
  }

  return alerts.sort((a, b) => b.score - a.score).slice(0, 12);
}

function summarizeSmartMoney(funds, companies, transactions, alerts) {
  const okFunds = funds.filter((fund) => fund.status === "ok");
  const okCompanies = companies.filter((company) => company.status === "ok");
  const okActivists = companies.filter((company) => company.activist?.status === "ok");
  const openMarketBuys = transactions.filter((tx) => tx.code === "P");
  const openMarketSales = transactions.filter((tx) => tx.code === "S");
  const latestFundDate = okFunds.map((fund) => fund.filingDate).filter(Boolean).sort().at(-1) || null;
  const latestForm4Date = transactions.map((tx) => tx.filingDate).filter(Boolean).sort().at(-1) || null;
  const latestActivistDate = okActivists.map((company) => company.activist?.filingDate).filter(Boolean).sort().at(-1) || null;
  const now = new Date();
  const latestFundAgeDays = calendarDaysBetween(latestFundDate, now);
  const latestForm4AgeDays = calendarDaysBetween(latestForm4Date, now);
  const latestForm4AgeBusinessDays = businessDaysBetween(latestForm4Date, now);
  const latestActivistAgeDays = calendarDaysBetween(latestActivistDate, now);
  const next13fDeadline = nextForm13fDeadline(now);
  const freshnessStatus = Number.isFinite(latestForm4AgeBusinessDays) && latestForm4AgeBusinessDays > 2 ? "warning" : next13fDeadline.daysUntil !== null && next13fDeadline.daysUntil <= 7 ? "warning" : "pass";
  const freshnessLabel = freshnessStatus === "warning" ? "需注意" : "正常";
  const freshnessNoteParts = [];
  if (Number.isFinite(latestForm4AgeBusinessDays)) {
    freshnessNoteParts.push(`最新 Form 4 約 ${latestForm4AgeBusinessDays} 個工作天前`);
  }
  if (Number.isFinite(latestFundAgeDays)) {
    freshnessNoteParts.push(`最新 13F 約 ${latestFundAgeDays} 天前`);
  }
  if (Number.isFinite(latestActivistAgeDays)) {
    freshnessNoteParts.push(`最新 13D/G 約 ${latestActivistAgeDays} 天前`);
  }
  if (next13fDeadline.deadline) {
    freshnessNoteParts.push(`下一個 13F 截止 ${next13fDeadline.deadline}（${next13fDeadline.daysUntil} 天）`);
  }
  return {
    status: okFunds.length >= 8 && okCompanies.length >= 10 ? "pass" : okFunds.length >= 4 || okCompanies.length >= 6 ? "warning" : "fail",
    trackedFunds: GURU_MANAGERS.length,
    parsedFunds: okFunds.length,
    trackedCompanies: INSIDER_COMPANIES.length,
    parsedCompanies: okCompanies.length,
    trackedActivists: INSIDER_COMPANIES.length,
    parsedActivists: okActivists.length,
    transactionCount: transactions.length,
    openMarketBuys: openMarketBuys.length,
    openMarketSales: openMarketSales.length,
    alertCount: alerts.length,
    latestFundDate,
    latestForm4Date,
    latestActivistDate,
    latestFundAgeDays,
    latestForm4AgeDays,
    latestForm4AgeBusinessDays,
    latestActivistAgeDays,
    freshness: {
      status: freshnessStatus,
      label: freshnessLabel,
      note: freshnessNoteParts.join("｜") || "SEC 新鮮度資料不足",
      next13fDeadline: next13fDeadline.deadline,
      next13fDeadlineDays: next13fDeadline.daysUntil,
      next13fReportDate: next13fDeadline.reportDate,
      next13fQuarter: next13fDeadline.quarter,
    },
    checkedAt: new Date().toISOString(),
    note: "13F 為季度延遲資料；Form 4 較接近即時，但需解讀交易代碼與 10b5-1。",
  };
}

function readDiskSmartMoney(filePath, maxAgeMs) {
  if (!fs.existsSync(filePath)) return null;
  const stat = fs.statSync(filePath);
  if (Date.now() - stat.mtimeMs > maxAgeMs) return null;
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const smartMoney = parsed?.smartMoney || parsed;
  if (!smartMoney?.summary?.status) return null;
  return {
    ...smartMoney,
    summary: {
      ...smartMoney.summary,
      cacheMode: "disk",
      cachePath: filePath,
    },
  };
}

function latestDiskSmartMoney(maxAgeMs = 12 * 60 * 60_000) {
  try {
    const publicData = readDiskSmartMoney(path.resolve(rootDir, "public", "data", "smart-money.json"), maxAgeMs);
    if (publicData) return publicData;
    const outboxDir = path.resolve(rootDir, "outbox");
    const dates = fs
      .readdirSync(outboxDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .reverse();
    for (const date of dates) {
      const filePath = path.resolve(outboxDir, date, "us_market_radar.json");
      const smartMoney = readDiskSmartMoney(filePath, maxAgeMs);
      if (smartMoney) return smartMoney;
    }
  } catch {
    return null;
  }
  return null;
}

export async function fetchSmartMoney(options = {}) {
  if (options.preferDisk) {
    const disk = latestDiskSmartMoney();
    if (disk) return disk;
  }
  return cached("smart-money:v1", SEC_CACHE_TTL_MS, async () => {
    const funds = await mapLimited(GURU_MANAGERS, 2, fetch13fReport);
    const companies = await mapLimited(INSIDER_COMPANIES, 2, fetchCompanyInsiderTransactions);
    const transactions = companies
      .flatMap((company) => company.transactions)
      .sort(compareTransactionsByTime)
      .slice(0, 80);
    const alerts = buildAlerts(funds, companies, transactions);
    return {
      generatedAt: new Date().toISOString(),
      summary: summarizeSmartMoney(funds, companies, transactions, alerts),
      funds: funds.sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0)),
      companies,
      transactions,
      alerts,
      sources: [
        {
          label: "SEC submissions API",
          url: "https://www.sec.gov/search-filings/edgar-application-programming-interfaces",
        },
        {
          label: "SEC Form 13F FAQ",
          url: "https://www.sec.gov/rules-regulations/staff-guidance/division-investment-management-frequently-asked-questions/frequently-asked-questions-about-form-13f",
        },
        {
          label: "SEC Forms 3/4/5 bulletin",
          url: "https://www.sec.gov/files/forms-3-4-5.pdf",
        },
      ],
    };
  });
}

export {
  parseForm4,
  parseInfoTable,
  compareHoldings,
  compareTransactionsByTime,
  findFilings,
  scoreTransaction,
  businessDaysBetween,
  calendarDaysBetween,
  nextForm13fDeadline,
};
