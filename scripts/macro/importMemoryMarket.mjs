import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchMemoryMarket } from "../../src/features/memory/server/memoryMarket.js";

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
  const memoryMarket = await fetchMemoryMarket();
  const now = new Date();
  const runDate = localDateYmd(now);
  const payload = {
    meta: {
      generatedAt: now.toISOString(),
      source: "us-market-radar memoryMarket pipeline",
      summary: memoryMarket?.summary || null,
    },
    memoryMarket,
  };

  await Promise.all([
    writeDataModule(path.join(projectRoot, "src/features/memory/data/memoryMarket.js"), "memoryMarketData", payload),
    writeJson(path.join(projectRoot, "public/data/memory-market.json"), payload),
    writeJson(path.join(projectRoot, "outputs/core_db/latest/memory_market.json"), payload),
    writeJson(path.join(projectRoot, "outputs/core_db/daily", runDate, "memory_market.json"), payload),
  ]);

  console.log(`Memory market imported: status=${memoryMarket?.summary?.status ?? "NA"} alerts=${memoryMarket?.alerts?.length ?? 0}`);
}

main().catch((error) => {
  if (optional) {
    console.warn(`Memory market import skipped: ${error.message}`);
    return;
  }
  console.error("Failed to import memory market:", error);
  process.exitCode = 1;
});
