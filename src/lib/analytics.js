export function formatYi(value, digits = 1) {
  return `${Number(value || 0).toLocaleString("zh-TW", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })} 億`;
}

export function formatPct(value, digits = 2) {
  return `${Number(value || 0).toFixed(digits)}%`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

export function isBondEtf(etf) {
  return (etf.fundType || "").includes("債券");
}

function holdingsForEtf(etf) {
  return etf.holdings?.length ? etf.holdings : etf.topHoldings || [];
}

export function formatShares(value) {
  const abs = Math.abs(value || 0);
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}${Math.round(abs / 1000).toLocaleString("zh-TW")} 張`;
  return `${sign}${abs.toLocaleString("zh-TW")} 股`;
}

export function attackFreshnessWeight(freshness) {
  if (!freshness) return 0;
  if (freshness.status === "live") return 1;
  if (freshness.status === "stale") {
    const ageDays = Number(freshness.ageDays || 0);
    return Math.max(0.25, 1 - ageDays * 0.2);
  }
  if (freshness.status === "future") return 0.5;
  return 0;
}

export function adjustedAttackScore(score, freshness) {
  return Math.round(Number(score || 0) * attackFreshnessWeight(freshness));
}

export function riskHoldingFootprint(attackProfile, crowdingProfile) {
  const riskMap = new Map();
  const addRisk = (code, label) => {
    if (!code) return;
    const key = String(code);
    const row = riskMap.get(key) || { code: key, attack: false, crowding: false };
    if (label === "attack") row.attack = true;
    if (label === "crowding") row.crowding = true;
    riskMap.set(key, row);
  };

  (attackProfile?.symbols || []).forEach((symbol) => addRisk(symbol.symbol, "attack"));
  (crowdingProfile?.hotspots || []).forEach((hotspot) => addRisk(hotspot.code, "crowding"));

  const rows = [...riskMap.values()];
  return {
    total: rows.length,
    attack: rows.filter((row) => row.attack).length,
    crowding: rows.filter((row) => row.crowding).length,
    overlap: rows.filter((row) => row.attack && row.crowding).length,
    topCodes: rows
      .sort((a, b) => Number(b.attack) - Number(a.attack) || Number(b.crowding) - Number(a.crowding) || a.code.localeCompare(b.code))
      .map((row) => row.code),
  };
}

export function attackWeightLabel(freshness) {
  const weight = attackFreshnessWeight(freshness);
  if (freshness?.status === "live") return "攻擊權重 100%";
  if (freshness?.status === "stale") return `歷史降權 ${Math.round(weight * 100)}%`;
  if (freshness?.status === "future") return "日期異常 50%";
  return "攻擊權重 0%";
}

export function taipeiDateString(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatTaipeiDateTime(value) {
  if (!value) return "無檔案時間";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function intradayFreshness(meta, now = new Date()) {
  if (!meta?.asOf) {
    return {
      status: "missing",
      tone: "red",
      label: "未匯入",
      detail: "尚未找到盤中攻擊快取",
      ageDays: null,
      today: taipeiDateString(now),
      modifiedLabel: "無檔案時間",
    };
  }

  const today = taipeiDateString(now);
  const asOfMs = Date.parse(`${meta.asOf}T00:00:00+08:00`);
  const todayMs = Date.parse(`${today}T00:00:00+08:00`);
  const ageDays = Math.round((todayMs - asOfMs) / 86400000);
  const modifiedLabel = formatTaipeiDateTime(meta.sourceFileModifiedAt);

  if (ageDays === 0) {
    return {
      status: "live",
      tone: "green",
      label: "今日盤中",
      detail: `資料日 ${meta.asOf}，可作為今日盤中交集觀察。`,
      ageDays,
      today,
      modifiedLabel,
    };
  }

  if (ageDays > 0) {
    return {
      status: "stale",
      tone: "red",
      label: `過期 ${ageDays} 日`,
      detail: `資料日 ${meta.asOf}，台北今日 ${today}，目前僅適合歷史檢視。`,
      ageDays,
      today,
      modifiedLabel,
    };
  }

  return {
    status: "future",
    tone: "gold",
    label: "日期異常",
    detail: `資料日 ${meta.asOf} 晚於台北今日 ${today}，請檢查來源檔。`,
    ageDays,
    today,
    modifiedLabel,
  };
}

export function etfSnapshotFreshness(meta, now = new Date()) {
  const failedCodes = Array.isArray(meta?.failedCodes) ? meta.failedCodes : [];

  if (!meta?.asOf) {
    return {
      status: "missing",
      tone: "red",
      label: "未匯入",
      detail: "尚未匯入 ETF 真實快照",
      ageDays: null,
      today: taipeiDateString(now),
      generatedLabel: formatTaipeiDateTime(meta?.generatedAt),
      failedCount: failedCodes.length,
    };
  }

  const today = taipeiDateString(now);
  const asOfMs = Date.parse(`${meta.asOf}T00:00:00+08:00`);
  const todayMs = Date.parse(`${today}T00:00:00+08:00`);
  const ageDays = Math.round((todayMs - asOfMs) / 86400000);
  const generatedLabel = formatTaipeiDateTime(meta.generatedAt);

  if (failedCodes.length) {
    const codes = failedCodes.map((row) => row.code).filter(Boolean).join("、");
    return {
      status: "partial",
      tone: "gold",
      label: `部分失敗 ${failedCodes.length} 檔`,
      detail: `資料日 ${meta.asOf}，成功 ${meta.coverage || 0} 檔，失敗 ${codes || failedCodes.length}。`,
      ageDays,
      today,
      generatedLabel,
      failedCount: failedCodes.length,
    };
  }

  if (ageDays === 0) {
    return {
      status: "live",
      tone: "green",
      label: "今日真實",
      detail: `資料日 ${meta.asOf}，已匯入 ${meta.coverage || 0} 檔 ETF 真實快照。`,
      ageDays,
      today,
      generatedLabel,
      failedCount: 0,
    };
  }

  if (ageDays > 0) {
    return {
      status: "stale",
      tone: "red",
      label: `過期 ${ageDays} 日`,
      detail: `資料日 ${meta.asOf}，台北今日 ${today}，請重新刷新 ETF 快照。`,
      ageDays,
      today,
      generatedLabel,
      failedCount: 0,
    };
  }

  return {
    status: "future",
    tone: "gold",
    label: "日期異常",
    detail: `資料日 ${meta.asOf} 晚於台北今日 ${today}，請檢查來源資料。`,
    ageDays,
    today,
    generatedLabel,
    failedCount: 0,
  };
}

export function pctChange(path) {
  if (!path?.length) return 0;
  const first = path[0];
  const last = path[path.length - 1];
  return ((last - first) / first) * 100;
}

export function computeUniverse(etfs) {
  const totalAum = etfs.reduce((sum, etf) => sum + etf.aum, 0);
  const totalHolders = etfs.reduce((sum, etf) => sum + etf.holders, 0);
  const taiwanEtfs = etfs.filter((etf) => etf.tsmcWeight > 0);
  const tsmcExposure = taiwanEtfs.reduce((sum, etf) => sum + (etf.aum * etf.tsmcWeight) / 100, 0);
  const nearLimit = taiwanEtfs.filter((etf) => etf.tsmcWeight >= 18).length;
  const averagePremium = etfs.reduce((sum, etf) => sum + etf.premium, 0) / etfs.length;

  return {
    totalAum,
    totalHolders,
    tsmcExposure,
    nearLimit,
    averagePremium,
    activeAlerts: nearLimit + etfs.filter((etf) => Math.abs(etf.premium) > 1).length,
  };
}

export function buildConsensus(etfs) {
  const book = new Map();

  etfs.forEach((etf) => {
    const flowRows = etf.flowChanges || [...etf.adds, ...etf.cuts];
    flowRows
      .filter(([, , shares]) => shares > 0)
      .forEach(([code, name, shares, weight, detail = {}]) => {
      const row = book.get(code) || {
        code,
        name,
        industry: detail.industry || "未分類",
        buyEtfs: [],
        sellEtfs: [],
        netShares: 0,
        maxWeight: 0,
        buyTradeValue: 0,
        sellTradeValue: 0,
        netTradeValue: 0,
      };
      row.buyEtfs.push(etf.code);
      row.netShares += shares;
      row.maxWeight = Math.max(row.maxWeight, weight);
      row.buyTradeValue += Math.max(0, Number(detail.flowYi || 0));
      row.netTradeValue += Number(detail.flowYi || 0);
      book.set(code, row);
    });

    flowRows
      .filter(([, , shares]) => shares < 0)
      .forEach(([code, name, shares, weight, detail = {}]) => {
      const row = book.get(code) || {
        code,
        name,
        industry: detail.industry || "未分類",
        buyEtfs: [],
        sellEtfs: [],
        netShares: 0,
        maxWeight: 0,
        buyTradeValue: 0,
        sellTradeValue: 0,
        netTradeValue: 0,
      };
      row.sellEtfs.push(etf.code);
      row.netShares += shares;
      row.maxWeight = Math.max(row.maxWeight, weight);
      row.sellTradeValue += Math.min(0, Number(detail.flowYi || 0));
      row.netTradeValue += Number(detail.flowYi || 0);
      book.set(code, row);
    });
  });

  return [...book.values()]
    .map((row) => ({
      ...row,
      conviction: row.buyEtfs.length * 22 - row.sellEtfs.length * 18 + Math.min(row.maxWeight * 4, 30),
    }))
    .sort((a, b) => b.conviction - a.conviction);
}

export function buildFlowInsights(etfs, attackCross = []) {
  const stockBook = new Map();
  const industryBook = new Map();
  const etfBook = new Map();
  const overlapBook = new Map();
  const detailRows = [];
  const attackSymbols = new Set(attackCross.map((attack) => attack.symbol));

  etfs.forEach((etf) => {
    const etfRow = etfBook.get(etf.code) || {
      code: etf.code,
      name: etf.name,
      buyYi: 0,
      sellYi: 0,
      netYi: 0,
      changes: 0,
    };

    const flowRows = etf.flowChanges || [...etf.adds, ...etf.cuts];
    flowRows.forEach(([code, name, shares, weight, detail = {}]) => {
      const flowYi = Number(detail.flowYi || 0);
      const industry = detail.industry || "未分類";
      const isBuy = shares > 0;
      const stockRow = stockBook.get(code) || {
        code,
        name,
        industry,
        buyEtfs: [],
        sellEtfs: [],
        buyYi: 0,
        sellYi: 0,
        netYi: 0,
        netShares: 0,
        maxWeight: 0,
        attackHit: attackSymbols.has(code),
      };
      const industryRow = industryBook.get(industry) || {
        industry,
        buyYi: 0,
        sellYi: 0,
        netYi: 0,
        buyCount: 0,
        sellCount: 0,
      };

      if (isBuy) {
        stockRow.buyEtfs.push(etf.code);
        stockRow.buyYi += Math.max(0, flowYi);
        industryRow.buyYi += Math.max(0, flowYi);
        industryRow.buyCount += 1;
        etfRow.buyYi += Math.max(0, flowYi);
      } else {
        stockRow.sellEtfs.push(etf.code);
        stockRow.sellYi += Math.min(0, flowYi);
        industryRow.sellYi += Math.min(0, flowYi);
        industryRow.sellCount += 1;
        etfRow.sellYi += Math.min(0, flowYi);
      }

      stockRow.netYi += flowYi;
      stockRow.netShares += shares;
      stockRow.maxWeight = Math.max(stockRow.maxWeight, weight);
      industryRow.netYi += flowYi;
      etfRow.netYi += flowYi;
      etfRow.changes += 1;

      stockBook.set(code, stockRow);
      industryBook.set(industry, industryRow);
      detailRows.push({
        etfCode: etf.code,
        etfName: etf.name,
        code,
        name,
        industry,
        shares,
        weight,
        flowYi,
        typeLabel: detail.typeLabel || (isBuy ? "加碼" : "減碼"),
        attackHit: attackSymbols.has(code),
      });
    });

    etfBook.set(etf.code, etfRow);

    holdingsForEtf(etf).forEach(([code, name, weight]) => {
      const stockRow = overlapBook.get(code) || {
        code,
        name,
        etfs: [],
        holdings: [],
        totalWeight: 0,
        maxWeight: 0,
        exposureYi: 0,
        attackHit: attackSymbols.has(code),
      };
      const numericWeight = Number(weight || 0);
      const exposureYi = ((etf.aum || 0) * numericWeight) / 100;
      stockRow.etfs.push(etf.code);
      stockRow.holdings.push({
        etfCode: etf.code,
        etfName: etf.name,
        weight: numericWeight,
        exposureYi,
      });
      stockRow.totalWeight += numericWeight;
      stockRow.maxWeight = Math.max(stockRow.maxWeight, numericWeight);
      stockRow.exposureYi += exposureYi;
      overlapBook.set(code, stockRow);
    });
  });

  const stocks = [...stockBook.values()].sort((a, b) => Math.abs(b.netYi) - Math.abs(a.netYi));
  const industries = [...industryBook.values()].sort((a, b) => Math.abs(b.netYi) - Math.abs(a.netYi));
  const etfRows = [...etfBook.values()].sort((a, b) => Math.abs(b.netYi) - Math.abs(a.netYi));
  const overlapHotspots = [...overlapBook.values()]
    .map((row) => {
      const flowRow = stockBook.get(row.code);
      const etfCount = new Set(row.etfs).size;
      const netYi = Number(flowRow?.netYi || 0);
      return {
        ...row,
        etfCount,
        buyEtfs: flowRow?.buyEtfs || [],
        sellEtfs: flowRow?.sellEtfs || [],
        netYi,
        heatScore: Math.round(etfCount * 16 + row.totalWeight + row.exposureYi / 25 + Math.abs(netYi) / 10 + (row.attackHit ? 20 : 0)),
      };
    })
    .filter((row) => row.etfCount >= 2)
    .sort((a, b) => b.heatScore - a.heatScore);
  const totalBuyYi = stocks.reduce((sum, row) => sum + row.buyYi, 0);
  const totalSellYi = stocks.reduce((sum, row) => sum + row.sellYi, 0);

  return {
    totalBuyYi,
    totalSellYi,
    netYi: totalBuyYi + totalSellYi,
    buyEtfCount: etfRows.filter((row) => row.buyYi > 0).length,
    sellEtfCount: etfRows.filter((row) => row.sellYi < 0).length,
    stocks,
    industries,
    etfs: etfRows,
    overlapHotspots,
    detailRows: detailRows.sort((a, b) => Math.abs(b.flowYi) - Math.abs(a.flowYi)),
    attackMatchedStocks: stocks.filter((row) => row.attackHit),
  };
}

export function buildEtfCrowdingProfiles(overlapHotspots = []) {
  const book = new Map();

  overlapHotspots.forEach((hotspot) => {
    (hotspot.holdings || []).forEach((holding) => {
      const row = book.get(holding.etfCode) || {
        code: holding.etfCode,
        name: holding.etfName,
        score: 0,
        exposureYi: 0,
        attackHits: 0,
        hotspots: [],
      };
      const contribution = Math.round((hotspot.heatScore || 0) * Math.min(holding.weight || 0, 15) / 100);
      row.score += contribution;
      row.exposureYi += holding.exposureYi || 0;
      row.attackHits += hotspot.attackHit ? 1 : 0;
      row.hotspots.push({
        code: hotspot.code,
        name: hotspot.name,
        weight: holding.weight,
        exposureYi: holding.exposureYi,
        etfCount: hotspot.etfCount,
        totalWeight: hotspot.totalWeight,
        heatScore: hotspot.heatScore,
        contribution,
        attackHit: hotspot.attackHit,
        peerHoldings: [...(hotspot.holdings || [])]
          .sort((a, b) => (b.weight || 0) - (a.weight || 0))
          .map((peer) => ({
            code: peer.etfCode,
            name: peer.etfName,
            weight: peer.weight || 0,
            exposureYi: peer.exposureYi || 0,
            isCurrent: peer.etfCode === holding.etfCode,
          })),
      });
      book.set(holding.etfCode, row);
    });
  });

  return Object.fromEntries(
    [...book.values()].map((row) => {
      const sortedHotspots = row.hotspots.sort((a, b) => b.contribution - a.contribution);
      const tone = row.score >= 90 ? "red" : row.score >= 50 ? "gold" : "green";
      const label = row.score >= 90 ? "高擁擠" : row.score >= 50 ? "中擁擠" : "低擁擠";
      return [
        row.code,
        {
          ...row,
          hotspots: sortedHotspots,
          topHotspot: sortedHotspots[0],
          tone,
          label,
        },
      ];
    }),
  );
}

export function rankEtfs(etfs) {
  return [...etfs]
    .map((etf) => {
      const momentum = pctChange(etf.pricePath);
      const flowScore = etf.adds.length * 9 - etf.cuts.length * 6;
      const limitPenalty = etf.tsmcWeight > 25 ? -20 : etf.tsmcWeight > 18 ? -8 : 0;
      const scaleScore = Math.min(etf.aum / 35, 36);
      const premiumScore = Math.max(0, 10 - Math.abs(etf.premium) * 2);
      const incomeRiskFlags = buildIncomeRiskFlags(etf);
      return {
        ...etf,
        momentum,
        incomeScore: incomeQualityScore(etf),
        incomeRiskFlags,
        incomeRiskCount: incomeRiskFlags.length,
        commandScore: Math.round(scaleScore + momentum * 0.9 + flowScore + premiumScore + limitPenalty),
      };
    })
    .sort((a, b) => b.commandScore - a.commandScore);
}

export function incomeQualityScore(etf) {
  const yieldScore = etf.trailingYield == null ? 8 : clamp(etf.trailingYield * 5, 0, 30);
  const managementFee = etf.managementFee ?? etf.fee ?? 0;
  const custodyFee = etf.custodyFee ?? 0;
  const feeScore = clamp(20 - (managementFee + custodyFee) * 10, 0, 20);
  const premiumScore = clamp(18 - Math.abs(etf.premium || 0) * 18, 0, 18);
  const scaleScore = clamp((etf.aum || 0) / 1.2, 0, 18);
  const holderScore = clamp((etf.holders || 0) / 450, 0, 10);
  const dividendScore = {
    monthly: 14,
    quarterly: 9,
    "semi-annual": 5,
    annual: 3,
  }[etf.dividendFrequency] ?? 0;

  return Math.round(yieldScore + feeScore + premiumScore + scaleScore + holderScore + dividendScore);
}

export function buildIncomeRiskFlags(etf) {
  if (!isBondEtf(etf)) return [];

  const flags = [];
  const fee = Number(etf.managementFee ?? etf.fee ?? 0) + Number(etf.custodyFee ?? 0);

  if (etf.trailingYield == null) {
    flags.push({
      key: "yield-missing",
      label: "殖利率未揭露",
      detail: "近 12 月殖利率缺值，收益比較可信度較低。",
      tone: "gold",
    });
  } else if (etf.trailingYield < 1.5) {
    flags.push({
      key: "yield-low",
      label: "殖利率偏低",
      detail: `近 12 月殖利率 ${formatPct(etf.trailingYield)}，收益吸引力需與信用風險一起看。`,
      tone: "gold",
    });
  }

  if (Math.abs(etf.premium || 0) >= 0.35) {
    flags.push({
      key: "premium-wide",
      label: "折溢價偏離",
      detail: `目前折溢價 ${formatPct(etf.premium)}，進場價格需保留安全邊際。`,
      tone: "red",
    });
  }

  if (fee >= 0.75) {
    flags.push({
      key: "fee-high",
      label: "費率偏高",
      detail: `管理與保管費合計 ${formatPct(fee)}，會侵蝕長期配息效果。`,
      tone: "gold",
    });
  }

  if ((etf.aum || 0) < 10) {
    flags.push({
      key: "aum-small",
      label: "規模較小",
      detail: `AUM ${formatYi(etf.aum)}，流動性與追蹤穩定度需持續觀察。`,
      tone: "gold",
    });
  }

  if ((etf.holders || 0) < 3500) {
    flags.push({
      key: "holder-small",
      label: "受益人較少",
      detail: `受益人 ${Number(etf.holders || 0).toLocaleString("zh-TW")} 人，市場接受度仍在建立。`,
      tone: "gold",
    });
  }

  return flags;
}

export function tsmcRows(etfs) {
  return etfs
    .filter((etf) => etf.tsmcWeight > 0)
    .map((etf) => ({
      code: etf.code,
      name: etf.name,
      issuer: etf.issuer,
      weight: etf.tsmcWeight,
      shares: etf.tsmcShares,
      progress: etf.tsmcWeight / 25,
      headroom: etf.tsmcHeadroomYi,
      status: etf.tsmcWeight > 25 ? "legacy" : etf.tsmcWeight >= 18 ? "watch" : "room",
    }))
    .sort((a, b) => b.weight - a.weight);
}

export function buildAttackIntersections(etfs, attacks) {
  return attacks
    .map((attack) => {
      const matches = etfs
        .map((etf) => {
          const holding = holdingsForEtf(etf).find(([code]) => code === attack.symbol);
          const add = etf.adds.find(([code]) => code === attack.symbol);
          const cut = etf.cuts.find(([code]) => code === attack.symbol);
          if (!holding && !add && !cut) return null;

          const weight = holding?.[2] || add?.[3] || cut?.[3] || 0;
          const movement = add?.[2] || cut?.[2] || 0;
          return {
            code: etf.code,
            name: etf.name,
            issuer: etf.issuer,
            weight,
            movement,
            exposureYi: (etf.aum * weight) / 100,
            relation: holding ? "持股" : add ? "加碼" : "減碼",
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.exposureYi - a.exposureYi);

      const exposureYi = matches.reduce((sum, match) => sum + match.exposureYi, 0);
      const weightedScore = attack.maxScore + Math.min(exposureYi / 18, 35) + matches.length * 4;

      return {
        ...attack,
        matches,
        exposureYi,
        weightedScore,
      };
    })
    .filter((attack) => attack.matches.length > 0)
    .sort((a, b) => b.weightedScore - a.weightedScore);
}

export function buildEtfAttackImpact(attackCross) {
  const byEtf = new Map();

  attackCross.forEach((attack) => {
    attack.matches.forEach((match) => {
      const row = byEtf.get(match.code) || {
        code: match.code,
        name: match.name,
        issuer: match.issuer,
        exposureYi: 0,
        maxWeight: 0,
        attackCount: 0,
        addCount: 0,
        symbols: [],
        score: 0,
      };

      row.exposureYi += match.exposureYi;
      row.maxWeight = Math.max(row.maxWeight, match.weight);
      row.attackCount += 1;
      row.addCount += match.relation === "加碼" ? 1 : 0;
      row.symbols.push({
        symbol: attack.symbol,
        name: attack.name,
        relation: match.relation,
        weight: match.weight,
        exposureYi: match.exposureYi,
        attackScore: attack.maxScore || 0,
      });
      row.score += (attack.maxScore || 0) * (match.weight / 10) + match.exposureYi / 4;
      byEtf.set(match.code, row);
    });
  });

  return [...byEtf.values()]
    .map((row) => ({
      ...row,
      score: Math.round(row.score + row.addCount * 12 + row.attackCount * 5),
      symbols: row.symbols.sort((a, b) => b.exposureYi - a.exposureYi),
    }))
    .sort((a, b) => b.score - a.score);
}
