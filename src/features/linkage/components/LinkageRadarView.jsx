import { macroRiskData } from "../../macro/data/macroRisk.js";
import { memoryMarketData } from "../../memory/data/memoryMarket.js";
import { formatSignedPct, formatTaipeiDateTime } from "../../../shared/formatters.js";

function toneClass(tone) {
  if (tone === "red" || tone === "down") return "data-audit-red";
  if (tone === "green" || tone === "up") return "data-audit-green";
  if (tone === "yellow" || tone === "warning") return "data-audit-gold";
  return "data-audit-cyan";
}

export function LinkageRadarView() {
  const macroRisk = macroRiskData.macroRisk || {};
  const memoryMarket = memoryMarketData.memoryMarket || {};
  const macroSummary = macroRisk.summary || {};
  const memorySummary = memoryMarket.summary || {};
  const memoryCards = memoryMarket.priceCards || [];
  const macroIndicators = macroRisk.indicators || [];

  return (
    <div className="linkage-radar-view">
      <section className="section-head">
        <div>
          <p>Linkage Radar</p>
          <h2>台美連動與類股輪動</h2>
        </div>
        <span className={`data-audit-chip ${toneClass(memorySummary.cycleRiskTone)}`}>
          memory {memorySummary.cycleRiskLabel || "NA"}
        </span>
      </section>

      <section className="metrics-strip">
        <div className="metric metric-gold">
          <span>Macro pressure</span>
          <strong>{macroSummary.score ?? "NA"}</strong>
          <small>{macroSummary.label || "NA"} · {macroSummary.highest || "NA"}</small>
        </div>
        <div className="metric metric-cyan">
          <span>Memory cycle</span>
          <strong>{memorySummary.score ?? "NA"}</strong>
          <small>{memorySummary.headline || memorySummary.label || "NA"}</small>
        </div>
        <div className="metric">
          <span>TrendForce cards</span>
          <strong>{memoryCards.length}</strong>
          <small>{formatTaipeiDateTime(memoryMarket.generatedAt)}</small>
        </div>
        <div className="metric">
          <span>Source health</span>
          <strong>{macroRisk.sourceHealth?.status || "NA"}</strong>
          <small>{memorySummary.failedSources ? `memory failed ${memorySummary.failedSources}` : "memory pass"}</small>
        </div>
      </section>

      <section className="panel">
        <div className="section-head compact">
          <div>
            <p>memory transmission</p>
            <h2>DRAM / NAND / HBM 價格線索</h2>
          </div>
        </div>
        <div className="data-audit-table">
          <div className="data-audit-row data-audit-head">
            <span>品項</span>
            <span>最新</span>
            <span>變化</span>
            <span>來源時間</span>
          </div>
          {memoryCards.slice(0, 10).map((card) => (
            <div className="data-audit-row" key={card.id}>
              <strong>{card.label}</strong>
              <b>{card.latest ?? "NA"} {card.unit || ""}</b>
              <span>{formatSignedPct(card.changePct)}</span>
              <small>{formatTaipeiDateTime(card.sourceAsOf || card.checkedAt)}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-head compact">
          <div>
            <p>macro guardrail</p>
            <h2>跨市場風險閥值</h2>
          </div>
        </div>
        <div className="data-audit-table">
          <div className="data-audit-row data-audit-head">
            <span>指標</span>
            <span>分數</span>
            <span>狀態</span>
            <span>來源</span>
          </div>
          {macroIndicators.slice(0, 8).map((indicator) => (
            <div className="data-audit-row" key={indicator.id}>
              <strong>{indicator.name}</strong>
              <b>{indicator.score ?? "NA"}</b>
              <span>{indicator.label || "NA"}</span>
              <small>{indicator.sourceLabel || "NA"} · {indicator.asOf || "NA"}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
