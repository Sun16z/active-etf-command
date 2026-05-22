import { rotationSignalsData } from "../data/rotationSignals.js";
import { formatSignedPct, formatTaipeiDateTime } from "../../../shared/formatters.js";

function toneClass(status) {
  if (status === "active" || status === "pass") return "data-audit-green";
  if (status === "warning" || status === "watch") return "data-audit-gold";
  if (status === "fail" || status === "missing") return "data-audit-red";
  return "data-audit-cyan";
}

function bestStageLine(row) {
  const triggered = row.stages?.filter((stage) => stage.triggered) || [];
  const stage = triggered.at(-1) || row.stages?.find((item) => !item.manual) || null;
  const best = stage?.best;
  if (!stage) return "NA";
  if (!best) return `第${stage.stage}棒 ${stage.name}`;
  return `第${stage.stage}棒 ${stage.name} / ${best.name} ${formatSignedPct(best.changePct)}`;
}

function nextStageLine(row) {
  const stocks = row.nextStage?.stocks || [];
  if (!stocks.length) return row.nextStage?.name || "待確認";
  return stocks.map((stock) => `${stock.name} ${stock.code}`).join(" / ");
}

export function RotationRadarView() {
  const rotation = rotationSignalsData.rotation || {};
  const rows = rotation.rows || [];
  const summary = rotation.summary || {};

  return (
    <div className="rotation-radar-view">
      <section className="section-head">
        <div>
          <p>Rotation Radar</p>
          <h2>台美類股輪動題材雷達</h2>
        </div>
        <span className={`data-audit-chip ${toneClass(summary.status)}`}>
          source {summary.status || "NA"}
        </span>
      </section>

      <section className="metrics-strip">
        <div className="metric metric-green">
          <span>Active chains</span>
          <strong>{summary.activeCount ?? 0}</strong>
          <small>{summary.chainCount ?? 0} chains tracked</small>
        </div>
        <div className="metric metric-gold">
          <span>Watch chains</span>
          <strong>{summary.watchCount ?? 0}</strong>
          <small>{summary.note || "NA"}</small>
        </div>
        <div className="metric">
          <span>Source coverage</span>
          <strong>{summary.sourceHealth?.successRatio ?? "NA"}%</strong>
          <small>
            live {summary.sourceHealth?.liveCount ?? 0} / fallback {summary.sourceHealth?.fallbackCount ?? 0}
          </small>
        </div>
        <div className="metric">
          <span>Generated</span>
          <strong>{formatTaipeiDateTime(rotation.generatedAt)}</strong>
          <small>{summary.sourceHealth?.provider || "not imported"}</small>
        </div>
      </section>

      <section className="panel">
        <div className="section-head compact">
          <div>
            <p>topic queue</p>
            <h2>可轉 Threads 的輪動線索</h2>
          </div>
        </div>
        <div className="data-audit-table">
          <div className="data-audit-row data-audit-head">
            <span>鏈條</span>
            <span>目前訊號</span>
            <span>下一棒</span>
            <span>命中率</span>
          </div>
          {rows.map((row) => (
            <div className="data-audit-row" key={row.id}>
              <strong>{row.name}</strong>
              <span>{bestStageLine(row)}</span>
              <span>{nextStageLine(row)}</span>
              <b>{Number.isFinite(row.historicalHitRate) ? `${row.historicalHitRate}% / n=${row.sampleSize}` : "NA"}</b>
            </div>
          ))}
          {!rows.length && (
            <div className="data-audit-row">
              <strong>資料尚未匯入</strong>
              <span>node scripts/rotation/importRotationSignals.mjs</span>
              <span>等待第一次產生</span>
              <b>NA</b>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
