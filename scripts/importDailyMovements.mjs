import { access, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { etfs, snapshotMeta } from "../src/data/etfUniverse.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const optional = process.argv.includes("--optional");
const maxRows = Number(process.env.ACTIVE_ETF_DAILY_ROWS || 4000);

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
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
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

function parseCsv(raw) {
  const rows = raw.split(/\r?\n/).filter((line) => line.trim());
  const header = parseCsvLine(rows.shift() || "");
  return rows.map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(header.map((key, index) => [key, cells[index] ?? ""]));
  });
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
    valueBasis: estimatedValueYi ? "AUM x 權重/股數推估" : "權重變化",
  };
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
  const historical = await movementsFromHistory();
  const current = movementsFromCurrentEtfs();
  const byId = new Map();
  [...historical, ...current].forEach((row) => {
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
    source: "ETF資訊網 latestDiff + 本機歷史快照差異",
    sourceUrl: snapshotMeta.sourceUrl,
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
