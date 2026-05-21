import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  snapshotMeta,
  etfs,
  watchlist,
  reports,
} from "../src/data/etfUniverse.js";
import {
  dailyMovementMeta,
  dailyMovements,
  dailyEtfSummaries,
} from "../src/data/dailyMovements.js";
import {
  intradayAttackMeta,
  intradayAttacks,
} from "../src/data/intradayAttacks.js";
import { themeRiskMeta, themeRiskRows } from "../src/data/themeRisk.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const coreDbRoot = path.join(projectRoot, "outputs", "core_db");
const latestRoot = path.join(coreDbRoot, "latest");

function pad2(value) {
  return String(value).padStart(2, "0");
}

function localDateYmd(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function localDateTimeText(date) {
  return `${localDateYmd(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

async function writeJson(filePath, payload) {
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main() {
  const now = new Date();
  const runDate = localDateYmd(now);
  const runDateTime = localDateTimeText(now);
  const dayRoot = path.join(coreDbRoot, "daily", runDate);

  const datasets = [
    {
      id: "etf_universe",
      asOf: snapshotMeta.asOf || "",
      rowCount: Array.isArray(etfs) ? etfs.length : 0,
      payload: {
        meta: snapshotMeta,
        rows: etfs,
        watchlist,
        reports,
      },
    },
    {
      id: "daily_movements",
      asOf: dailyMovementMeta.asOf || "",
      rowCount: Array.isArray(dailyMovements) ? dailyMovements.length : 0,
      payload: {
        meta: dailyMovementMeta,
        rows: dailyMovements,
      },
    },
    {
      id: "daily_etf_summaries",
      asOf: dailyMovementMeta.asOf || "",
      rowCount: Array.isArray(dailyEtfSummaries) ? dailyEtfSummaries.length : 0,
      payload: {
        meta: dailyMovementMeta,
        rows: dailyEtfSummaries,
      },
    },
    {
      id: "intraday_attacks",
      asOf: intradayAttackMeta.asOf || "",
      rowCount: Array.isArray(intradayAttacks) ? intradayAttacks.length : 0,
      payload: {
        meta: intradayAttackMeta,
        rows: intradayAttacks,
      },
    },
    {
      id: "theme_risk",
      asOf: themeRiskMeta.asOf || "",
      rowCount: Array.isArray(themeRiskRows) ? themeRiskRows.length : 0,
      payload: {
        meta: themeRiskMeta,
        rows: themeRiskRows,
      },
    },
  ];

  await fs.mkdir(dayRoot, { recursive: true });
  await fs.mkdir(latestRoot, { recursive: true });

  for (const dataset of datasets) {
    const fileName = `${dataset.id}.json`;
    await writeJson(path.join(dayRoot, fileName), dataset.payload);
    await writeJson(path.join(latestRoot, fileName), dataset.payload);
  }

  const manifest = {
    generatedAt: now.toISOString(),
    generatedAtLocal: runDateTime,
    runDate,
    source: "active-etf-command refresh:data",
    datasetCount: datasets.length,
    datasets: datasets.map((dataset) => ({
      id: dataset.id,
      asOf: dataset.asOf,
      rowCount: dataset.rowCount,
      dailyPath: `outputs/core_db/daily/${runDate}/${dataset.id}.json`,
      latestPath: `outputs/core_db/latest/${dataset.id}.json`,
    })),
  };

  await writeJson(path.join(dayRoot, "manifest.json"), manifest);
  await writeJson(path.join(latestRoot, "manifest.json"), manifest);
  await writeJson(path.join(coreDbRoot, "latest_manifest.json"), manifest);

  console.log(
    `Core DB snapshot exported: date=${runDate} datasets=${datasets.length} root=${path.relative(projectRoot, coreDbRoot)}`,
  );
}

main().catch((error) => {
  console.error("Failed to export core DB snapshot:", error);
  process.exitCode = 1;
});
