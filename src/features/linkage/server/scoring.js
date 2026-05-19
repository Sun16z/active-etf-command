import { average, clamp, round, weightedAverage } from "../../market/server/marketData.js";

const IMPACT_MODELS = [
  {
    id: "00981A",
    name: "00981A",
    assetType: "主動 ETF",
    thesis: "台股成長與 AI 供應鏈彈性",
    factors: [
      { key: "SMH", label: "SMH 半導體 ETF", weight: 0.26 },
      { key: "QQQ", label: "Nasdaq 100", weight: 0.22 },
      { key: "TSM", label: "TSMC ADR", weight: 0.2 },
      { key: "NVDA", label: "NVIDIA", weight: 0.16 },
      { key: "riskOn", label: "風險偏好", weight: 0.16 },
    ],
  },
  {
    id: "00991A",
    name: "00991A",
    assetType: "主動 ETF",
    thesis: "科技創新與台積電供應鏈集中度",
    factors: [
      { key: "TSM", label: "TSMC ADR", weight: 0.27 },
      { key: "SMH", label: "SMH 半導體 ETF", weight: 0.24 },
      { key: "NVDA", label: "NVIDIA", weight: 0.2 },
      { key: "SOXX", label: "SOXX", weight: 0.14 },
      { key: "riskOn", label: "風險偏好", weight: 0.15 },
    ],
  },
  {
    id: "2330",
    name: "台積電",
    assetType: "台股",
    thesis: "ADR、半導體 ETF 與 AI 鏈同步",
    factors: [
      { key: "TSM", label: "TSMC ADR", weight: 0.35 },
      { key: "SMH", label: "SMH 半導體 ETF", weight: 0.22 },
      { key: "SOXX", label: "SOXX", weight: 0.16 },
      { key: "NVDA", label: "NVIDIA", weight: 0.15 },
      { key: "riskOn", label: "風險偏好", weight: 0.12 },
    ],
  },
  {
    id: "2454",
    name: "聯發科",
    assetType: "台股",
    thesis: "消費電子、AI 邊緣裝置與美元壓力",
    factors: [
      { key: "QQQ", label: "Nasdaq 100", weight: 0.24 },
      { key: "SMH", label: "SMH 半導體 ETF", weight: 0.22 },
      { key: "ARM", label: "Arm", weight: 0.18 },
      { key: "AMD", label: "AMD", weight: 0.14 },
      { key: "dollarEase", label: "美元壓力緩和", weight: 0.1 },
      { key: "riskOn", label: "風險偏好", weight: 0.12 },
    ],
  },
  {
    id: "8299",
    name: "群聯",
    assetType: "台股",
    thesis: "記憶體、AI 儲存與小型股風險偏好",
    factors: [
      { key: "MU", label: "Micron", weight: 0.26 },
      { key: "SMH", label: "SMH 半導體 ETF", weight: 0.2 },
      { key: "NVDA", label: "NVIDIA", weight: 0.16 },
      { key: "IWM", label: "Russell 2000", weight: 0.16 },
      { key: "QQQ", label: "Nasdaq 100", weight: 0.12 },
      { key: "riskOn", label: "風險偏好", weight: 0.1 },
    ],
  },
];

const GLOBAL_MARKETS = [
  { key: "ACWI", region: "全球", note: "全球股票同步度" },
  { key: "SPY", region: "美國", note: "S&P 500 權值大盤" },
  { key: "QQQ", region: "美國科技", note: "Nasdaq 100 成長股" },
  { key: "RSP", region: "美股廣度", note: "S&P 500 等權重" },
  { key: "EFA", region: "已開發 ex-US", note: "歐日澳等已開發市場" },
  { key: "VGK", region: "歐洲", note: "歐洲股票" },
  { key: "EWJ", region: "日本", note: "日本股票" },
  { key: "MCHI", region: "中國", note: "中國股票" },
  { key: "EEM", region: "新興市場", note: "新興市場股票" },
  { key: "INDA", region: "印度", note: "印度股票" },
  { key: "EWT", region: "台灣", note: "台灣股票 ETF" },
];

function assetMap(assets) {
  return new Map(assets.map((asset) => [asset.displaySymbol || asset.symbol, asset]));
}

function directAssetScore(asset) {
  if (!asset) return null;
  const day = Number.isFinite(asset.dayPct) ? asset.dayPct : 0;
  const five = Number.isFinite(asset.fiveDayPct) ? asset.fiveDayPct : 0;
  const twenty = Number.isFinite(asset.twentyDayPct) ? asset.twentyDayPct : 0;
  const volume = Number.isFinite(asset.volumeRatio) ? asset.volumeRatio : 1;
  const volumeTilt = clamp((volume - 1) * 8, -6, 8);
  return round(clamp(50 + day * 6.5 + five * 2.1 + twenty * 0.8 + volumeTilt), 1);
}

function inverseAssetScore(asset) {
  const score = directAssetScore(asset);
  return Number.isFinite(score) ? round(100 - score, 1) : null;
}

function scoreLabel(score) {
  if (!Number.isFinite(score)) return { label: "資料不足", tone: "neutral" };
  if (score >= 72) return { label: "強多", tone: "strong-up" };
  if (score >= 60) return { label: "偏多", tone: "up" };
  if (score >= 45) return { label: "中性", tone: "neutral" };
  if (score >= 34) return { label: "偏空", tone: "down" };
  return { label: "強空", tone: "strong-down" };
}

function riskLabel(score) {
  if (!Number.isFinite(score)) return { label: "資料不足", tone: "neutral", meaning: "資料不足" };
  if (score >= 72) return { label: "高風險", tone: "strong-down", meaning: "見高或急跌風險偏高" };
  if (score >= 56) return { label: "警戒", tone: "down", meaning: "轉弱風險升溫" };
  if (score >= 36) return { label: "觀察", tone: "neutral", meaning: "中性觀察" };
  return { label: "低風險", tone: "up", meaning: "尚未觸發主要風險" };
}

function pctDiff(a, b, field) {
  const left = a?.[field];
  const right = b?.[field];
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return left - right;
}

function riskSignal(id, name, score, value, sourceLabel, asOf, explain) {
  const label = riskLabel(score);
  return {
    id,
    name,
    score: round(score, 1),
    label: label.label,
    tone: label.tone,
    meaning: label.meaning,
    value,
    sourceLabel,
    asOf,
    explain,
  };
}

function riskOnScore(lookup) {
  const vix = lookup.get("VIX");
  const uup = lookup.get("UUP");
  const iwm = lookup.get("IWM");
  const tlt = lookup.get("TLT");
  const vixLevel = Number.isFinite(vix?.latest) ? vix.latest : 20;
  const vixPressure = clamp((vixLevel - 12) * 3.5, 0, 65);
  const volatilityRelief = clamp(85 - vixPressure);
  return round(
    weightedAverage([
      { value: volatilityRelief, weight: 0.42 },
      { value: inverseAssetScore(uup), weight: 0.18 },
      { value: directAssetScore(iwm), weight: 0.24 },
      { value: directAssetScore(tlt), weight: 0.16 },
    ]),
    1,
  );
}

function dollarEaseScore(lookup) {
  return inverseAssetScore(lookup.get("UUP"));
}

function groupScore(assets, group) {
  return round(average(assets.filter((asset) => asset.group === group).map(directAssetScore)), 1);
}

function buildGlobalHealth(lookup) {
  const rows = GLOBAL_MARKETS.map((market) => {
    const asset = lookup.get(market.key);
    const score = directAssetScore(asset);
    const label = scoreLabel(score);
    return {
      id: market.key,
      region: market.region,
      ticker: asset?.displaySymbol || market.key,
      name: asset?.label || market.key,
      role: asset?.role || market.note,
      note: market.note,
      latest: asset?.latest ?? null,
      currency: asset?.currency || "USD",
      dayPct: asset?.dayPct ?? null,
      fiveDayPct: asset?.fiveDayPct ?? null,
      twentyDayPct: asset?.twentyDayPct ?? null,
      score,
      label: label.label,
      tone: label.tone,
      asOf: asset?.lastTime || null,
      sourceLabel: asset?.source?.name || "Yahoo Finance chart",
    };
  });

  const spy = lookup.get("SPY");
  const qqq = lookup.get("QQQ");
  const rsp = lookup.get("RSP");
  const iwm = lookup.get("IWM");
  const smh = lookup.get("SMH");
  const acwi = lookup.get("ACWI");
  const vix = lookup.get("VIX");
  const vix3m = lookup.get("VIX3M");
  const vvix = lookup.get("VVIX");
  const skew = lookup.get("SKEW");
  const hyg = lookup.get("HYG");
  const lqd = lookup.get("LQD");
  const tlt = lookup.get("TLT");
  const uup = lookup.get("UUP");

  const vixCurve = Number.isFinite(vix?.latest) && Number.isFinite(vix3m?.latest) ? vix.latest - vix3m.latest : null;
  const breadth20 = pctDiff(rsp, spy, "twentyDayPct");
  const smallCap20 = pctDiff(iwm, spy, "twentyDayPct");
  const credit5 = pctDiff(hyg, lqd, "fiveDayPct");
  const credit20 = pctDiff(hyg, lqd, "twentyDayPct");
  const qqqVsRsp20 = pctDiff(qqq, rsp, "twentyDayPct");
  const smhVsAcwi20 = pctDiff(smh, acwi, "twentyDayPct");

  const riskSignals = [
    riskSignal(
      "vix-level",
      "VIX 波動率壓力",
      clamp((Number.isFinite(vix?.latest) ? vix.latest - 12 : 0) * 5 + Math.max(0, vix?.fiveDayPct || 0) * 1.2),
      Number.isFinite(vix?.latest) ? `${vix.latest.toFixed(2)} / 5日 ${vix.fiveDayPct?.toFixed?.(2) ?? "NA"}%` : "NA",
      "Yahoo Finance chart；指標定義 Cboe VIX",
      vix?.lastTime || null,
      "VIX 衡量 S&P 500 近 30 天隱含波動率；快速上升代表避險需求升高。",
    ),
    riskSignal(
      "vix-curve",
      "VIX 曲線倒掛",
      clamp(45 + (Number.isFinite(vixCurve) ? vixCurve : -3) * 12),
      Number.isFinite(vixCurve) ? `VIX - VIX3M ${vixCurve.toFixed(2)}` : "NA",
      "Yahoo Finance chart；指標定義 Cboe volatility indices",
      vix?.lastTime || vix3m?.lastTime || null,
      "VIX 高於 3 個月 VIX 時，短線恐慌通常高於常態遠期波動。",
    ),
    riskSignal(
      "skew-tail",
      "SKEW 尾端風險",
      clamp((Number.isFinite(skew?.latest) ? skew.latest - 125 : 0) * 2.2),
      Number.isFinite(skew?.latest) ? skew.latest.toFixed(2) : "NA",
      "Yahoo Finance chart；指標定義 Cboe SKEW",
      skew?.lastTime || null,
      "SKEW 偏高代表市場為極端下跌保護支付較高溢價。",
    ),
    riskSignal(
      "vvix-vol-of-vol",
      "VVIX 波動率的波動",
      clamp((Number.isFinite(vvix?.latest) ? vvix.latest - 80 : 0) * 2 + Math.max(0, vvix?.fiveDayPct || 0) * 1.1),
      Number.isFinite(vvix?.latest) ? `${vvix.latest.toFixed(2)} / 5日 ${vvix.fiveDayPct?.toFixed?.(2) ?? "NA"}%` : "NA",
      "Yahoo Finance chart；指標定義 Cboe VVIX",
      vvix?.lastTime || null,
      "VVIX 反映 VIX 選擇權隱含波動率，常用來觀察避險需求是否變得不穩定。",
    ),
    riskSignal(
      "breadth-divergence",
      "等權重落後市值權重",
      clamp(35 + Math.max(0, -(breadth20 || 0)) * 8 + (Number.isFinite(spy?.twentyDayPct) && spy.twentyDayPct > 5 ? 8 : 0)),
      Number.isFinite(breadth20) ? `RSP - SPY 20日 ${breadth20.toFixed(2)}%` : "NA",
      "Yahoo Finance chart；等權重概念 S&P Dow Jones Indices",
      rsp?.lastTime || spy?.lastTime || null,
      "大盤創高但等權重落後，代表漲勢可能集中在少數大型權值股。",
    ),
    riskSignal(
      "small-cap-divergence",
      "小型股相對弱勢",
      clamp(35 + Math.max(0, -(smallCap20 || 0)) * 6 + Math.max(0, -(iwm?.fiveDayPct || 0)) * 4),
      Number.isFinite(smallCap20) ? `IWM - SPY 20日 ${smallCap20.toFixed(2)}%` : "NA",
      "Yahoo Finance chart",
      iwm?.lastTime || spy?.lastTime || null,
      "小型股弱於大盤時，風險偏好與市場廣度通常較脆弱。",
    ),
    riskSignal(
      "credit-risk",
      "高收益信用壓力",
      clamp(35 + Math.max(0, -(credit5 || 0)) * 9 + Math.max(0, -(credit20 || 0)) * 5 + Math.max(0, -(hyg?.dayPct || 0)) * 8),
      Number.isFinite(credit5) && Number.isFinite(credit20) ? `HYG-LQD 5日 ${credit5.toFixed(2)}% / 20日 ${credit20.toFixed(2)}%` : "NA",
      "Yahoo Finance chart；信用利差概念參考 FRED HY OAS",
      hyg?.lastTime || lqd?.lastTime || null,
      "高收益債弱於投資級債，代表信用風險溢價可能升高。",
    ),
    riskSignal(
      "leadership-concentration",
      "科技領漲集中度",
      clamp(30 + Math.max(0, (qqqVsRsp20 || 0) - 4) * 5 + Math.max(0, (smhVsAcwi20 || 0) - 6) * 3),
      Number.isFinite(qqqVsRsp20) ? `QQQ-RSP 20日 ${qqqVsRsp20.toFixed(2)}%` : "NA",
      "Yahoo Finance chart",
      qqq?.lastTime || rsp?.lastTime || null,
      "科技與半導體過度領漲時，若廣度跟不上，見高後回檔會更敏感。",
    ),
    riskSignal(
      "macro-pressure",
      "美元與長債壓力",
      clamp(32 + Math.max(0, uup?.fiveDayPct || 0) * 7 + Math.max(0, -(tlt?.fiveDayPct || 0)) * 5),
      Number.isFinite(uup?.fiveDayPct) && Number.isFinite(tlt?.fiveDayPct) ? `UUP 5日 ${uup.fiveDayPct.toFixed(2)}% / TLT 5日 ${tlt.fiveDayPct.toFixed(2)}%` : "NA",
      "Yahoo Finance chart",
      uup?.lastTime || tlt?.lastTime || null,
      "美元轉強、長債轉弱時，成長股估值與全球流動性會承壓。",
    ),
  ].sort((a, b) => b.score - a.score);

  const healthScore = round(average(rows.map((row) => row.score)), 1);
  const topRiskScore = round(average(riskSignals.slice(0, 3).map((signal) => signal.score)), 1);
  const healthLabel = scoreLabel(healthScore);
  const topRiskLabel = riskLabel(topRiskScore);

  return {
    summary: {
      healthScore,
      healthLabel: healthLabel.label,
      healthTone: healthLabel.tone,
      topRiskScore,
      topRiskLabel: topRiskLabel.label,
      topRiskTone: topRiskLabel.tone,
      topRiskMeaning: topRiskLabel.meaning,
      interpretation: `健康分數越高代表全球股市同步轉強；風險分數越高代表美股見高或急跌風險升溫。`,
    },
    rows,
    riskSignals,
    sources: [
      { label: "Yahoo Finance chart endpoint", role: "即時/近即時價格、ETF 相對強弱" },
      { label: "Cboe VIX / VIX3M / VVIX / SKEW", role: "波動率、曲線與尾端風險定義" },
      { label: "FRED HY OAS", role: "高收益信用利差概念校準" },
      { label: "FINRA Margin Statistics", role: "月頻融資槓桿，後續可接入" },
    ],
  };
}

function topMovers(assets, count = 5) {
  return [...assets]
    .filter((asset) => Number.isFinite(asset.dayPct))
    .sort((a, b) => Math.abs(b.dayPct) - Math.abs(a.dayPct))
    .slice(0, count);
}

function buildWarnings(assets, lookup, pulse, globalHealth, macroRisk) {
  const warnings = [];
  const vix = lookup.get("VIX");
  if (Number.isFinite(vix?.latest) && vix.latest >= 22) {
    warnings.push({
      id: "vix-high",
      severity: "high",
      title: "VIX 高於 22",
      body: "隔日台股開盤容易放大震盪，先降低追價衝動。",
    });
  }
  if (pulse.semi.score <= 42) {
    warnings.push({
      id: "semi-weak",
      severity: "high",
      title: "半導體鏈偏弱",
      body: "00981A、00991A、台積電、聯發科、群聯都會受到拖累。",
    });
  }
  if (pulse.macro.score <= 38) {
    warnings.push({
      id: "macro-pressure",
      severity: "medium",
      title: "美元或利率壓力升高",
      body: "成長股估值與外資風險胃納可能承壓。",
    });
  }
  if (globalHealth?.summary?.topRiskScore >= 70) {
    const top = globalHealth.riskSignals?.[0];
    warnings.push({
      id: "global-top-risk",
      severity: "high",
      title: `美股見高風險升高：${top?.name || "風險指標"}`,
      body: `${top?.explain || "多項風險指標同步轉弱。"} 目前風險分數 ${globalHealth.summary.topRiskScore}。`,
    });
  } else if (globalHealth?.summary?.topRiskScore >= 56) {
    const top = globalHealth.riskSignals?.[0];
    warnings.push({
      id: "global-risk-watch",
      severity: "medium",
      title: `見高風險進入警戒：${top?.name || "風險指標"}`,
      body: `風險分數 ${globalHealth.summary.topRiskScore}，先觀察是否擴散到信用、廣度與波動率曲線。`,
    });
  }
  if (globalHealth?.summary?.healthScore <= 42) {
    warnings.push({
      id: "global-health-weak",
      severity: "high",
      title: "全球股市健康度偏弱",
      body: `全球健康分數 ${globalHealth.summary.healthScore}，若美股仍強，需提防漲勢集中與補跌。`,
    });
  }
  if (macroRisk?.summary?.score >= 75) {
    const top = macroRisk.indicators?.[0];
    warnings.push({
      id: "macro-risk-high",
      severity: "high",
      title: `宏觀壓力高：${top?.name || "壓力指標"}`,
      body: `${top?.explain || "宏觀壓力升溫。"} 綜合分數 ${macroRisk.summary.score}。`,
    });
  } else if (macroRisk?.summary?.score >= 60) {
    const top = macroRisk.indicators?.[0];
    warnings.push({
      id: "macro-risk-watch",
      severity: "medium",
      title: `宏觀壓力警戒：${top?.name || "壓力指標"}`,
      body: `宏觀壓力分數 ${macroRisk.summary.score}，最高壓力來源為 ${top?.name || "NA"}。`,
    });
  }
  topMovers(assets, 8)
    .filter((asset) => Math.abs(asset.dayPct) >= 3.5)
    .slice(0, 3)
    .forEach((asset) => {
      warnings.push({
        id: `move-${asset.displaySymbol}`,
        severity: Math.abs(asset.dayPct) >= 5 ? "high" : "medium",
        title: `${asset.displaySymbol} 單日 ${asset.dayPct > 0 ? "大漲" : "大跌"}`,
        body: `${asset.label} ${asset.dayPct > 0 ? "強勢" : "弱勢"} ${Math.abs(asset.dayPct).toFixed(2)}%，需放進隔日開盤情境。`,
      });
    });
  return warnings;
}

function buildPulse(assets, lookup) {
  const broadScore = groupScore(assets, "broad");
  const semiScore = groupScore(assets, "semi");
  const riskOn = riskOnScore(lookup);
  const dollarEase = dollarEaseScore(lookup);
  const macroScore = round(
    weightedAverage([
      { value: riskOn, weight: 0.55 },
      { value: dollarEase, weight: 0.25 },
      { value: directAssetScore(lookup.get("TLT")), weight: 0.2 },
    ]),
    1,
  );
  const overall = round(
    weightedAverage([
      { value: broadScore, weight: 0.36 },
      { value: semiScore, weight: 0.42 },
      { value: macroScore, weight: 0.22 },
    ]),
    1,
  );

  return {
    overall: { score: overall, ...scoreLabel(overall) },
    broad: { score: broadScore, ...scoreLabel(broadScore) },
    semi: { score: semiScore, ...scoreLabel(semiScore) },
    macro: { score: macroScore, ...scoreLabel(macroScore) },
    riskOn,
    dollarEase,
  };
}

function buildFactorScores(lookup, pulse) {
  const factorScores = {};
  for (const asset of lookup.values()) {
    factorScores[asset.displaySymbol || asset.symbol] = directAssetScore(asset);
  }
  factorScores.riskOn = pulse.riskOn;
  factorScores.dollarEase = pulse.dollarEase;
  return factorScores;
}

function buildImpactRows(factorScores) {
  return IMPACT_MODELS.map((model) => {
    const contributions = model.factors.map((factor) => {
      const value = factorScores[factor.key];
      const weighted = Number.isFinite(value) ? value * factor.weight : null;
      return {
        ...factor,
        score: round(value, 1),
        weighted: round(weighted, 1),
      };
    });
    const score = round(weightedAverage(contributions.map((item) => ({ value: item.score, weight: item.weight }))), 1);
    const label = scoreLabel(score);
    const strongest = [...contributions]
      .filter((item) => Number.isFinite(item.score))
      .sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50))
      .slice(0, 2);
    return {
      ...model,
      score,
      label: label.label,
      tone: label.tone,
      contributions,
      strongest,
      action:
        score >= 68
          ? "隔日偏進攻，等開盤量價確認"
          : score <= 38
            ? "隔日偏防守，優先觀察缺口與承接"
            : "隔日中性，等待台股自身量價表態",
    };
  });
}

function buildBrief(pulse, impacts, warnings) {
  const topImpact = [...impacts].sort((a, b) => b.score - a.score)[0];
  const weakImpact = [...impacts].sort((a, b) => a.score - b.score)[0];
  const warningText = warnings.length ? warnings[0].title : "暫無重大警訊";
  return {
    headline: `台美市場 ${pulse.overall.label}，半導體 ${pulse.semi.label}`,
    summary: `美股主線、AI 半導體與隔日台股持倉同步監控；目前影響最高為 ${topImpact.name}，最低為 ${weakImpact.name}。${warningText}。`,
    posture:
      pulse.overall.score >= 62
        ? "偏多監控"
        : pulse.overall.score <= 42
          ? "防守監控"
          : "區間監控",
  };
}

export function buildDashboardModel(assets, sourceHealth, events, macroRisk = null) {
  const lookup = assetMap(assets);
  const pulse = buildPulse(assets, lookup);
  const globalHealth = buildGlobalHealth(lookup);
  const factorScores = buildFactorScores(lookup, pulse);
  const impacts = buildImpactRows(factorScores);
  const warnings = buildWarnings(assets, lookup, pulse, globalHealth, macroRisk);
  const movers = {
    upside: [...assets].filter((asset) => Number.isFinite(asset.dayPct)).sort((a, b) => b.dayPct - a.dayPct).slice(0, 6),
    downside: [...assets].filter((asset) => Number.isFinite(asset.dayPct)).sort((a, b) => a.dayPct - b.dayPct).slice(0, 6),
    active: topMovers(assets, 8),
  };

  return {
    generatedAt: new Date().toISOString(),
    sourceHealth,
    pulse,
    brief: buildBrief(pulse, impacts, warnings),
    assets,
    impacts,
    globalHealth,
    macroRisk,
    warnings,
    movers,
    events,
    watchlists: {
      broad: assets.filter((asset) => asset.group === "broad"),
      global: assets.filter((asset) => asset.group === "global"),
      semi: assets.filter((asset) => asset.group === "semi"),
      macro: assets.filter((asset) => asset.group === "macro" || asset.group === "risk"),
      taiwan: assets.filter((asset) => asset.group === "taiwan"),
    },
  };
}

export { IMPACT_MODELS, buildGlobalHealth, directAssetScore, riskLabel, riskOnScore, scoreLabel };
