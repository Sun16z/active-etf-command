import { secSmartMoneyData } from "../data/smartMoney.js";
import { formatTaipeiDateTime, formatUsd } from "../../../shared/formatters.js";

function pct(value) {
  if (!Number.isFinite(value)) return "NA";
  return `${value.toFixed(1)}%`;
}

function sourceTime(row) {
  return row.acceptanceDateTime || row.filingDate || row.reportDate || "";
}

function signalLabel(score) {
  if (!Number.isFinite(score)) return "NA";
  if (score >= 80) return "高";
  if (score >= 65) return "中高";
  if (score >= 50) return "中";
  return "低";
}

export function SecHunterView() {
  const smartMoney = secSmartMoneyData.smartMoney || {};
  const summary = smartMoney.summary || {};
  const alerts = smartMoney.alerts || [];
  const funds = smartMoney.funds || [];
  const transactions = smartMoney.transactions || [];
  const topFunds = funds.filter((fund) => fund.status === "ok").slice(0, 8);
  const topTransactions = transactions.slice(0, 12);

  return (
    <div className="sec-hunter-view">
      <section className="section-head">
        <div>
          <p>SEC Hunter</p>
          <h2>13F / Form 4 / 13D-G 題材雷達</h2>
        </div>
        <span className={`data-audit-chip data-audit-${summary.status === "pass" ? "green" : "gold"}`}>
          SEC freshness {summary.freshness?.label || "NA"}
        </span>
      </section>

      <section className="metrics-strip">
        <div className="metric metric-cyan">
          <span>13F parsed</span>
          <strong>{summary.parsedFunds ?? 0}/{summary.trackedFunds ?? 0}</strong>
          <small>{summary.latestFundDate || "NA"}</small>
        </div>
        <div className="metric metric-green">
          <span>Form 4 companies</span>
          <strong>{summary.parsedCompanies ?? 0}/{summary.trackedCompanies ?? 0}</strong>
          <small>{summary.latestForm4Date || "NA"}</small>
        </div>
        <div className="metric metric-gold">
          <span>13D/G companies</span>
          <strong>{summary.parsedActivists ?? 0}/{summary.trackedActivists ?? 0}</strong>
          <small>{summary.latestActivistDate || "NA"}</small>
        </div>
        <div className="metric">
          <span>Open-market B/S</span>
          <strong>{summary.openMarketBuys ?? 0}/{summary.openMarketSales ?? 0}</strong>
          <small>{summary.freshness?.note || "SEC generated data"}</small>
        </div>
      </section>

      <section className="panel">
        <div className="section-head compact">
          <div>
            <p>topic queue</p>
            <h2>可轉 Threads 的 SEC 題材</h2>
          </div>
        </div>
        <div className="data-audit-table sec-topic-table">
          <div className="data-audit-row data-audit-head">
            <span>等級</span>
            <span>題材</span>
            <span>原因</span>
            <span>時間</span>
          </div>
          {alerts.slice(0, 10).map((alert) => (
            <div className="data-audit-row" key={alert.id || alert.title}>
              <b>{alert.severity || "info"}</b>
              <strong>{alert.title}</strong>
              <small>{alert.body || alert.reason || "SEC filing alert"}</small>
              <span>{formatTaipeiDateTime(alert.asOf || alert.filingDate)}</span>
            </div>
          ))}
          {!alerts.length && <div className="data-audit-empty">目前沒有高分 SEC 題材。</div>}
        </div>
      </section>

      <section className="panel">
        <div className="section-head compact">
          <div>
            <p>13F</p>
            <h2>Smart Money 主要持倉</h2>
          </div>
        </div>
        <div className="data-audit-table sec-fund-table">
          <div className="data-audit-row data-audit-head">
            <span>機構</span>
            <span>市值</span>
            <span>持倉</span>
            <span>AI/半導體</span>
          </div>
          {topFunds.map((fund) => (
            <div className="data-audit-row" key={fund.id || fund.name}>
              <strong>{fund.name}</strong>
              <b>{formatUsd(fund.totalValue)}</b>
              <span>{fund.holdingCount ?? 0}</span>
              <small>{(fund.strategicHoldings || []).map((holding) => holding.ticker || holding.issuer).slice(0, 5).join(", ") || "NA"}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-head compact">
          <div>
            <p>Form 4</p>
            <h2>內部人申報</h2>
          </div>
        </div>
        <div className="data-audit-table sec-insider-table">
          <div className="data-audit-row data-audit-head">
            <span>Ticker</span>
            <span>申報人</span>
            <span>金額</span>
            <span>分數</span>
            <span>時間</span>
          </div>
          {topTransactions.map((tx) => (
            <div className="data-audit-row" key={`${tx.accessionNumber}-${tx.ownerName}-${tx.ticker}`}>
              <strong>{tx.ticker}</strong>
              <span>{tx.ownerName}</span>
              <b>{formatUsd(tx.value)}</b>
              <span>{signalLabel(tx.score)} · {pct(tx.score)}</span>
              <small>{formatTaipeiDateTime(sourceTime(tx))}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
