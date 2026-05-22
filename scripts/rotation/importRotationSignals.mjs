import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchRadarAssets } from "../../src/features/market/server/marketData.js";
import { ROTATION_SYMBOLS, runRotationEngine } from "../../src/features/rotation/server/rotationEngine.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const optional = process.argv.includes("--optional");

function pad2(value) {
  return String(value).padStart(2, "0");
}

function localDateYmd(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function writeDataModule(filePath, exportName, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `export const ${exportName} = ${JSON.stringify(payload, null, 2)};\n`, "utf8");
}

async function main() {
  const now = new Date();
  const runDate = localDateYmd(now);
  const market = await fetchRadarAssets(ROTATION_SYMBOLS);
  const rotation = runRotationEngine({
    assets: market.assets,
    generatedAt: now.toISOString(),
    sourceHealth: market.sourceHealth,
  });
  const payload = {
    meta: {
      generatedAt: now.toISOString(),
      source: "ETF map rotation knowledge + active-etf-command marketData",
      summary: rotation.summary,
    },
    rotation,
  };

  await Promise.all([
    writeDataModule(path.join(projectRoot, "src/features/rotation/data/rotationSignals.js"), "rotationSignalsData", payload),
    writeJson(path.join(projectRoot, "public/data/rotation-signals.json"), payload),
    writeJson(path.join(projectRoot, "outputs/core_db/latest/rotation_signals.json"), payload),
    writeJson(path.join(projectRoot, "outputs/core_db/daily", runDate, "rotation_signals.json"), payload),
  ]);

  console.log(
    `Rotation signals imported: active=${rotation.summary.activeCount} watch=${rotation.summary.watchCount} status=${rotation.summary.status}`,
  );
}

main().catch((error) => {
  if (optional) {
    console.warn(`Rotation import skipped: ${error.message}`);
    return;
  }
  console.error("Failed to import rotation signals:", error);
  process.exitCode = 1;
});
