import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchMacroRisk } from "../../src/features/macro/server/macroRisk.js";

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
  const macroRisk = await fetchMacroRisk();
  const now = new Date();
  const runDate = localDateYmd(now);
  const payload = {
    meta: {
      generatedAt: now.toISOString(),
      source: "us-market-radar macroRisk pipeline",
      summary: macroRisk?.summary || null,
    },
    macroRisk,
  };

  await Promise.all([
    writeDataModule(path.join(projectRoot, "src/features/macro/data/macroRisk.js"), "macroRiskData", payload),
    writeJson(path.join(projectRoot, "public/data/macro-risk.json"), payload),
    writeJson(path.join(projectRoot, "outputs/core_db/latest/macro_risk.json"), payload),
    writeJson(path.join(projectRoot, "outputs/core_db/daily", runDate, "macro_risk.json"), payload),
  ]);

  console.log(`Macro risk imported: score=${macroRisk?.summary?.score ?? "NA"} status=${macroRisk?.summary?.status ?? "NA"}`);
}

main().catch((error) => {
  if (optional) {
    console.warn(`Macro risk import skipped: ${error.message}`);
    return;
  }
  console.error("Failed to import macro risk:", error);
  process.exitCode = 1;
});
