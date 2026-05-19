import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const candidateEventsDirs = [
  process.env.INTRADAY_EVENTS_DIR,
  path.resolve(projectRoot, "../tw_shortterm_screener/data/cache/intraday_events"),
  "/Users/justin/tw_shortterm_screener_runtime/data/cache/intraday_events",
  "/Users/justin/Documents/chatgpt/tw_shortterm_screener/data/cache/intraday_events",
].filter(Boolean);
const optional = process.argv.includes("--optional");

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

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function maxDefined(values) {
  const defined = values.filter((value) => value != null);
  return defined.length ? Math.max(...defined) : null;
}

function timePart(ts) {
  const match = String(ts || "").match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "";
}

function cleanDateFromFile(fileName) {
  return fileName.replace("_attack_events.csv", "");
}

function buildReasons(row) {
  const reasons = [];
  if (row.maxBurstRatio != null) reasons.push(`短線量能最高 ${row.maxBurstRatio.toFixed(1)}x`);
  if (row.maxDeltaVolume != null) reasons.push(`單輪新增最高 ${Math.round(row.maxDeltaVolume).toLocaleString("zh-TW")} 張`);
  if (row.maxProjectedVolumeRatio != null) reasons.push(`預估全天量最高 ${row.maxProjectedVolumeRatio.toFixed(1)}x`);
  if (row.rawReasonText.includes("推到盤中新高")) reasons.push("推到盤中新高");
  if (row.rawReasonText.includes("突破 ORB 高點")) reasons.push("突破 ORB 高點");
  if (row.rawReasonText.includes("買盤深度占優")) reasons.push("買盤深度占優");
  if (row.maxPriceChangePct != null && row.maxPriceChangePct > 0) {
    reasons.push(`單輪價格最高 +${(row.maxPriceChangePct * 100).toFixed(2)}%`);
  }
  return [...new Set(reasons)].slice(0, 6);
}

function aggregate(records) {
  const bySymbol = new Map();

  records.forEach((cols) => {
    if (cols.length < 14 || cols[0] === "ts") return;

    const symbol = cols[1]?.trim();
    if (!symbol) return;

    const row = bySymbol.get(symbol) || {
      symbol,
      name: cols[2]?.trim() || symbol,
      level: cols[3]?.trim() || "攻擊訊號",
      direction: cols[4]?.trim() || "buy",
      timestamps: [],
      scores: [],
      closes: [],
      deltaVolumes: [],
      burstRatios: [],
      volumeRatios: [],
      projectedVolumeRatios: [],
      priceChangePcts: [],
      rawReasonText: "",
    };

    row.timestamps.push(cols[0]);
    row.scores.push(toNumber(cols[5]));
    row.closes.push(toNumber(cols[6]));
    row.deltaVolumes.push(toNumber(cols[7]));
    row.burstRatios.push(toNumber(cols[8]));
    row.volumeRatios.push(toNumber(cols[9]));
    row.priceChangePcts.push(toNumber(cols[10]));
    row.projectedVolumeRatios.push(toNumber(cols[13]));
    row.rawReasonText += ` ${cols.at(-1) || ""}`;
    bySymbol.set(symbol, row);
  });

  return [...bySymbol.values()]
    .map((row) => {
      const timestamps = [...row.timestamps].sort();
      const output = {
        symbol: row.symbol,
        name: row.name,
        level: row.level,
        direction: row.direction,
        eventCount: row.timestamps.length,
        firstSeen: timePart(timestamps.at(0)),
        lastSeen: timePart(timestamps.at(-1)),
        maxScore: maxDefined(row.scores),
        close: maxDefined(row.closes),
        maxDeltaVolume: maxDefined(row.deltaVolumes),
        maxBurstRatio: maxDefined(row.burstRatios),
        maxVolumeRatio: maxDefined(row.volumeRatios),
        maxProjectedVolumeRatio: maxDefined(row.projectedVolumeRatios),
        maxPriceChangePct: maxDefined(row.priceChangePcts),
        rawReasonText: row.rawReasonText,
      };
      output.reasons = buildReasons(output);
      delete output.rawReasonText;
      return output;
    })
    .sort((a, b) => (b.maxScore || 0) - (a.maxScore || 0));
}

async function main() {
  let dirEntries = [];
  let eventsDir = "";
  let readError = null;
  try {
    for (const candidateDir of candidateEventsDirs) {
      try {
        dirEntries = await readdir(candidateDir);
        eventsDir = candidateDir;
        readError = null;
        break;
      } catch (error) {
        readError = error;
      }
    }
  } catch (error) {
    readError = error;
  }

  if (!eventsDir) {
    if (optional) {
      console.warn(`Intraday import skipped: ${readError?.message || "No intraday event directory found"}`);
      return;
    }
    throw readError || new Error("No intraday event directory found");
  }

  const files = dirEntries
    .filter((file) => file.endsWith("_attack_events.csv"))
    .sort();

  if (!files.length) {
    const message = `No *_attack_events.csv files found in ${eventsDir}`;
    if (optional) {
      console.warn(`Intraday import skipped: ${message}`);
      return;
    }
    throw new Error(message);
  }

  const latestFile = files.at(-1);
  const absolutePath = path.join(eventsDir, latestFile);
  const relativePath = path.relative(projectRoot, absolutePath);
  const sourceStat = await stat(absolutePath);
  const raw = await readFile(absolutePath, "utf8");
  const records = raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map(parseCsvLine);
  const attacks = aggregate(records);

  const meta = {
    asOf: cleanDateFromFile(latestFile),
    sourcePath: relativePath,
    source: "tw_shortterm_screener intraday attack-volume monitor",
    note: "Generated by npm run import:intraday.",
    sourceFileModifiedAt: sourceStat.mtime.toISOString(),
    sourceRows: Math.max(records.length - 1, 0),
    symbols: attacks.length,
  };

  const output = `export const intradayAttackMeta = ${JSON.stringify(meta, null, 2)};\n\nexport const intradayAttacks = ${JSON.stringify(attacks, null, 2)};\n`;

  await writeFile(path.join(projectRoot, "src/data/intradayAttacks.js"), output);
  console.log(`Imported ${attacks.length} attack symbols from ${relativePath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
