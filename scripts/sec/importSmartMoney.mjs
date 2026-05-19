import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchSmartMoney } from "../../src/features/sec/server/smartMoney.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const optional = process.argv.includes("--optional");
const preferSeed = process.argv.includes("--prefer-seed");
const seedPath = process.env.SEC_SMART_MONEY_SEED_JSON
  || "/Users/justin/Documents/chatgpt/us-market-radar/public/data/smart-money.json";

function pad2(value) {
  return String(value).padStart(2, "0");
}

function localDateYmd(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

async function readSeed() {
  const text = await fs.readFile(seedPath, "utf8");
  return JSON.parse(text);
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function writeDataModule(filePath, exportName, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(
    filePath,
    `export const ${exportName} = ${JSON.stringify(payload, null, 2)};\n`,
    "utf8",
  );
}

async function main() {
  let smartMoney;
  let sourceMode = "live-sec";

  if (preferSeed) {
    smartMoney = await readSeed();
    sourceMode = "seed-json";
  } else {
    smartMoney = await fetchSmartMoney();
  }

  const now = new Date();
  const runDate = localDateYmd(now);
  const payload = {
    meta: {
      generatedAt: now.toISOString(),
      sourceMode,
      seedPath: sourceMode === "seed-json" ? seedPath : null,
      source: "SEC EDGAR Smart Money import",
      summary: smartMoney?.summary || null,
    },
    smartMoney,
  };

  await Promise.all([
    writeDataModule(path.join(projectRoot, "src/features/sec/data/smartMoney.js"), "secSmartMoneyData", payload),
    writeJson(path.join(projectRoot, "public/data/sec-smart-money.json"), payload),
    writeJson(path.join(projectRoot, "outputs/core_db/latest/sec_smart_money.json"), payload),
    writeJson(path.join(projectRoot, "outputs/core_db/daily", runDate, "sec_smart_money.json"), payload),
  ]);

  console.log(
    `SEC smart money imported: mode=${sourceMode} funds=${smartMoney?.summary?.parsedFunds ?? "NA"} companies=${smartMoney?.summary?.parsedCompanies ?? "NA"}`,
  );
}

main().catch((error) => {
  if (optional) {
    console.warn(`SEC smart money import skipped: ${error.message}`);
    return;
  }
  console.error("Failed to import SEC smart money:", error);
  process.exitCode = 1;
});
