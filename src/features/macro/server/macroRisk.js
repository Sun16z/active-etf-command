import { clamp, round, weightedAverage } from "../../market/server/marketData.js";

const SEC_BASE = "https://www.sec.gov";
const SEC_DATA_BASE = "https://data.sec.gov";
const BERKSHIRE_CIK = "0001067983";
const REQUEST_TIMEOUT_MS = Number(process.env.MACRO_RISK_TIMEOUT_MS || 15_000);
const MACRO_CACHE_TTL_MS = Number(process.env.MACRO_RISK_CACHE_TTL_MS || 6 * 60 * 60_000);
const SEC_USER_AGENT =
  process.env.SEC_USER_AGENT || "us-market-radar/0.1 local research justin@example.invalid";

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

function macroRiskLabel(score) {
  if (!Number.isFinite(score)) return { label: "資料不足", tone: "neutral", meaning: "資料不足" };
  if (score >= 75) return { label: "高壓力", tone: "strong-down", meaning: "宏觀壓力或大資金防守很強" };
  if (score >= 60) return { label: "警戒", tone: "down", meaning: "壓力升溫，需要降低追高衝動" };
  if (score >= 40) return { label: "觀察", tone: "neutral", meaning: "中性觀察" };
  return { label: "低壓力", tone: "up", meaning: "壓力尚低" };
}

function formatTrillion(value) {
  if (!Number.isFinite(value)) return "NA";
  return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
}

function formatBillion(value) {
  if (!Number.isFinite(value)) return "NA";
  return `$${(value / 1_000_000_000).toFixed(1)}B`;
}

function number(value) {
  if (value === null || value === undefined || value === ".") return null;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function stripHtml(html = "") {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#160;|&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url, label, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json,text/plain,*/*",
        "user-agent": "us-market-radar/0.1",
        ...headers,
      },
    });
    if (!response.ok) throw new Error(`${label} HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, label, headers = {}) {
  const text = await fetchText(url, label, headers);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} returned non-JSON`);
  }
}

function archiveCik(cik) {
  return String(Number(String(cik).replace(/\D/g, "")));
}

function accessionPath(accessionNumber) {
  return accessionNumber.replaceAll("-", "");
}

function filingRows(submissions) {
  const recent = submissions?.filings?.recent || {};
  const forms = recent.form || [];
  return forms.map((form, index) => ({
    form,
    accessionNumber: recent.accessionNumber?.[index],
    filingDate: recent.filingDate?.[index],
    reportDate: recent.reportDate?.[index],
    primaryDocument: recent.primaryDocument?.[index],
  }));
}

async function fetchLatestBerkshireCash() {
  const submissions = await fetchJson(`${SEC_DATA_BASE}/submissions/CIK${BERKSHIRE_CIK}.json`, "Berkshire SEC submissions", {
    "user-agent": SEC_USER_AGENT,
  });
  const filing = filingRows(submissions).find((row) => ["10-Q", "10-K"].includes(row.form));
  if (!filing?.accessionNumber || !filing.primaryDocument) throw new Error("Berkshire latest 10-Q/10-K missing");
  const filingUrl = `${SEC_BASE}/Archives/edgar/data/${archiveCik(BERKSHIRE_CIK)}/${accessionPath(filing.accessionNumber)}/${filing.primaryDocument}`;
  const text = stripHtml(await fetchText(filingUrl, "Berkshire latest filing", { "user-agent": SEC_USER_AGENT }));

  const cashData = parseBerkshireCashText(text);
  const { cash, treasuryBills, total, previousTotal } = cashData;
  const delta = total - previousTotal;
  const score = clamp(35 + ((total / 1_000_000_000) - 150) * 0.12 + Math.max(0, delta / 1_000_000_000) * 0.5);
  const label = macroRiskLabel(score);

  return {
    id: "berkshire-cash",
    name: "巴菲特現金水位",
    category: "大資金防守",
    value: `${formatBillion(total)}，較前期 ${delta >= 0 ? "+" : ""}${formatBillion(delta)}`,
    score: round(score, 1),
    label: label.label,
    tone: label.tone,
    meaning: label.meaning,
    asOf: filing.reportDate,
    checkedAt: new Date().toISOString(),
    cadence: "季度申報；系統每日檢查 SEC 新檔",
    sourceLabel: `SEC Berkshire Hathaway ${filing.form}`,
    sourceUrl: filingUrl,
    explain: "Berkshire 現金與短期美國國庫券水位偏高，代表長線資金保持防守與等待可部署機會。",
    components: [
      { label: "現金及約當現金", value: formatBillion(cash) },
      { label: "短期美國國庫券", value: formatBillion(treasuryBills) },
    ],
  };
}

function parseBerkshireCashText(text) {
  const clean = stripHtml(text);
  const cashMatch = clean.match(/Cash and cash equivalents\*?\s*\$?\s*([\d,]+)\s+\$?\s*([\d,]+)/i);
  const billsMatch = clean.match(/Short-term investments in U\.S\. Treasury Bills\*+\s*\$?\s*([\d,]+)\s+\$?\s*([\d,]+)/i);
  if (!cashMatch || !billsMatch) throw new Error("Berkshire cash table not found");
  const cash = number(cashMatch[1]) * 1_000_000;
  const previousCash = number(cashMatch[2]) * 1_000_000;
  const treasuryBills = number(billsMatch[1]) * 1_000_000;
  const previousTreasuryBills = number(billsMatch[2]) * 1_000_000;
  return {
    cash,
    previousCash,
    treasuryBills,
    previousTreasuryBills,
    total: cash + treasuryBills,
    previousTotal: previousCash + previousTreasuryBills,
  };
}

async function fetchTreasuryDebt() {
  const url = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?fields=record_date,tot_pub_debt_out_amt,debt_held_public_amt,intragov_hold_amt&sort=-record_date&page[size]=35&format=json";
  const json = await fetchJson(url, "Treasury Debt to the Penny");
  const rows = (json.data || []).map((row) => ({
    date: row.record_date,
    total: number(row.tot_pub_debt_out_amt),
    publicDebt: number(row.debt_held_public_amt),
    intragov: number(row.intragov_hold_amt),
  })).filter((row) => Number.isFinite(row.total));
  if (!rows.length) throw new Error("Treasury debt data missing");
  const latest = rows[0];
  const previous = rows.at(-1);
  const change = Number.isFinite(previous?.total) ? latest.total - previous.total : null;
  const totalT = latest.total / 1_000_000_000_000;
  const changeB = Number.isFinite(change) ? change / 1_000_000_000 : 0;
  const score = clamp(38 + Math.max(0, totalT - 33) * 5.2 + Math.max(0, changeB) * 0.08);
  const label = macroRiskLabel(score);
  return {
    id: "us-debt",
    name: "美國國債水位",
    category: "主權債務",
    value: `${formatTrillion(latest.total)}，約 30 交易日變化 ${changeB >= 0 ? "+" : ""}${formatBillion(change || 0)}`,
    score: round(score, 1),
    label: label.label,
    tone: label.tone,
    meaning: label.meaning,
    asOf: latest.date,
    checkedAt: new Date().toISOString(),
    cadence: "每日或交易日更新",
    sourceLabel: "U.S. Treasury FiscalData Debt to the Penny",
    sourceUrl: "https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/debt-to-the-penny",
    explain: "總債務水位與近期增加速度偏高時，利率、財政與市場估值壓力會升高。",
    components: [
      { label: "公眾持有債務", value: formatTrillion(latest.publicDebt) },
      { label: "政府內部持有", value: formatTrillion(latest.intragov) },
    ],
  };
}

function parseFredCsv(text) {
  return String(text)
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [date, raw] = line.split(",");
      return { date, value: number(raw) };
    })
    .filter((row) => row.date && Number.isFinite(row.value));
}

async function fetchFredSeries(series, label) {
  const text = await fetchText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(series)}`, `FRED ${series}`);
  const rows = parseFredCsv(text);
  if (!rows.length) throw new Error(`FRED ${series} empty`);
  return { series, label, rows };
}

function latestChange(rows, periods) {
  const latest = rows.at(-1);
  const previous = rows.at(Math.max(0, rows.length - 1 - periods));
  return {
    latest,
    change: Number.isFinite(previous?.value) ? latest.value - previous.value : null,
  };
}

function creditIndicator({ id, name, category, series, sourceLabel, sourceUrl, rows, scoreFn, valueFn, explain, cadence = "FRED 更新頻率" }) {
  const latest = rows.at(-1);
  const { change: change5 } = latestChange(rows, 5);
  const { change: change20 } = latestChange(rows, 20);
  const score = scoreFn(latest.value, change5, change20);
  const label = macroRiskLabel(score);
  return {
    id,
    name,
    category,
    value: valueFn(latest.value, change5, change20),
    score: round(score, 1),
    label: label.label,
    tone: label.tone,
    meaning: label.meaning,
    asOf: latest.date,
    checkedAt: new Date().toISOString(),
    cadence,
    sourceLabel: `${sourceLabel} (${series})`,
    sourceUrl,
    explain,
  };
}

async function fetchCreditStress() {
  const [hyOas, nfci, stlfsi] = await Promise.all([
    fetchFredSeries("BAMLH0A0HYM2", "High Yield OAS"),
    fetchFredSeries("NFCI", "Chicago Fed NFCI"),
    fetchFredSeries("STLFSI4", "St. Louis Fed Financial Stress Index"),
  ]);

  return [
    creditIndicator({
      id: "hy-oas",
      name: "美國高收益信用利差",
      category: "信貸風險",
      series: hyOas.series,
      sourceLabel: "FRED ICE BofA US High Yield OAS",
      sourceUrl: "https://fred.stlouisfed.org/series/BAMLH0A0HYM2",
      rows: hyOas.rows,
      cadence: "每日，收盤資料",
      scoreFn: (latest, change5, change20) =>
        clamp(18 + Math.max(0, latest - 3) * 16 + Math.max(0, change5 || 0) * 30 + Math.max(0, change20 || 0) * 18),
      valueFn: (latest, change5, change20) => `${latest.toFixed(2)}% / 5期 ${change5 >= 0 ? "+" : ""}${round(change5, 2)} / 20期 ${change20 >= 0 ? "+" : ""}${round(change20, 2)}`,
      explain: "高收益債利差擴大代表市場要求更高違約風險補償，是股市轉弱常見前置信號之一。",
    }),
    creditIndicator({
      id: "nfci",
      name: "芝加哥 Fed 金融條件",
      category: "金融壓力",
      series: nfci.series,
      sourceLabel: "FRED Chicago Fed NFCI",
      sourceUrl: "https://fred.stlouisfed.org/series/NFCI",
      rows: nfci.rows,
      cadence: "每週",
      scoreFn: (latest, change5) => clamp(38 + latest * 45 + Math.max(0, change5 || 0) * 160),
      valueFn: (latest, change5) => `${latest.toFixed(2)} / 5期 ${change5 >= 0 ? "+" : ""}${round(change5, 2)}`,
      explain: "NFCI 高於常態代表金融條件收緊；由負值往上走代表壓力升溫。",
    }),
    creditIndicator({
      id: "stlfsi",
      name: "聖路易 Fed 金融壓力",
      category: "金融壓力",
      series: stlfsi.series,
      sourceLabel: "FRED St. Louis Fed FSI",
      sourceUrl: "https://fred.stlouisfed.org/series/STLFSI4",
      rows: stlfsi.rows,
      cadence: "每週",
      scoreFn: (latest, change5) => clamp(38 + latest * 40 + Math.max(0, change5 || 0) * 120),
      valueFn: (latest, change5) => `${latest.toFixed(2)} / 5期 ${change5 >= 0 ? "+" : ""}${round(change5, 2)}`,
      explain: "金融壓力指數上行代表市場資金、信用與利率壓力擴散。",
    }),
  ];
}

function failedIndicator(id, name, category, error) {
  const label = macroRiskLabel(null);
  return {
    id,
    name,
    category,
    value: "資料抓取失敗",
    score: null,
    label: label.label,
    tone: label.tone,
    meaning: label.meaning,
    asOf: null,
    checkedAt: new Date().toISOString(),
    cadence: "依來源更新",
    sourceLabel: "資料不足，無法確認",
    sourceUrl: null,
    explain: error.message,
  };
}

export async function fetchMacroRisk() {
  return cached("macro-risk:v1", MACRO_CACHE_TTL_MS, async () => {
    const [berkshire, debt, credit] = await Promise.allSettled([
      fetchLatestBerkshireCash(),
      fetchTreasuryDebt(),
      fetchCreditStress(),
    ]);
    const indicators = [
      berkshire.status === "fulfilled"
        ? berkshire.value
        : failedIndicator("berkshire-cash", "巴菲特現金水位", "大資金防守", berkshire.reason),
      debt.status === "fulfilled"
        ? debt.value
        : failedIndicator("us-debt", "美國國債水位", "主權債務", debt.reason),
      ...(credit.status === "fulfilled"
        ? credit.value
        : [failedIndicator("credit-stress", "美國信貸風險", "信貸風險", credit.reason)]),
    ];
    const score = round(
      weightedAverage(
        indicators
          .filter((indicator) => Number.isFinite(indicator.score))
          .map((indicator) => ({
            value: indicator.score,
            weight: indicator.id === "berkshire-cash" ? 0.24 : indicator.id === "us-debt" ? 0.24 : 0.17,
          })),
      ),
      1,
    );
    const label = macroRiskLabel(score);
    return {
      generatedAt: new Date().toISOString(),
      summary: {
        score,
        label: label.label,
        tone: label.tone,
        meaning: label.meaning,
        highest: indicators
          .filter((indicator) => Number.isFinite(indicator.score))
          .sort((a, b) => b.score - a.score)[0]?.name || "NA",
        interpretation: "分數越高代表宏觀壓力、信用壓力或大資金防守越強；此區偏向提前示警，需搭配價格趨勢確認。",
      },
      indicators: indicators.sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
      sourceHealth: {
        parsed: indicators.filter((indicator) => Number.isFinite(indicator.score)).length,
        total: indicators.length,
      },
    };
  });
}

export {
  macroRiskLabel,
  parseBerkshireCashText,
  parseFredCsv,
};
