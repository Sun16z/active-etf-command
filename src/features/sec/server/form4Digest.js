import { compareTransactionsByTime } from "./smartMoney.js";

const codeLabels = {
  P: "公開市場買進",
  S: "公開市場賣出",
  A: "公司授予 / 獎酬",
  D: "交還公司 / 處分",
  F: "稅務扣繳",
  M: "選擇權行使",
  G: "贈與",
  V: "自願揭露交易",
};

function escapeXml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function truncate(value = "", max = 44) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function wrapText(value = "", max = 28, lines = 2) {
  const text = String(value || "NA").replace(/\s+/g, " ").trim();
  const chunks = [];
  let rest = text;
  while (rest.length > max && chunks.length < lines - 1) {
    const slice = rest.slice(0, max);
    const breakAt = Math.max(slice.lastIndexOf(" "), Math.floor(max * 0.62));
    chunks.push(rest.slice(0, breakAt).trim());
    rest = rest.slice(breakAt).trim();
  }
  chunks.push(truncate(rest, max));
  return chunks;
}

function formatScore(value) {
  if (!Number.isFinite(value)) return "NA";
  return value.toFixed(1);
}

function formatUsd(value) {
  if (!Number.isFinite(value)) return "NA";
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatTaipeiDateTime(value) {
  if (!value) return "NA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function form4ActionLabel(tx = {}) {
  return codeLabels[tx.code] || tx.action || "其他";
}

export function titleLabel(title = "") {
  const raw = String(title || "").trim();
  if (!raw || raw === "Insider") return "內部人";
  const lower = raw.toLowerCase();
  const parts = [];
  if (lower.includes("chief executive") || /\bceo\b/i.test(raw)) parts.push("執行長 CEO");
  if (lower.includes("chief financial") || /\bcfo\b/i.test(raw)) parts.push("財務長 CFO");
  if (lower.includes("chief technology") || /\bcto\b/i.test(raw)) parts.push("技術長 CTO");
  if (lower.includes("chief operating") || /\bcoo\b/i.test(raw)) parts.push("營運長 COO");
  if (lower.includes("director")) parts.push("董事");
  if (lower.includes("president")) parts.push("總裁 / President");
  if (lower.includes("10% owner")) parts.push("10% 大股東");
  return parts.length ? [...new Set(parts)].join(" / ") : raw;
}

export function signalDirection(score) {
  if (!Number.isFinite(score)) return { label: "資料不足", color: "#667085", tone: "neutral" };
  if (score >= 70) return { label: "偏多", color: "#0b8f5a", tone: "up" };
  if (score >= 55) return { label: "中性偏多", color: "#1f9a72", tone: "up" };
  if (score > 45) return { label: "中性", color: "#667085", tone: "neutral" };
  if (score > 30) return { label: "中性偏空", color: "#b7791f", tone: "down" };
  return { label: "偏空", color: "#c2410c", tone: "down" };
}

export function form4SourceLine(tx = {}) {
  const accepted = tx.acceptanceDateTime ? `申報 ${formatTaipeiDateTime(tx.acceptanceDateTime)} 台北` : `申報日 ${tx.filingDate || "NA"}`;
  return `${accepted} / 交易日 ${tx.transactionDate || "NA"} / 來源 SEC Form 4`;
}

export function selectForm4Rows(smartMoney = {}, limit = 8) {
  return [...(smartMoney.transactions || [])]
    .sort(compareTransactionsByTime)
    .slice(0, limit);
}

function distribution(rows) {
  return rows.reduce(
    (acc, tx) => {
      const tone = signalDirection(tx.score).tone;
      if (tone === "up") acc.up += 1;
      else if (tone === "down") acc.down += 1;
      else acc.neutral += 1;
      return acc;
    },
    { up: 0, neutral: 0, down: 0 },
  );
}

function svgText(lines, x, y, options = {}) {
  const {
    size = 24,
    fill = "#111827",
    weight = 500,
    lineHeight = Math.round(size * 1.35),
    anchor = "start",
  } = options;
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${escapeXml(line)}</text>`,
    )
    .join("");
}

function metricCard({ x, y, width, label, value, detail, color = "#0f766e" }) {
  return `
    <rect x="${x}" y="${y}" width="${width}" height="96" rx="18" fill="#ffffff" stroke="#d9e2ec"/>
    <text x="${x + 22}" y="${y + 34}" font-size="20" font-weight="700" fill="#667085">${escapeXml(label)}</text>
    <text x="${x + 22}" y="${y + 68}" font-size="30" font-weight="900" fill="${color}">${escapeXml(value)}</text>
    <text x="${x + 22}" y="${y + 88}" font-size="16" font-weight="600" fill="#98a2b3">${escapeXml(detail)}</text>
  `;
}

function rowSvg(tx, index, x, y, widths) {
  const rowHeight = 90;
  const fill = index % 2 === 0 ? "#ffffff" : "#f8fafc";
  const signal = signalDirection(tx.score);
  const scoreWidth = Number.isFinite(tx.score) ? Math.max(4, Math.min(100, tx.score)) : 0;
  const ownerLines = wrapText(`${tx.ownerName || "Unknown"} / ${titleLabel(tx.title)}`, 32, 2);
  const sourceLines = wrapText(form4SourceLine(tx), 48, 2);
  const action = `${tx.code || "NA"} ${form4ActionLabel(tx)}${tx.hasPlan ? " / 10b5-1" : ""}`;
  const tickerX = x + 18;
  const ownerX = x + widths.ticker + 18;
  const actionX = x + widths.ticker + widths.owner + 18;
  const valueX = x + widths.ticker + widths.owner + widths.action + 18;
  const scoreX = x + widths.ticker + widths.owner + widths.action + widths.value + 18;
  const sourceX = x + widths.ticker + widths.owner + widths.action + widths.value + widths.score + 18;

  return `
    <rect x="${x}" y="${y}" width="1280" height="${rowHeight}" fill="${fill}" stroke="#e5e7eb"/>
    <text x="${tickerX}" y="${y + 38}" font-size="24" font-weight="900" fill="#111827">${escapeXml(tx.ticker || "NA")}</text>
    <text x="${tickerX}" y="${y + 62}" font-size="15" font-weight="700" fill="#667085">${escapeXml(truncate(tx.companyTheme || tx.issuerName || "", 16))}</text>
    ${svgText(ownerLines, ownerX, y + 34, { size: 18, weight: 750, fill: "#111827", lineHeight: 25 })}
    <text x="${actionX}" y="${y + 39}" font-size="18" font-weight="850" fill="#111827">${escapeXml(truncate(action, 18))}</text>
    <text x="${actionX}" y="${y + 64}" font-size="15" font-weight="650" fill="#667085">${escapeXml(tx.acquiredDisposed === "A" ? "取得" : tx.acquiredDisposed === "D" ? "處分" : "代碼解讀")}</text>
    <text x="${valueX}" y="${y + 42}" font-size="22" font-weight="900" fill="#111827">${escapeXml(formatUsd(tx.value))}</text>
    <text x="${valueX}" y="${y + 66}" font-size="15" font-weight="650" fill="#667085">${escapeXml(`${tx.shares?.toLocaleString?.("en-US") || "NA"} 股`)}</text>
    <text x="${scoreX}" y="${y + 32}" font-size="22" font-weight="900" fill="${signal.color}">${escapeXml(formatScore(tx.score))} ${escapeXml(signal.label)}</text>
    <rect x="${scoreX}" y="${y + 48}" width="104" height="10" rx="5" fill="#e5e7eb"/>
    <rect x="${scoreX}" y="${y + 48}" width="${scoreWidth * 1.04}" height="10" rx="5" fill="${signal.color}"/>
    ${svgText(sourceLines, sourceX, y + 34, { size: 16, weight: 650, fill: "#344054", lineHeight: 23 })}
  `;
}

export function renderForm4DigestSvg(smartMoney = {}, options = {}) {
  const rows = selectForm4Rows(smartMoney, options.limit || 8);
  const summary = smartMoney.summary || {};
  const generatedAt = smartMoney.generatedAt || summary.checkedAt || new Date().toISOString();
  const dist = distribution(rows);
  const width = 1400;
  const height = 1230;
  const tableX = 60;
  const tableY = 354;
  const col = {
    ticker: 120,
    owner: 300,
    action: 180,
    value: 150,
    score: 170,
    source: 360,
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#eef3f8"/>
  <rect x="30" y="30" width="1340" height="${height - 60}" rx="30" fill="#f8fafc" stroke="#d9e2ec"/>
  <rect x="30" y="30" width="1340" height="220" rx="30" fill="#102033"/>
  <text x="72" y="92" font-size="22" font-weight="800" fill="#8bd5c7">US Market Radar</text>
  <text x="72" y="145" font-size="46" font-weight="950" fill="#ffffff">高層與董事 Form 4 申報</text>
  <text x="72" y="190" font-size="22" font-weight="700" fill="#d1e5f5">每日 15:00 Telegram 推送 · 圖內每列含申報時間、交易日與 SEC 來源</text>
  <text x="1120" y="86" font-size="18" font-weight="750" fill="#b7c8d9">產生時間</text>
  <text x="1120" y="120" font-size="26" font-weight="950" fill="#ffffff">${escapeXml(formatTaipeiDateTime(generatedAt))}</text>
  <text x="1120" y="154" font-size="18" font-weight="700" fill="#b7c8d9">台北時間</text>
  ${metricCard({ x: 60, y: 278, width: 230, label: "追蹤公司", value: `${summary.parsedCompanies ?? 0}/${summary.trackedCompanies ?? 0}`, detail: "CEO / CFO / CTO / 董事", color: "#2563eb" })}
  ${metricCard({ x: 310, y: 278, width: 230, label: "最新申報日", value: summary.latestForm4Date || "NA", detail: "依 SEC Form 4", color: "#0f766e" })}
  ${metricCard({ x: 560, y: 278, width: 210, label: "公開買進", value: String(summary.openMarketBuys ?? 0), detail: "代碼 P 偏多", color: "#0b8f5a" })}
  ${metricCard({ x: 790, y: 278, width: 210, label: "公開賣出", value: String(summary.openMarketSales ?? 0), detail: "代碼 S 偏空", color: "#b7791f" })}
  ${metricCard({ x: 1020, y: 278, width: 320, label: "訊號分布", value: `多 ${dist.up} / 中 ${dist.neutral} / 空 ${dist.down}`, detail: "分數 0-100 越高越偏多", color: "#344054" })}
  <rect x="${tableX}" y="${tableY}" width="1280" height="58" rx="16" fill="#e6edf5"/>
  <text x="${tableX + 18}" y="${tableY + 37}" font-size="18" font-weight="900" fill="#344054">股票</text>
  <text x="${tableX + col.ticker + 18}" y="${tableY + 37}" font-size="18" font-weight="900" fill="#344054">內部人 / 職位</text>
  <text x="${tableX + col.ticker + col.owner + 18}" y="${tableY + 37}" font-size="18" font-weight="900" fill="#344054">代碼 / 中文意義</text>
  <text x="${tableX + col.ticker + col.owner + col.action + 18}" y="${tableY + 37}" font-size="18" font-weight="900" fill="#344054">金額</text>
  <text x="${tableX + col.ticker + col.owner + col.action + col.value + 18}" y="${tableY + 37}" font-size="18" font-weight="900" fill="#344054">分數 / 方向</text>
  <text x="${tableX + col.ticker + col.owner + col.action + col.value + col.score + 18}" y="${tableY + 37}" font-size="18" font-weight="900" fill="#344054">時間與來源</text>
  ${
    rows.length
      ? rows.map((tx, index) => rowSvg(tx, index, tableX, tableY + 58 + index * 90, col)).join("")
      : `<rect x="${tableX}" y="${tableY + 68}" width="1280" height="220" rx="18" fill="#ffffff" stroke="#e5e7eb"/><text x="700" y="${tableY + 188}" font-size="28" font-weight="900" fill="#667085" text-anchor="middle">目前未抓到 Form 4 交易</text>`
  }
  <rect x="60" y="${height - 78}" width="1280" height="34" rx="17" fill="#eaf2f8"/>
  <text x="84" y="${height - 55}" font-size="17" font-weight="750" fill="#475467">分數解讀：70+ 偏多；55-69 中性偏多；46-54 中性；31-45 中性偏空；30 以下偏空。10b5-1、選擇權行使、稅務扣繳需折扣解讀。非投資建議。</text>
</svg>`;
}

export function renderForm4TelegramCaption(smartMoney = {}) {
  const summary = smartMoney.summary || {};
  const generatedAt = smartMoney.generatedAt || summary.checkedAt || new Date().toISOString();
  return [
    "高層與董事 Form 4 申報",
    `產生：${formatTaipeiDateTime(generatedAt)} 台北`,
    `最新申報日：${summary.latestForm4Date || "NA"}｜公開買進 ${summary.openMarketBuys ?? 0}｜公開賣出 ${summary.openMarketSales ?? 0}`,
    "分數越高偏多，越低偏空；非投資建議。",
  ].join("\n");
}

export function renderForm4SourceLinks(smartMoney = {}, options = {}) {
  const rows = selectForm4Rows(smartMoney, options.limit || 8);
  const lines = [
    "Form 4 來源連結",
    "每列格式：股票｜申報人｜申報時間｜來源",
    "",
    ...rows.map((tx, index) => {
      const source = tx.filingUrl || "https://www.sec.gov/edgar/search/";
      return `${index + 1}. ${tx.ticker || "NA"}｜${tx.ownerName || "Unknown"}｜${tx.code || "NA"} ${form4ActionLabel(tx)}｜${formatUsd(tx.value)}｜${form4SourceLine(tx)}\n${source}`;
    }),
    "",
    "完整網站：https://sun16z.github.io/us-market-radar-site/",
  ];
  return lines.join("\n");
}
