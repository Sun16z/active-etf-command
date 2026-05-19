import { formatSignedPct, formatTaipeiDateTime, formatUsd } from "../../../shared/formatters.js";

function formatScore(value) {
  if (!Number.isFinite(value)) return "NA";
  return value.toFixed(1);
}

function sourceLine(item = {}) {
  const timeParts = [];
  if (item.acceptanceDateTime) timeParts.push(`申報時間 ${formatTaipeiDateTime(item.acceptanceDateTime)} 台北`);
  else if (item.filingDate) timeParts.push(`申報日 ${item.filingDate}`);
  if (item.transactionDate) timeParts.push(`交易日 ${item.transactionDate}`);
  if (item.reportDate) timeParts.push(`報告期 ${item.reportDate}`);

  const is13f = item.sourceForm?.startsWith("13F") || item.reportDate || item.holdingCount !== undefined;
  const source = item.sourceLabel || (is13f ? "SEC 13F 持倉申報" : "SEC Form 4 內部人申報");
  return `${timeParts.join(" / ") || "NA"}；${source}`;
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
  const accessionDiff = String(b.accessionNumber || "").localeCompare(String(a.accessionNumber || ""));
  if (accessionDiff) return accessionDiff;
  return (b.value || 0) - (a.value || 0);
}

function actionLabel(tx = {}) {
  return {
    P: "公開市場買進",
    S: "公開市場賣出",
    A: "公司授予 / 獎酬",
    D: "交還公司 / 處分",
    F: "稅務扣繳",
    M: "選擇權行使",
    G: "贈與",
    V: "自願揭露交易",
  }[tx.code] || tx.action || "其他";
}

function titleLabel(title = "") {
  const raw = String(title || "").trim();
  if (!raw || raw === "Insider") return "內部人";
  const lower = raw.toLowerCase();
  const parts = [];
  if (lower.includes("chief executive") || /\bceo\b/i.test(raw)) parts.push("CEO");
  if (lower.includes("chief financial") || /\bcfo\b/i.test(raw)) parts.push("CFO");
  if (lower.includes("chief technology") || /\bcto\b/i.test(raw)) parts.push("CTO");
  if (lower.includes("director")) parts.push("董事");
  if (lower.includes("10% owner")) parts.push("10% 大股東");
  return parts.length ? `${[...new Set(parts)].join(" / ")}（${raw}）` : raw;
}

function signalDirection(score) {
  if (!Number.isFinite(score)) return "資料不足";
  if (score >= 70) return "偏多";
  if (score >= 55) return "中性偏多";
  if (score > 45) return "中性";
  if (score > 30) return "中性偏空";
  return "偏空";
}

function threadHookFromAlert(alert = {}) {
  if (!alert.title) return "今天沒有明顯的新題材，但資料值得留底。";
  return `${alert.title}，這能不能變成一條新主線？`;
}

export function renderSmartMoneySnapshotLines(smartMoney = {}) {
  const summary = smartMoney.summary || {};
  const lines = [
    `13F parsed: ${summary.parsedFunds ?? 0}/${summary.trackedFunds ?? 0}`,
    `Form 4 parsed: ${summary.parsedCompanies ?? 0}/${summary.trackedCompanies ?? 0}`,
    `13D/G parsed: ${summary.parsedActivists ?? 0}/${summary.trackedActivists ?? 0}`,
    `Open-market buys/sales: ${summary.openMarketBuys ?? 0}/${summary.openMarketSales ?? 0}`,
    `Freshness: ${summary.freshness?.label || "NA"} | ${summary.freshness?.note || "NA"}`,
  ];

  const topFund = (smartMoney.funds || []).find((fund) => fund.status === "ok");
  if (topFund) {
    lines.push(
      `Top 13F: ${topFund.name} | ${sourceLine(topFund)} | ${formatUsd(topFund.totalValue)} | ${(topFund.strategicHoldings || [])
        .map((holding) => holding.ticker || holding.issuer)
        .filter(Boolean)
        .slice(0, 5)
        .join(", ") || "NA"}`,
    );
  }

  const topTransaction = [...(smartMoney.transactions || [])].sort(compareTransactionsByTime)[0];
  if (topTransaction) {
    lines.push(
      `Top Form 4: ${topTransaction.ticker} | ${topTransaction.ownerName} | ${titleLabel(topTransaction.title)} | ${actionLabel(topTransaction)} | ${formatUsd(topTransaction.value)} | score ${formatScore(topTransaction.score)} | ${sourceLine(topTransaction)}`,
    );
  }

  return lines;
}

export function renderMemoryMarketLines(memoryMarket = {}) {
  const summary = memoryMarket.summary || {};
  const lines = [
    `Cycle risk: ${summary.cycleRiskLabel || summary.label || "NA"} | score ${formatScore(summary.cycleRiskScore ?? summary.score)}`,
    `Headline: ${summary.headline || "NA"}`,
  ];

  for (const card of (memoryMarket.priceCards || []).slice(0, 6)) {
    lines.push(
      `${card.chain || "memory"} ${card.label}: ${card.latest ?? "NA"} ${card.unit || ""} | ${formatSignedPct(card.changePct)} | ${formatTaipeiDateTime(card.sourceAsOf || card.checkedAt)} | ${card.sourceLabel || "NA"}`,
    );
  }

  return lines;
}

export function renderSecHunterBrief(smartMoney = {}) {
  const alerts = smartMoney.alerts || [];
  const topAlert = alerts[0] || {};
  return [
    threadHookFromAlert(topAlert),
    "",
    ...renderSmartMoneySnapshotLines(smartMoney).map((line) => `- ${line}`),
    "",
    "人工審稿後再發，不自動發文。",
  ].join("\n");
}

export function renderMergedMarketMarkdown(snapshot = {}) {
  const smartMoney = snapshot.smartMoney || {};
  const macroRisk = snapshot.macroRisk || {};
  const memoryMarket = snapshot.memoryMarket || {};
  const generatedAt = snapshot.generatedAt || new Date().toISOString();

  const sections = [
    "# 台美股票市場觀察",
    "",
    `Generated: ${formatTaipeiDateTime(generatedAt)} 台北`,
    "",
    "## SEC Hunter",
    "",
    ...renderSmartMoneySnapshotLines(smartMoney).map((line) => `- ${line}`),
    "",
    "### 高分內部人交易",
    "",
    "| 股票代號 | 申報人 | 職位 | 交易代碼 / 中文註解 | 交易金額 | 訊號分數 | 方向 | 時間與來源 |",
    "|---|---|---|---|---:|---:|---|---|",
    ...[...(smartMoney.transactions || [])]
      .sort(compareTransactionsByTime)
      .slice(0, 10)
      .map(
        (tx) =>
          `| ${tx.ticker} | ${tx.ownerName} | ${titleLabel(tx.title)} | ${tx.code || "NA"} ${actionLabel(tx)} | ${formatUsd(tx.value)} | ${formatScore(tx.score)} | ${signalDirection(tx.score)} | ${sourceLine(tx)} |`,
      ),
    "",
    "### 13F 追蹤亮點",
    "",
    "| 機構 | 時間與來源 | 持倉數 | 13F 持倉市值 | 相關持倉 |",
    "|---|---|---:|---:|---|",
    ...(smartMoney.funds || [])
      .filter((fund) => fund.status === "ok")
      .slice(0, 10)
      .map(
        (fund) =>
          `| ${fund.name} | ${sourceLine(fund)} | ${fund.holdingCount ?? "NA"} | ${formatUsd(fund.totalValue)} | ${(fund.strategicHoldings || [])
            .map((holding) => holding.ticker || holding.issuer)
            .filter(Boolean)
            .slice(0, 4)
            .join(", ") || "NA"} |`,
      ),
    "",
    "## Macro Risk",
    "",
    `- Macro pressure: ${formatScore(macroRisk.summary?.score)} | ${macroRisk.summary?.label || "NA"}`,
    `- Highest pressure: ${macroRisk.summary?.highest || "NA"}`,
    "",
    "| 指標 | 類別 | 數值 | 分數 | 狀態 | 時間 | 來源 |",
    "|---|---|---|---:|---|---|---|",
    ...(macroRisk.indicators || []).map(
      (indicator) =>
        `| ${indicator.name} | ${indicator.category || "NA"} | ${indicator.value ?? "NA"} | ${formatScore(indicator.score)} | ${indicator.label || "NA"} | ${indicator.asOf || "NA"} | ${indicator.sourceLabel || "NA"} |`,
    ),
    "",
    "## Memory Chain",
    "",
    ...renderMemoryMarketLines(memoryMarket).map((line) => `- ${line}`),
    "",
    "非投資建議。",
  ];

  return sections.join("\n");
}
