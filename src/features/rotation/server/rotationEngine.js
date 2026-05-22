import { round } from "../../market/server/marketData.js";

export const ROTATION_CHAINS = [
  {
    id: "passive_components_hike",
    name: "被動元件漲價週期",
    description: "上游原物料漲 -> 日系大廠漲價 -> 台廠龍頭 -> 代理商 -> 應用端",
    stages: [
      {
        stage: 1,
        name: "原物料上漲",
        entryCondition: { type: "commodity_change", symbols: ["SI=F", "HG=F"], period: "week", thresholdPct: 5 },
        stocks: [],
      },
      {
        stage: 2,
        name: "日系大廠漲價",
        entryCondition: { type: "overseas_price_change", symbols: ["6981.T", "6976.T"], period: "day", thresholdPct: 2 },
        stocks: [],
      },
      {
        stage: 3,
        name: "台廠龍頭啟動",
        entryCondition: { type: "stock_gain", stockCodes: ["2327", "2492"], periodDays: 5, thresholdPct: 8 },
        stocks: [
          { code: "2327", name: "國巨", typicalGainPctMin: 15, typicalGainPctMax: 40 },
          { code: "2492", name: "華新科", typicalGainPctMin: 12, typicalGainPctMax: 35 },
        ],
      },
      {
        stage: 4,
        name: "代理商/配件廠接棒",
        entryCondition: { type: "stock_gain", stockCodes: ["8043", "3014"], periodDays: 5, thresholdPct: 15 },
        lagFromPrevStageDaysMin: 7,
        lagFromPrevStageDaysMax: 14,
        stocks: [
          { code: "8043", name: "蜜望實", typicalGainPctMin: 30, typicalGainPctMax: 100 },
          { code: "3014", name: "聯陽", typicalGainPctMin: 20, typicalGainPctMax: 60 },
          { code: "2375", name: "凱美", typicalGainPctMin: 15, typicalGainPctMax: 50 },
        ],
      },
    ],
    historicalCycles: [
      { period: "2018-Q2", result: "hit" },
      { period: "2024-Q4", result: "hit" },
      { period: "2023-Q1", result: "miss" },
    ],
  },
  {
    id: "dram_cycle",
    name: "記憶體景氣循環",
    description: "DRAM 合約價月增 -> MU 上修 -> 台股記憶體 -> 通路商 -> 封測",
    stages: [
      {
        stage: 1,
        name: "DRAM 合約價月增",
        entryCondition: { type: "manual", description: "需人工查 DRAMeXchange / TrendForce 確認" },
        stocks: [],
      },
      {
        stage: 2,
        name: "海外龍頭上修財測",
        entryCondition: { type: "overseas_price_change", symbols: ["MU"], period: "month", thresholdPct: 10 },
        stocks: [],
      },
      {
        stage: 3,
        name: "台股記憶體模組",
        entryCondition: { type: "stock_gain", stockCodes: ["2344", "2408"], periodDays: 5, thresholdPct: 8 },
        stocks: [
          { code: "2344", name: "華邦電", typicalGainPctMin: 20, typicalGainPctMax: 60 },
          { code: "2408", name: "南亞科", typicalGainPctMin: 15, typicalGainPctMax: 50 },
        ],
      },
      {
        stage: 4,
        name: "DRAM 通路商",
        entryCondition: { type: "stock_gain", stockCodes: ["3260", "8299"], periodDays: 5, thresholdPct: 10 },
        lagFromPrevStageDaysMin: 5,
        lagFromPrevStageDaysMax: 14,
        stocks: [
          { code: "3260", name: "威剛", typicalGainPctMin: 20, typicalGainPctMax: 80 },
          { code: "8299", name: "群聯", typicalGainPctMin: 15, typicalGainPctMax: 50 },
        ],
      },
      {
        stage: 5,
        name: "封測",
        entryCondition: { type: "stock_gain", stockCodes: ["6239"], periodDays: 5, thresholdPct: 8 },
        lagFromPrevStageDaysMin: 7,
        lagFromPrevStageDaysMax: 21,
        stocks: [{ code: "6239", name: "力成", typicalGainPctMin: 15, typicalGainPctMax: 45 }],
      },
    ],
    historicalCycles: [
      { period: "2023-Q3", result: "hit" },
      { period: "2022-Q4", result: "miss" },
    ],
  },
  {
    id: "ai_server_cycle",
    name: "AI 伺服器需求週期",
    description: "NVDA 重要發布 -> 台積電/先進封裝 -> ABF 載板 -> 散熱 -> 電源",
    stages: [
      {
        stage: 1,
        name: "NVDA 重大發布或財測上修",
        entryCondition: { type: "overseas_price_change", symbols: ["NVDA"], period: "week", thresholdPct: 8 },
        stocks: [],
      },
      {
        stage: 2,
        name: "台積電/先進封裝",
        entryCondition: { type: "stock_gain", stockCodes: ["2330"], periodDays: 5, thresholdPct: 5 },
        stocks: [
          { code: "2330", name: "台積電", typicalGainPctMin: 8, typicalGainPctMax: 25 },
          { code: "3711", name: "日月光投控", typicalGainPctMin: 8, typicalGainPctMax: 20 },
        ],
      },
      {
        stage: 3,
        name: "ABF 載板",
        entryCondition: { type: "stock_gain", stockCodes: ["8046", "3037"], periodDays: 5, thresholdPct: 8 },
        lagFromPrevStageDaysMin: 3,
        lagFromPrevStageDaysMax: 10,
        stocks: [
          { code: "8046", name: "南電", typicalGainPctMin: 15, typicalGainPctMax: 50 },
          { code: "3037", name: "欣興", typicalGainPctMin: 12, typicalGainPctMax: 40 },
        ],
      },
      {
        stage: 4,
        name: "散熱族群",
        entryCondition: { type: "stock_gain", stockCodes: ["3017", "6230"], periodDays: 5, thresholdPct: 10 },
        lagFromPrevStageDaysMin: 5,
        lagFromPrevStageDaysMax: 14,
        stocks: [
          { code: "3017", name: "奇鋐", typicalGainPctMin: 20, typicalGainPctMax: 60 },
          { code: "6230", name: "超眾", typicalGainPctMin: 15, typicalGainPctMax: 45 },
        ],
      },
      {
        stage: 5,
        name: "電源供應器",
        entryCondition: { type: "stock_gain", stockCodes: ["2308", "6409"], periodDays: 5, thresholdPct: 8 },
        lagFromPrevStageDaysMin: 7,
        lagFromPrevStageDaysMax: 21,
        stocks: [
          { code: "2308", name: "台達電", typicalGainPctMin: 10, typicalGainPctMax: 35 },
          { code: "6409", name: "旭隼", typicalGainPctMin: 15, typicalGainPctMax: 50 },
        ],
      },
    ],
    historicalCycles: [
      { period: "2023-Q1", result: "hit" },
      { period: "2024-Q2", result: "hit" },
    ],
  },
];

export const ROTATION_SYMBOLS = [
  { symbol: "SI=F", label: "Silver Futures", group: "commodity", role: "被動元件成本" },
  { symbol: "HG=F", label: "Copper Futures", group: "commodity", role: "電線/被動元件成本" },
  { symbol: "6981.T", label: "Murata", group: "japan", role: "被動元件先行" },
  { symbol: "6976.T", label: "Taiyo Yuden", group: "japan", role: "被動元件先行" },
  { symbol: "MU", label: "Micron", group: "memory", role: "DRAM/HBM 先行" },
  { symbol: "NVDA", label: "NVIDIA", group: "ai", role: "AI 伺服器先行" },
  { symbol: "2327.TW", displaySymbol: "2327", label: "國巨", group: "tw-passive", role: "被動元件龍頭" },
  { symbol: "2492.TW", displaySymbol: "2492", label: "華新科", group: "tw-passive", role: "被動元件龍頭" },
  { symbol: "8043.TWO", displaySymbol: "8043", label: "蜜望實", group: "tw-passive", role: "代理商/配件" },
  { symbol: "3014.TW", displaySymbol: "3014", label: "聯陽", group: "tw-passive", role: "代理商/配件" },
  { symbol: "2375.TW", displaySymbol: "2375", label: "凱美", group: "tw-passive", role: "代理商/配件" },
  { symbol: "2344.TW", displaySymbol: "2344", label: "華邦電", group: "tw-memory", role: "記憶體模組" },
  { symbol: "2408.TW", displaySymbol: "2408", label: "南亞科", group: "tw-memory", role: "記憶體模組" },
  { symbol: "3260.TWO", displaySymbol: "3260", label: "威剛", group: "tw-memory", role: "DRAM 通路" },
  { symbol: "8299.TWO", displaySymbol: "8299", label: "群聯", group: "tw-memory", role: "NAND 控制/通路" },
  { symbol: "6239.TW", displaySymbol: "6239", label: "力成", group: "tw-memory", role: "封測" },
  { symbol: "2330.TW", displaySymbol: "2330", label: "台積電", group: "tw-ai", role: "先進製程" },
  { symbol: "3711.TW", displaySymbol: "3711", label: "日月光投控", group: "tw-ai", role: "先進封裝" },
  { symbol: "8046.TW", displaySymbol: "8046", label: "南電", group: "tw-ai", role: "ABF 載板" },
  { symbol: "3037.TW", displaySymbol: "3037", label: "欣興", group: "tw-ai", role: "ABF 載板" },
  { symbol: "3017.TW", displaySymbol: "3017", label: "奇鋐", group: "tw-ai", role: "散熱" },
  { symbol: "6230.TW", displaySymbol: "6230", label: "超眾", group: "tw-ai", role: "散熱" },
  { symbol: "2308.TW", displaySymbol: "2308", label: "台達電", group: "tw-ai", role: "電源" },
  { symbol: "6409.TW", displaySymbol: "6409", label: "旭隼", group: "tw-ai", role: "電源" },
];

function getChangePct(data, condition) {
  if (!data) return null;
  if (condition.period === "day" || condition.periodDays === 1) return data.dayPct;
  if (condition.period === "month") return data.twentyDayPct;
  return data.fiveDayPct;
}

function periodLabel(condition) {
  if (condition.period === "day" || condition.periodDays === 1) return "1d";
  if (condition.period === "month") return "20d";
  return "5d";
}

function evaluateStage(stage, priceMap) {
  const condition = stage.entryCondition || {};
  const base = {
    stage: stage.stage,
    name: stage.name,
    triggered: false,
    thresholdPct: condition.thresholdPct ?? null,
    conditionType: condition.type || "unknown",
    priceData: [],
  };

  if (condition.type === "manual" || condition.type === "exit_signal") {
    return {
      ...base,
      manual: true,
      note: condition.description || "manual confirmation required",
    };
  }

  const symbols = condition.symbols || [];
  const stockCodes = condition.stockCodes || [];
  const allCodes = [...symbols, ...stockCodes];
  const details = allCodes.map((code) => {
    const data = priceMap.get(code);
    const changePct = getChangePct(data, condition);
    return {
      symbol: code,
      name: data?.label || data?.displaySymbol || code,
      changePct: round(changePct, 2),
      period: periodLabel(condition),
      sourceStatus: data?.source?.status || "missing",
      asOf: data?.lastTime || null,
    };
  });

  const triggered = details.some((row) => Number.isFinite(row.changePct) && row.changePct >= condition.thresholdPct);
  const best = details
    .filter((row) => Number.isFinite(row.changePct))
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))[0] || null;

  return {
    ...base,
    triggered,
    priceData: details,
    best,
  };
}

function historicalHitRate(chain) {
  const cycles = chain.historicalCycles || [];
  if (!cycles.length) return { rate: null, n: 0 };
  const hits = cycles.filter((cycle) => cycle.result === "hit").length;
  return { rate: round((hits / cycles.length) * 100, 0), n: cycles.length };
}

function buildPriceMap(assets = []) {
  const map = new Map();
  assets.forEach((asset) => {
    map.set(asset.displaySymbol || asset.symbol, asset);
    map.set(asset.symbol, asset);
  });
  return map;
}

export function runRotationEngine({ chains = ROTATION_CHAINS, assets = [], generatedAt = new Date().toISOString(), sourceHealth = null } = {}) {
  const priceMap = buildPriceMap(assets);
  const rows = chains.map((chain) => {
    const stages = chain.stages.map((stage) => evaluateStage(stage, priceMap));
    const triggeredStages = stages.filter((stage) => stage.triggered);
    const currentStage = triggeredStages.length ? Math.max(...triggeredStages.map((stage) => stage.stage)) : null;
    const nextStage = Number.isFinite(currentStage)
      ? chain.stages.find((stage) => stage.stage === currentStage + 1) || null
      : chain.stages.find((stage) => !stage.manual) || null;
    const hitRate = historicalHitRate(chain);
    const confidence =
      triggeredStages.length >= 3 ? "high" : triggeredStages.length === 2 ? "medium" : triggeredStages.length === 1 ? "low" : "watch";

    return {
      id: chain.id,
      name: chain.name,
      description: chain.description,
      status: triggeredStages.length ? "active" : "watch",
      confidence,
      currentStage,
      totalStages: chain.stages.length,
      triggeredCount: triggeredStages.length,
      historicalHitRate: hitRate.rate,
      sampleSize: hitRate.n,
      stages,
      nextStage,
      threadsDraft: buildThreadsDraft({ chain, stages, nextStage, hitRate }),
    };
  });

  const active = rows.filter((row) => row.status === "active").sort((a, b) => b.triggeredCount - a.triggeredCount);
  const watch = rows.filter((row) => row.status !== "active");

  return {
    generatedAt,
    summary: {
      status: sourceHealth?.status || "unknown",
      activeCount: active.length,
      watchCount: watch.length,
      chainCount: rows.length,
      sourceHealth,
      note: "輪動訊號以 Yahoo chart endpoint 估算，人工事件與 DRAM 現貨/合約價需另行確認。",
    },
    active,
    watch,
    rows,
  };
}

export function buildThreadsDraft({ chain, stages, nextStage, hitRate }) {
  const triggeredLines = stages
    .filter((stage) => stage.triggered)
    .map((stage) => {
      const best = stage.best;
      const bestText = best ? `${best.name} ${best.changePct > 0 ? "+" : ""}${best.changePct}%/${best.period}` : "triggered";
      return `第${stage.stage}棒 ${stage.name}: ${bestText}`;
    });
  const nextStocks = nextStage?.stocks?.map((stock) => `${stock.name} ${stock.code}`).join(" / ") || "待確認";
  const hitRateText = Number.isFinite(hitRate?.rate) ? `歷史命中 ${hitRate.rate}% (n=${hitRate.n})` : "歷史樣本不足";

  return [
    `${chain.name} 有輪動訊號嗎？`,
    "",
    triggeredLines.length ? triggeredLines.join("\n") : "目前尚未觸發量化條件。",
    "",
    `下一棒觀察: ${nextStocks}`,
    hitRateText,
    "",
    "資料來源: Yahoo chart endpoint + 本地輪動知識庫。人工事件仍需最後確認。",
  ].join("\n");
}
