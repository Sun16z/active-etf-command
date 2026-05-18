import { ChevronRight } from "lucide-react";
import { adjustedAttackScore, formatPct, formatYi, isBondEtf, riskHoldingFootprint } from "../lib/analytics";
import { ProgressRail, Sparkline } from "./MiniCharts";

function tsmcEmptyLabel(etf) {
  const fundType = etf.fundType || "";
  if (isBondEtf(etf)) return "收益";
  if (fundType.includes("國內")) return "非台積";
  return "海外";
}

function yieldLabel(etf) {
  return etf.trailingYield == null ? "殖利率未揭露" : `殖利率 ${formatPct(etf.trailingYield)}`;
}

function CrowdingCell({ profile }) {
  if (!profile) return <span className="muted">低暴露</span>;

  return (
    <span className={`crowding-cell crowding-cell-${profile.tone}`}>
      <b>{profile.score}</b>
      <small>{profile.label}</small>
      {profile.topHotspot && <em>{profile.topHotspot.code}</em>}
    </span>
  );
}

function RiskFootprintCell({ footprint }) {
  if (!footprint.total) return <span className="muted">—</span>;

  const tone = footprint.attack > 0 ? "red" : "gold";
  return (
    <span className={`risk-footprint-cell risk-footprint-${tone}`}>
      <b>{footprint.total}</b>
      <small>攻擊 {footprint.attack} · 熱區 {footprint.crowding}</small>
      {footprint.topCodes.length > 0 && <em>{footprint.topCodes.slice(0, 2).join(" / ")}</em>}
    </span>
  );
}

export function EtfTable({ rows, selectedCode, onSelect, attackImpact = [], attackFreshness, assetMode = "all", sortMode = "command", crowdingProfiles = {} }) {
  const impactByCode = Object.fromEntries(attackImpact.map((row) => [row.code, row]));
  const showCrowding = sortMode === "crowding";
  const showIncome = !showCrowding && assetMode === "bond";

  return (
    <div className="table-wrap">
      <table className="etf-table">
        <thead>
          <tr>
            <th>ETF</th>
            <th>指揮分</th>
            <th>攻擊</th>
            <th>風險持股</th>
            <th>AUM</th>
            <th>折溢價</th>
            <th>{showCrowding ? "擁擠風險" : showIncome ? "收益品質" : "台積電"}</th>
            <th>近段走勢</th>
            <th aria-label="open"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((etf) => (
            <tr
              className={selectedCode === etf.code ? "active" : ""}
              key={etf.code}
              onClick={() => onSelect(etf)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSelect(etf);
              }}
            >
              <td>
                <strong className="mono">{etf.code}</strong>
                <span>{etf.name}</span>
                <small>{etf.issuer} · {etf.theme}</small>
              </td>
              <td>
                <b>{etf.commandScore}</b>
              </td>
              <td>
                {impactByCode[etf.code] ? (
                  <span className="attack-cell">
                    <b className="attack-score">{adjustedAttackScore(impactByCode[etf.code].score, attackFreshness)}</b>
                    {attackFreshness?.status !== "live" && <small>原 {impactByCode[etf.code].score}</small>}
                  </span>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
              <td>
                <RiskFootprintCell footprint={riskHoldingFootprint(impactByCode[etf.code], crowdingProfiles[etf.code])} />
              </td>
              <td>{formatYi(etf.aum)}</td>
              <td className={etf.premium >= 0 ? "up" : "down"}>{formatPct(etf.premium)}</td>
              <td>
                {showCrowding ? (
                  <CrowdingCell profile={crowdingProfiles[etf.code]} />
                ) : showIncome ? (
                  <span className="income-cell">
                    <b>{etf.incomeScore}</b>
                    <small>{yieldLabel(etf)}</small>
                    {etf.incomeRiskCount > 0 && <em>{etf.incomeRiskCount} 警示</em>}
                  </span>
                ) : etf.tsmcWeight > 0 ? (
                  <>
                    <span>{formatPct(etf.tsmcWeight)}</span>
                    <ProgressRail value={etf.tsmcWeight} max={25} tone={etf.tsmcWeight >= 18 ? "red" : "gold"} />
                  </>
                ) : (
                  <span className="muted">{tsmcEmptyLabel(etf)}</span>
                )}
              </td>
              <td>
                <Sparkline values={etf.pricePath} tone={etf.momentum >= 0 ? "green" : "red"} label={`${etf.code} price`} />
              </td>
              <td>
                <ChevronRight size={18} strokeWidth={2} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
