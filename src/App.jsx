import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Bell,
  CalendarClock,
  Check,
  Copy,
  Database,
  Eye,
  Gauge,
  LineChart,
  ListFilter,
  Pin,
  PinOff,
  Radar,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Trash2,
  WalletCards,
  Zap,
} from "lucide-react";
import { etfs, reports, snapshotMeta, watchlist } from "./data/etfUniverse";
import { dailyEtfSummaries, dailyMovementMeta, dailyMovements } from "./data/dailyMovements";
import { intradayAttackMeta, intradayAttacks } from "./data/intradayAttacks";
import {
  adjustedAttackScore,
  attackWeightLabel,
  buildAttackIntersections,
  buildEtfAttackImpact,
  buildEtfCrowdingProfiles,
  buildConsensus,
  buildFlowInsights,
  computeUniverse,
  etfSnapshotFreshness,
  formatPct,
  formatShares,
  formatTaipeiDateTime,
  formatYi,
  intradayFreshness,
  isBondEtf,
  rankEtfs,
  riskHoldingFootprint,
  tsmcRows,
} from "./lib/analytics";
import { EtfTable } from "./components/EtfTable";
import { MetricTile } from "./components/MetricTile";
import { ProgressRail, Sparkline, WeightBars } from "./components/MiniCharts";
import { SecHunterView } from "./features/sec/components/SecHunterView";

const navItems = [
  ["dashboard", "總控台", BarChart3],
  ["daily", "每日變化", ArrowLeftRight],
  ["sec", "SEC Hunter", ShieldCheck],
  ["matrix", "ETF 矩陣", ListFilter],
  ["flow", "共識資金流", Radar],
  ["attack", "盤中攻擊", Zap],
  ["tsmc", "25% 監管雷達", Gauge],
  ["reports", "報告中心", CalendarClock],
];
const viewKeys = navItems.map(([key]) => key);
const sortKeys = ["command", "attack", "risk", "aum", "tsmc", "income", "crowding"];
const assetKeys = ["all", "tw", "global", "bond"];
const briefFormats = [
  ["telegram", "Telegram"],
  ["threads", "Threads"],
  ["research", "研究稿"],
];
const timelineFormats = [
  ["telegram", "Telegram"],
  ["threads", "Threads"],
];
const timelineDiffModes = [
  ["latest", "最新區間"],
  ["all", "全部區間"],
];
const dataRefreshCommand = "npm run refresh:data";
const refreshCommandHistoryKey = "activeEtfCommand.refreshCommandHistory.v1";

function buildScopedRefreshCommand(codes = []) {
  const scopedCodes = [...new Set(codes.map((code) => String(code || "").trim()).filter(Boolean))];
  if (!scopedCodes.length) return dataRefreshCommand;
  return `ACTIVE_ETF_CODES=${scopedCodes.join(",")} ${dataRefreshCommand}`;
}

function normalizeRefreshCommandHistory(rows = []) {
  const cleanRows = rows.filter(Boolean);
  const pinnedRows = cleanRows.filter((row) => row.pinned);
  const recentRows = cleanRows.filter((row) => !row.pinned).slice(0, 5);
  return [...pinnedRows, ...recentRows];
}

function loadRefreshCommandHistory() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(refreshCommandHistoryKey) || "[]");
    return Array.isArray(parsed) ? normalizeRefreshCommandHistory(parsed) : [];
  } catch {
    return [];
  }
}

function saveRefreshCommandHistory(rows) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(refreshCommandHistoryKey, JSON.stringify(normalizeRefreshCommandHistory(rows)));
  } catch {
    // localStorage may be unavailable in locked-down browser contexts.
  }
}

function classifyEtfAsset(etf) {
  const type = etf.fundType || "";
  if (isBondEtf(etf)) return "bond";
  if (type.includes("國外")) return "global";
  if (type.includes("國內")) return "tw";
  return "all";
}

function assetLabel(key) {
  return {
    all: "全部",
    tw: "台股",
    global: "海外股票",
    bond: "收益債券",
  }[key] || "全部";
}

function readUrlState() {
  if (typeof window === "undefined") {
    return { view: "dashboard", query: "", etf: "", sortMode: "command", assetMode: "all", holding: "" };
  }

  const params = new URLSearchParams(window.location.search);
  const view = viewKeys.includes(params.get("view")) ? params.get("view") : "dashboard";
  const sortMode = sortKeys.includes(params.get("sort")) ? params.get("sort") : "command";
  const assetMode = assetKeys.includes(params.get("asset")) ? params.get("asset") : "all";
  return {
    view,
    query: params.get("q") || "",
    etf: params.get("etf") || "",
    sortMode,
    assetMode,
    holding: params.get("holding") || "",
  };
}

function writeUrlState({ view, query, selectedCode, sortMode, assetMode, holdingCode }) {
  if (typeof window === "undefined") return;

  const next = buildUrlPath({ view, query, selectedCode, sortMode, assetMode, holdingCode });
  window.history.replaceState(null, "", next);
}

function buildUrlPath({ view, query, selectedCode, sortMode, assetMode, holdingCode }) {
  const params = new URLSearchParams();
  if (view !== "dashboard") params.set("view", view);
  if (query.trim()) params.set("q", query.trim());
  if (selectedCode) params.set("etf", selectedCode);
  if (sortMode !== "command") params.set("sort", sortMode);
  if (assetMode && assetMode !== "all") params.set("asset", assetMode);
  if (selectedCode && holdingCode) params.set("holding", holdingCode);

  return `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
}

function buildResearchUrl(state) {
  if (typeof window === "undefined") return "";
  return new URL(buildUrlPath(state), window.location.origin).toString();
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the selection-based copy path for locked-down browsers.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const didCopy = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!didCopy) {
    throw new Error("Clipboard copy failed");
  }
}

function addDaysToDateString(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

function taipeiClockParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function nextDailyRefresh(now = new Date()) {
  const clock = taipeiClockParts(now);
  const nextDate = clock.hour >= 19 ? addDaysToDateString(clock.date, 1) : clock.date;
  const isToday = nextDate === clock.date;

  return {
    value: `${nextDate} 19:00`,
    detail: isToday ? "今日台北 19:00 重抓 ETF 與攻擊資料。" : `今日 19:00 已過，下一次為 ${nextDate} 19:00。`,
    tone: isToday ? "cyan" : "gold",
  };
}

function App() {
  const initialState = useMemo(() => readUrlState(), []);
  const [view, setView] = useState(initialState.view);
  const [query, setQuery] = useState(initialState.query);
  const [sortMode, setSortMode] = useState(initialState.sortMode);
  const [assetMode, setAssetMode] = useState(initialState.assetMode);
  const [copyStatus, setCopyStatus] = useState("idle");
  const [holdingFocus, setHoldingFocus] = useState(() =>
    initialState.etf && initialState.holding
      ? { etfCode: initialState.etf, holdingCode: initialState.holding, nonce: Date.now() }
      : null,
  );
  const ranked = useMemo(() => rankEtfs(etfs), []);
  const [selected, setSelected] = useState(() => ranked.find((row) => row.code === initialState.etf) || ranked[0]);
  const universe = useMemo(() => computeUniverse(etfs), []);
  const consensus = useMemo(() => buildConsensus(etfs), []);
  const attackCross = useMemo(() => buildAttackIntersections(etfs, intradayAttacks), []);
  const attackImpact = useMemo(() => buildEtfAttackImpact(attackCross), [attackCross]);
  const flowInsights = useMemo(() => buildFlowInsights(etfs, attackCross), [attackCross]);
  const crowdingProfiles = useMemo(() => buildEtfCrowdingProfiles(flowInsights.overlapHotspots), [flowInsights]);
  const attackFreshness = useMemo(() => intradayFreshness(intradayAttackMeta), []);
  const etfFreshness = useMemo(() => etfSnapshotFreshness(snapshotMeta), []);
  const tsmc = useMemo(() => tsmcRows(etfs), []);
  const focusedHoldingCode = holdingFocus?.etfCode === selected?.code ? holdingFocus.holdingCode : "";
  const researchUrl = useMemo(
    () =>
      buildResearchUrl({
        view,
        query,
        selectedCode: selected?.code,
        sortMode,
        assetMode,
        holdingCode: focusedHoldingCode,
      }),
    [assetMode, focusedHoldingCode, query, selected?.code, sortMode, view],
  );
  const assetCounts = useMemo(
    () =>
      ranked.reduce(
        (counts, etf) => {
          const key = classifyEtfAsset(etf);
          counts.all += 1;
          counts[key] = (counts[key] || 0) + 1;
          return counts;
        },
        { all: 0, tw: 0, global: 0, bond: 0 },
      ),
    [ranked],
  );
  const filtered = useMemo(
    () =>
      ranked.filter((etf) => {
        const haystack = `${etf.code} ${etf.name} ${etf.fullName || ""} ${etf.issuer} ${etf.theme} ${etf.fundType || ""}`.toLowerCase();
        const matchesSearch = haystack.includes(query.trim().toLowerCase());
        const matchesAsset = assetMode === "all" || classifyEtfAsset(etf) === assetMode;
        return matchesSearch && matchesAsset;
      }),
    [assetMode, query, ranked],
  );
  const openEtf = (code) => {
    const etf = ranked.find((row) => row.code === code);
    if (!etf) return;
    setQuery("");
    setAssetMode("all");
    setSelected(etf);
    setView("matrix");
  };
  useEffect(() => {
    writeUrlState({
      view,
      query,
      selectedCode: selected?.code,
      sortMode,
      assetMode,
      holdingCode: focusedHoldingCode,
    });
  }, [assetMode, focusedHoldingCode, query, selected?.code, sortMode, view]);
  useEffect(() => {
    if (view !== "matrix" || !filtered.length || filtered.some((etf) => etf.code === selected?.code)) return;
    setSelected(filtered[0]);
  }, [filtered, selected?.code, view]);
  useEffect(() => {
    if (copyStatus === "idle") return undefined;
    const timeout = window.setTimeout(() => setCopyStatus("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyStatus]);
  const copyResearchLink = async () => {
    const url = buildResearchUrl({
      view,
      query,
      selectedCode: selected?.code,
      sortMode,
      assetMode,
      holdingCode: focusedHoldingCode,
    });
    try {
      await copyText(url);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };

  return (
    <main className="app-shell">
      <aside className="side">
        <div className="brand">
          <span className="brand-mark"><Activity size={19} /></span>
          <div>
            <strong>ETF Command</strong>
            <small>Active Taiwan Research</small>
          </div>
        </div>

        <nav aria-label="主功能">
          {navItems.map(([key, label, Icon]) => (
            <button className={view === key ? "active" : ""} key={key} type="button" onClick={() => setView(key)}>
              <Icon size={17} strokeWidth={2} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="source-panel">
          <Database size={17} />
          <span>資料日 {snapshotMeta.asOf}</span>
          <small>{snapshotMeta.coverage} 檔 ETF · {snapshotMeta.marketClose}</small>
          <small className={`source-status source-status-${etfFreshness.status}`}>{etfFreshness.label}</small>
          <small>{snapshotMeta.source || "Live ETF feed"}</small>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>台灣主動 ETF 研究工作台</p>
            <h1>{viewTitle(view)}</h1>
          </div>
          <div className="topbar-actions">
            <label className="search">
              <Search size={18} aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋 ETF / 投信 / 主題" />
            </label>
            <button
              className={`share-button ${copyStatus !== "idle" ? "active" : ""} ${focusedHoldingCode ? "has-focus" : ""}`}
              type="button"
              onClick={copyResearchLink}
              title={focusedHoldingCode ? `複製包含聚焦持股 ${focusedHoldingCode} 的研究連結` : "複製目前研究連結"}
              aria-label={focusedHoldingCode ? `複製包含聚焦持股 ${focusedHoldingCode} 的研究連結` : "複製目前研究連結"}
            >
              {copyStatus === "copied" ? <Check size={17} /> : <Copy size={17} />}
              <span>{copyStatus === "copied" ? "已複製" : copyStatus === "error" ? "複製失敗" : focusedHoldingCode ? "複製聚焦連結" : "複製連結"}</span>
            </button>
            {focusedHoldingCode && (
              <span className="focus-link-badge" aria-label={`目前研究連結已包含聚焦持股 ${focusedHoldingCode}`}>
                已包含聚焦持股 <b className="mono">{focusedHoldingCode}</b>
              </span>
            )}
          </div>
        </header>

        {view === "dashboard" && (
          <Dashboard
            universe={universe}
            ranked={ranked}
            selected={selected}
            setSelected={setSelected}
            setView={setView}
            setSortMode={setSortMode}
            setAssetMode={setAssetMode}
            holdingFocus={holdingFocus}
            setHoldingFocus={setHoldingFocus}
            consensus={consensus}
            attackCross={attackCross}
            attackImpact={attackImpact}
            attackFreshness={attackFreshness}
            etfFreshness={etfFreshness}
            tsmc={tsmc}
            researchUrl={researchUrl}
            compareRows={ranked}
            crowdingProfiles={crowdingProfiles}
          />
        )}
        {view === "daily" && <DailyMovements query={query} onOpenEtf={openEtf} />}
        {view === "sec" && <SecHunterView />}
        {view === "matrix" && (
          <Matrix
            rows={filtered}
            selected={selected}
            setSelected={setSelected}
            attackImpact={attackImpact}
            attackFreshness={attackFreshness}
            sortMode={sortMode}
            setSortMode={setSortMode}
            assetMode={assetMode}
            setAssetMode={setAssetMode}
            assetCounts={assetCounts}
            researchUrl={researchUrl}
            compareRows={filtered.length ? filtered : ranked}
            crowdingProfiles={crowdingProfiles}
            holdingFocus={holdingFocus}
            setHoldingFocus={setHoldingFocus}
          />
        )}
        {view === "flow" && <Flow consensus={consensus} watchlist={watchlist} insights={flowInsights} />}
        {view === "attack" && (
          <Attack attackCross={attackCross} attackImpact={attackImpact} freshness={attackFreshness} onOpenEtf={openEtf} />
        )}
        {view === "tsmc" && <Tsmc rows={tsmc} universe={universe} />}
        {view === "reports" && <Reports />}
      </section>
    </main>
  );
}

function viewTitle(view) {
  return {
    dashboard: "盤後總控",
    daily: "每日換股雷達",
    sec: "SEC Hunter",
    matrix: "ETF 評分矩陣",
    flow: "共識加減碼雷達",
    attack: "盤中攻擊交集",
    tsmc: "台積電權重與上限",
    reports: "早報與週報中心",
  }[view];
}

const qualityFields = [
  ["price", "市價"],
  ["nav", "NAV"],
  ["aum", "AUM"],
  ["premium", "折溢價"],
  ["fullName", "基金全名"],
  ["fundType", "基金類型"],
  ["manager", "經理人"],
  ["launchDate", "成立日"],
  ["sourceUrl", "來源頁"],
  [(etf) => etf.dataDate, "資料日"],
  [(etf) => etf.holdings?.length, "完整持股"],
  [(etf) => etf.topHoldings?.length, "前五大持股"],
];

function hasQualityValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && value !== "" && value !== 0;
}

function missingQualityLabels(etf) {
  const missing = qualityFields
    .filter(([field]) => {
      const value = typeof field === "function" ? field(etf) : etf[field];
      return !hasQualityValue(value);
    })
    .map(([, label]) => label);

  if (isBondEtf(etf) && etf.trailingYield == null) missing.push("近 12 月殖利率");
  return missing;
}

function buildQualityRadar({ ranked, etfFreshness, attackFreshness }) {
  const failedCodes = Array.isArray(snapshotMeta.failedCodes) ? snapshotMeta.failedCodes : [];
  const gaps = ranked
    .map((etf) => ({ code: etf.code, name: etf.name, missing: missingQualityLabels(etf) }))
    .filter((row) => row.missing.length > 0);
  const cleanCount = ranked.length - gaps.length;
  const coverage = snapshotMeta.coverage || ranked.length;
  const attackSymbols = intradayAttackMeta.symbols || 0;
  const attackRows = intradayAttackMeta.sourceRows || 0;

  return {
    rows: [
      {
        label: "ETF 快照",
        value: etfFreshness.label,
        detail: etfFreshness.detail,
        tone: etfFreshness.tone,
      },
      {
        label: "匯入覆蓋",
        value: `${coverage}/${ranked.length} 檔`,
        detail: failedCodes.length ? `失敗 ${failedCodes.map((row) => row.code).filter(Boolean).join("、")}` : "失敗 0 檔",
        tone: failedCodes.length ? "gold" : "green",
      },
      {
        label: "核心欄位",
        value: `${cleanCount}/${ranked.length} 完整`,
        detail: gaps.length ? `${gaps[0].code} 缺 ${gaps[0].missing.join("、")}` : "核心欄位完整",
        tone: gaps.length ? "gold" : "green",
      },
      {
        label: "盤中攻擊",
        value: attackFreshness.label,
        detail: `${attackSymbols} 檔攻擊股 / ${attackRows} 筆事件；${attackFreshness.detail}`,
        tone: attackFreshness.tone,
      },
    ],
    gaps,
  };
}

function Dashboard({ universe, ranked, selected, setSelected, setView, setSortMode, setAssetMode, holdingFocus, setHoldingFocus, consensus, attackCross, attackImpact, attackFreshness, etfFreshness, tsmc, researchUrl, compareRows, crowdingProfiles }) {
  const [dashboardHoldingFocus, setDashboardHoldingFocus] = useState(null);
  const qualityRadar = useMemo(() => buildQualityRadar({ ranked, etfFreshness, attackFreshness }), [attackFreshness, etfFreshness, ranked]);
  const crowdingAlerts = useMemo(() => buildCrowdingAlerts(crowdingProfiles), [crowdingProfiles]);
  const riskLeaders = useMemo(() => buildRiskHoldingLeaders(ranked, attackImpact, crowdingProfiles), [attackImpact, crowdingProfiles, ranked]);
  const dataAuditRows = useMemo(() => buildEtfDataAuditRows(ranked, etfFreshness, attackImpact, crowdingProfiles), [attackImpact, crowdingProfiles, etfFreshness, ranked]);
  const openCrowdingMatrix = () => {
    setAssetMode("all");
    setSortMode("crowding");
    setView("matrix");
  };
  const openRiskMatrix = () => {
    setAssetMode("all");
    setSortMode("risk");
    setView("matrix");
  };
  const focusHolding = (etfCode, holdingCode) => {
    const etf = ranked.find((row) => row.code === etfCode);
    if (!etf) return;
    const nextFocus = { etfCode, holdingCode, nonce: Date.now() };
    setSelected(etf);
    setDashboardHoldingFocus(nextFocus);
    setHoldingFocus?.(nextFocus);
  };

  return (
    <div className="page-grid">
      <section className="metrics-strip">
        <MetricTile icon={ShieldCheck} label="ETF 資料健康" value={etfFreshness.label} sub={etfFreshness.detail} tone={etfFreshness.tone} />
        <MetricTile icon={WalletCards} label="主動 ETF AUM" value={formatYi(universe.totalAum, 0)} sub="真實快照彙總" tone="gold" />
        <MetricTile icon={Eye} label="受益人數" value={universe.totalHolders.toLocaleString("zh-TW")} sub="跨 ETF 追蹤" tone="green" />
        <MetricTile icon={TrendingUp} label="台積電曝險" value={formatYi(universe.tsmcExposure, 1)} sub="台股型 ETF 加總" tone="red" />
        <MetricTile icon={Bell} label="盤中攻擊交集" value={attackCross.length} sub={attackFreshness.label} tone={attackFreshness.tone} />
      </section>

      <DataQualityRadar radar={qualityRadar} />

      <RefreshPriorityPanel etfFreshness={etfFreshness} attackFreshness={attackFreshness} />

      <EtfDataAuditPanel
        rows={dataAuditRows}
        selectedCode={selected.code}
        onSelect={(code) => {
          const etf = ranked.find((row) => row.code === code);
          if (etf) setSelected(etf);
        }}
      />

      <CrowdingAlertBoard
        rows={crowdingAlerts}
        selectedCode={selected.code}
        onOpenMatrix={openCrowdingMatrix}
        onSelect={(code) => {
          const etf = ranked.find((row) => row.code === code);
          if (etf) setSelected(etf);
        }}
      />

      <RiskHoldingLeaders
        rows={riskLeaders}
        selectedCode={selected.code}
        onOpenMatrix={openRiskMatrix}
        onSelect={(code) => {
          const etf = ranked.find((row) => row.code === code);
          if (etf) setSelected(etf);
        }}
        onFocusHolding={(etfCode, holdingCode) => {
          focusHolding(etfCode, holdingCode);
        }}
      />

      <section className="panel lead-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">Command Score</span>
            <h2>今日強勢 ETF 排名</h2>
          </div>
          <small>{snapshotMeta.asOf}</small>
        </div>
        <EtfTable rows={ranked.slice(0, 5)} selectedCode={selected.code} onSelect={setSelected} attackImpact={attackImpact} attackFreshness={attackFreshness} />
      </section>

      <EtfDetail
        etf={selected}
        attackImpact={attackImpact}
        attackFreshness={attackFreshness}
        researchUrl={researchUrl}
        compareRows={compareRows}
        crowdingProfile={crowdingProfiles[selected.code]}
        holdingFocus={dashboardHoldingFocus || holdingFocus}
        onFocusHolding={focusHolding}
        onClearHoldingFocus={() => {
          setDashboardHoldingFocus(null);
          setHoldingFocus?.(null);
        }}
      />

      <section className="panel compact-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">Consensus Radar</span>
            <h2>共識加碼前五名</h2>
          </div>
        </div>
        <div className="signal-list">
          {consensus.slice(0, 5).map((row) => (
            <SignalRow key={row.code} row={row} />
          ))}
        </div>
      </section>

      <AttackSummary attackCross={attackCross} />

      <section className="panel compact-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">TSMC Limit</span>
            <h2>接近 25% 名單</h2>
          </div>
        </div>
        <div className="limit-list">
          {tsmc.slice(0, 5).map((row) => (
            <div className="limit-row" key={row.code}>
              <div>
                <strong>{row.code}</strong>
                <span>{row.name}</span>
              </div>
              <b>{formatPct(row.weight)}</b>
              <ProgressRail value={row.weight} max={25} tone={row.weight >= 18 ? "red" : "gold"} label={`${row.code} 台積電權重`} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const movementTypeFilters = [
  ["all", "全部"],
  ["buy", "加碼"],
  ["sell", "減碼"],
  ["weight", "權重"],
];

const movementSortModes = [
  ["value", "估值"],
  ["weight", "權重"],
  ["shares", "張數"],
];

function movementTone(row) {
  if (row.estimatedValueYi > 0 || ["新增", "加碼"].includes(row.typeLabel)) return "buy";
  if (row.estimatedValueYi < 0 || ["刪除", "減碼"].includes(row.typeLabel)) return "sell";
  return "weight";
}

function formatLots(value) {
  const numeric = Number(value || 0);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toLocaleString("zh-TW")} 張`;
}

function formatMovementValue(value) {
  const numeric = Number(value || 0);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${formatYi(numeric, Math.abs(numeric) >= 10 ? 1 : 2)}`;
}

function barPercent(value, maxValue, min = 3) {
  const max = Math.max(Math.abs(maxValue || 0), 0.01);
  return Math.max(min, Math.min(100, (Math.abs(value || 0) / max) * 100));
}

function buildDailyBrief(rows, summaries, date) {
  const leadingBuy = rows.find((row) => row.estimatedValueYi > 0);
  const leadingSell = rows.find((row) => row.estimatedValueYi < 0);
  const strongestEtf = summaries
    .filter((summary) => summary.date === date)
    .sort((a, b) => Math.abs(b.netValueYi) - Math.abs(a.netValueYi))[0];
  const parts = [];
  if (strongestEtf) {
    parts.push(`${strongestEtf.etfCode} 淨變動 ${formatMovementValue(strongestEtf.netValueYi)}`);
  }
  if (leadingBuy) {
    parts.push(`最大加碼 ${leadingBuy.etfCode} ${leadingBuy.stockName} ${formatMovementValue(leadingBuy.estimatedValueYi)}`);
  }
  if (leadingSell) {
    parts.push(`最大減碼 ${leadingSell.etfCode} ${leadingSell.stockName} ${formatMovementValue(leadingSell.estimatedValueYi)}`);
  }
  return parts.length ? parts.join("；") : "該日未匯入可比較的換股事件";
}

function buildStockFlowRows(rows) {
  const byStock = new Map();
  rows.forEach((row) => {
    const current =
      byStock.get(row.stockCode) ||
      {
        stockCode: row.stockCode,
        stockName: row.stockName,
        industry: row.industry,
        buyValueYi: 0,
        sellValueYi: 0,
        netValueYi: 0,
        totalValueYi: 0,
        buyEtfs: new Set(),
        sellEtfs: new Set(),
        rows: 0,
      };
    if (["新增", "加碼"].includes(row.typeLabel)) {
      current.buyValueYi += Math.max(0, row.estimatedValueYi);
      current.buyEtfs.add(row.etfCode);
    }
    if (["刪除", "減碼"].includes(row.typeLabel)) {
      current.sellValueYi += Math.min(0, row.estimatedValueYi);
      current.sellEtfs.add(row.etfCode);
    }
    current.netValueYi += row.estimatedValueYi;
    current.totalValueYi += Math.abs(row.estimatedValueYi);
    current.rows += 1;
    byStock.set(row.stockCode, current);
  });

  return [...byStock.values()]
    .map((row) => ({
      ...row,
      buyEtfs: [...row.buyEtfs].sort(),
      sellEtfs: [...row.sellEtfs].sort(),
      buyValueYi: Number(row.buyValueYi.toFixed(2)),
      sellValueYi: Number(row.sellValueYi.toFixed(2)),
      netValueYi: Number(row.netValueYi.toFixed(2)),
      totalValueYi: Number(row.totalValueYi.toFixed(2)),
    }))
    .filter((row) => row.totalValueYi > 0)
    .sort((a, b) => b.totalValueYi - a.totalValueYi || Math.abs(b.netValueYi) - Math.abs(a.netValueYi));
}

function MovementLeaderBoard({ title, rows, tone, emptyText, onOpenEtf }) {
  return (
    <section className={`movement-board movement-board-${tone}`}>
      <div className="movement-board-head">
        <h3>{title}</h3>
        <span>{rows.length} 筆</span>
      </div>
      <div className="movement-board-list">
        {rows.slice(0, 6).map((row, index) => (
          <button type="button" className="movement-board-row" key={`${title}-${row.id}`} onClick={() => onOpenEtf(row.etfCode)}>
            <b>{index + 1}</b>
            <div>
              <strong>{row.stockName}</strong>
              <small>{row.etfCode} · {row.typeLabel} · {row.industry}</small>
            </div>
            <span className={tone === "buy" ? "up" : "down"}>{formatMovementValue(row.estimatedValueYi)}</span>
          </button>
        ))}
        {!rows.length && <div className="empty-line">{emptyText}</div>}
      </div>
    </section>
  );
}

function EtfNetFlowBoard({ rows, onOpenEtf }) {
  return (
    <section className="movement-board movement-board-net">
      <div className="movement-board-head">
        <h3>ETF 淨流向</h3>
        <span>{rows.length} 檔</span>
      </div>
      <div className="movement-board-list">
        {rows.slice(0, 6).map((summary, index) => (
          <button type="button" className="movement-board-row" key={`${summary.date}-${summary.etfCode}`} onClick={() => onOpenEtf(summary.etfCode)}>
            <b>{index + 1}</b>
            <div>
              <strong>{summary.etfCode}</strong>
              <small>加碼 {summary.addCount} · 減碼 {summary.cutCount} · 權重 {summary.weightOnlyCount}</small>
            </div>
            <span className={summary.netValueYi >= 0 ? "up" : "down"}>{formatMovementValue(summary.netValueYi)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function StockFlowBoard({ rows }) {
  return (
    <section className="movement-board movement-board-stock">
      <div className="movement-board-head">
        <h3>個股同步流向</h3>
        <span>{rows.length} 檔</span>
      </div>
      <div className="movement-board-list">
        {rows.slice(0, 6).map((row, index) => (
          <div className="movement-board-row stock-flow-row" key={row.stockCode}>
            <b>{index + 1}</b>
            <div>
              <strong>{row.stockName}</strong>
              <small>
                買 {row.buyEtfs.join("、") || "無"} · 賣 {row.sellEtfs.join("、") || "無"}
              </small>
            </div>
            <span className={row.netValueYi >= 0 ? "up" : "down"}>{formatMovementValue(row.netValueYi)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MovementBarList({ title, rows, tone, valueKey = "estimatedValueYi", labelKey = "stockName", subLabel }) {
  const maxValue = Math.max(...rows.map((row) => Math.abs(Number(row[valueKey] || 0))), 0);

  return (
    <section className={`movement-chart-card movement-chart-${tone}`}>
      <div className="movement-chart-head">
        <div>
          <span className="eyebrow">{tone === "buy" ? "Buy Value" : tone === "sell" ? "Sell Value" : "Net Flow"}</span>
          <h3>{title}</h3>
        </div>
        <small>依估算金額排序</small>
      </div>
      <div className="movement-bar-list">
        {rows.slice(0, 8).map((row, index) => {
          const value = Number(row[valueKey] || 0);
          const percent = barPercent(value, maxValue);
          return (
            <div className="movement-bar-row" key={`${title}-${row.id || row.etfCode || row.stockCode}-${index}`}>
              <div className="movement-bar-label">
                <b>{row[labelKey]}</b>
                <small>{subLabel(row)}</small>
              </div>
              <div className="movement-bar-track" aria-label={`${row[labelKey]} ${formatMovementValue(value)}`}>
                <span className={`movement-bar-fill movement-bar-${value >= 0 ? "buy" : "sell"}`} style={{ "--bar-width": `${percent}%` }} />
              </div>
              <strong className={value >= 0 ? "up" : "down"}>{formatMovementValue(value)}</strong>
            </div>
          );
        })}
        {!rows.length && <div className="empty-line">這個條件下沒有可畫圖的資料</div>}
      </div>
    </section>
  );
}

function NetFlowBarChart({ rows, onOpenEtf }) {
  const maxValue = Math.max(...rows.map((row) => Math.abs(Number(row.netValueYi || 0))), 0);

  return (
    <section className="movement-chart-card movement-chart-net">
      <div className="movement-chart-head">
        <div>
          <span className="eyebrow">ETF Net Flow</span>
          <h3>ETF 淨加減碼長條</h3>
        </div>
        <small>正值偏加碼，負值偏減碼</small>
      </div>
      <div className="movement-net-chart">
        {rows.slice(0, 10).map((row, index) => {
          const value = Number(row.netValueYi || 0);
          const percent = barPercent(value, maxValue, 4);
          return (
            <button className="net-chart-row" type="button" key={`${row.date}-${row.etfCode}-${index}`} onClick={() => onOpenEtf(row.etfCode)}>
              <span className="mono">{row.etfCode}</span>
              <div className="net-chart-track">
                <i className={value >= 0 ? "net-positive" : "net-negative"} style={{ "--bar-width": `${percent}%` }} />
              </div>
              <b className={value >= 0 ? "up" : "down"}>{formatMovementValue(value)}</b>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DailyMovementCharts({ buyLeaders, sellLeaders, dateSummaries, onOpenEtf }) {
  return (
    <section className="daily-chart-grid">
      <MovementBarList
        title="加碼價值長條"
        rows={buyLeaders}
        tone="buy"
        subLabel={(row) => `${row.etfCode} · ${row.typeLabel} · ${formatPct(row.weightDelta)}`}
      />
      <MovementBarList
        title="減碼價值長條"
        rows={sellLeaders}
        tone="sell"
        subLabel={(row) => `${row.etfCode} · ${row.typeLabel} · ${formatPct(row.weightDelta)}`}
      />
      <NetFlowBarChart rows={dateSummaries} onOpenEtf={onOpenEtf} />
    </section>
  );
}

function DailyMovements({ query, onOpenEtf }) {
  const dateOptions = useMemo(() => [...(dailyMovementMeta.dates || [])].reverse(), []);
  const etfOptions = useMemo(() => [...(dailyMovementMeta.etfCodes || [])], []);
  const [date, setDate] = useState(dateOptions[0] || dailyMovementMeta.asOf || "");
  const [etfCode, setEtfCode] = useState("all");
  const [typeMode, setTypeMode] = useState("all");
  const [sortMode, setSortMode] = useState("value");

  const baseRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return dailyMovements
      .filter((row) => row.date === date)
      .filter((row) => etfCode === "all" || row.etfCode === etfCode)
      .filter((row) => {
        if (!normalizedQuery) return true;
        const haystack = `${row.etfCode} ${row.etfName} ${row.stockCode} ${row.stockName} ${row.industry} ${row.typeLabel}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      });
  }, [date, etfCode, query]);

  const filteredRows = useMemo(() => {
    const matchesType = (row) => {
      if (typeMode === "buy") return ["新增", "加碼"].includes(row.typeLabel);
      if (typeMode === "sell") return ["刪除", "減碼"].includes(row.typeLabel);
      if (typeMode === "weight") return row.typeLabel === "權重變動";
      return true;
    };
    const comparators = {
      value: (a, b) => b.absEstimatedValueYi - a.absEstimatedValueYi,
      weight: (a, b) => Math.abs(b.weightDelta) - Math.abs(a.weightDelta),
      shares: (a, b) => Math.abs(b.deltaLots) - Math.abs(a.deltaLots),
    };
    return baseRows
      .filter(matchesType)
      .sort(comparators[sortMode] || comparators.value);
  }, [baseRows, sortMode, typeMode]);

  const dateSummaries = useMemo(
    () =>
      dailyEtfSummaries
        .filter((summary) => summary.date === date)
        .filter((summary) => etfCode === "all" || summary.etfCode === etfCode)
        .sort((a, b) => Math.abs(b.netValueYi) - Math.abs(a.netValueYi)),
    [date, etfCode],
  );
  const buyValue = filteredRows.filter((row) => row.estimatedValueYi > 0).reduce((sum, row) => sum + row.estimatedValueYi, 0);
  const sellValue = filteredRows.filter((row) => row.estimatedValueYi < 0).reduce((sum, row) => sum + row.estimatedValueYi, 0);
  const stockCount = new Set(filteredRows.map((row) => row.stockCode)).size;
  const dailyBrief = buildDailyBrief(filteredRows, dateSummaries, date);
  const buyLeaders = useMemo(
    () => baseRows.filter((row) => ["新增", "加碼"].includes(row.typeLabel)).sort((a, b) => b.absEstimatedValueYi - a.absEstimatedValueYi),
    [baseRows],
  );
  const sellLeaders = useMemo(
    () => baseRows.filter((row) => ["刪除", "減碼"].includes(row.typeLabel)).sort((a, b) => b.absEstimatedValueYi - a.absEstimatedValueYi),
    [baseRows],
  );
  const stockFlowRows = useMemo(() => buildStockFlowRows(baseRows), [baseRows]);
  const sourceHealthRows = dailyMovementMeta.sourceHealth || [];

  useEffect(() => {
    if (dateOptions.length && !dateOptions.includes(date)) setDate(dateOptions[0]);
  }, [date, dateOptions]);

  return (
    <div className="daily-layout">
      <section className="metrics-strip">
        <MetricTile icon={CalendarClock} label="資料日期" value={date || "-"} sub={`${dailyMovementMeta.fromDate} 起累積 ${dailyMovementMeta.rowCount} 筆`} tone="gold" />
        <MetricTile icon={TrendingUp} label="估算加碼" value={formatMovementValue(buyValue)} sub={`${filteredRows.filter((row) => row.estimatedValueYi > 0).length} 筆正向變化`} tone="green" />
        <MetricTile icon={AlertTriangle} label="估算減碼" value={formatMovementValue(sellValue)} sub={`${filteredRows.filter((row) => row.estimatedValueYi < 0).length} 筆負向變化`} tone="red" />
        <MetricTile icon={Database} label="覆蓋 ETF" value={`${dateSummaries.length} 檔`} sub={`${stockCount} 檔個股有變動`} tone="cyan" />
      </section>

      <section className="panel daily-command-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">Daily Switch Radar</span>
            <h2>主動式 ETF 每日持倉變化查詢</h2>
          </div>
          <span className="badge">{dailyMovementMeta.source}</span>
        </div>
        <p className="daily-brief">{dailyBrief}</p>
        <div className="daily-controls">
          <label>
            <span>日期</span>
            <select value={date} onChange={(event) => setDate(event.target.value)}>
              {dateOptions.map((item) => (
                <option value={item} key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span>ETF</span>
            <select value={etfCode} onChange={(event) => setEtfCode(event.target.value)}>
              <option value="all">全部 ETF</option>
              {etfOptions.map((code) => (
                <option value={code} key={code}>{code}</option>
              ))}
            </select>
          </label>
          <div className="segmented">
            {movementTypeFilters.map(([key, label]) => (
              <button className={typeMode === key ? "active" : ""} key={key} type="button" onClick={() => setTypeMode(key)}>
                {label}
              </button>
            ))}
          </div>
          <div className="segmented">
            {movementSortModes.map(([key, label]) => (
              <button className={sortMode === key ? "active" : ""} key={key} type="button" onClick={() => setSortMode(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <DailyMovementCharts buyLeaders={buyLeaders} sellLeaders={sellLeaders} dateSummaries={dateSummaries} onOpenEtf={onOpenEtf} />

      <section className="daily-radar-grid">
        <MovementLeaderBoard title="加碼價值榜" rows={buyLeaders} tone="buy" emptyText="這個日期沒有加碼資料" onOpenEtf={onOpenEtf} />
        <MovementLeaderBoard title="減碼價值榜" rows={sellLeaders} tone="sell" emptyText="這個日期沒有減碼資料" onOpenEtf={onOpenEtf} />
        <EtfNetFlowBoard rows={dateSummaries} onOpenEtf={onOpenEtf} />
        <StockFlowBoard rows={stockFlowRows} />
      </section>

      <section className="daily-summary-grid">
        {dateSummaries.slice(0, 8).map((summary) => (
          <button className="daily-summary-card" type="button" key={`${summary.date}-${summary.etfCode}`} onClick={() => onOpenEtf(summary.etfCode)}>
            <div>
              <strong className="mono">{summary.etfCode}</strong>
              <span>{summary.etfName}</span>
            </div>
            <b className={summary.netValueYi >= 0 ? "up" : "down"}>{formatMovementValue(summary.netValueYi)}</b>
            <small>加碼 {summary.addCount} · 減碼 {summary.cutCount} · 權重 {summary.weightOnlyCount}</small>
          </button>
        ))}
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">Movement Table</span>
            <h2>每日變化明細</h2>
          </div>
          <span className="badge">{filteredRows.length} 筆</span>
        </div>
        <div className="table-wrap daily-table-wrap">
          <table className="etf-table daily-movement-table">
            <thead>
              <tr>
                <th>ETF</th>
                <th>股票</th>
                <th>動作</th>
                <th>權重變化</th>
                <th>張數變化</th>
                <th>估算金額</th>
                <th>來源</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr className={`movement-${movementTone(row)}`} key={row.id}>
                  <td>
                    <button className="link-button mono" type="button" onClick={() => onOpenEtf(row.etfCode)}>{row.etfCode}</button>
                    <span>{row.etfName}</span>
                    <small>{row.fromDate} → {row.toDate}</small>
                  </td>
                  <td>
                    <strong>{row.stockName}</strong>
                    <small className="mono">{row.stockCode} · {row.industry}</small>
                  </td>
                  <td><span className={`movement-pill movement-pill-${movementTone(row)}`}>{row.typeLabel}</span></td>
                  <td className={row.weightDelta >= 0 ? "up" : "down"}>{formatPct(row.weightDelta)}</td>
                  <td className={row.deltaLots >= 0 ? "up" : "down"}>{formatLots(row.deltaLots)}</td>
                  <td className={row.estimatedValueYi >= 0 ? "up" : "down"}>
                    <b>{formatMovementValue(row.estimatedValueYi)}</b>
                    <small>{row.valueBasis}</small>
                  </td>
                  <td>
                    <a href={row.sourceUrl} target="_blank" rel="noreferrer">{row.source}</a>
                    <span className={`source-status source-status-${row.verificationStatus || "fallback"}`}>
                      {row.verificationLabel || "待核對"}
                    </span>
                    {row.primarySource && <small>{row.primarySource}</small>}
                    {row.snapshotDate && row.snapshotDate !== row.toDate && <small>快照 {row.snapshotDate}</small>}
                  </td>
                </tr>
              ))}
              {!filteredRows.length && (
                <tr>
                  <td colSpan="7"><div className="empty-line">這個條件下沒有可顯示的每日變化</div></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel source-method-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">Source Method</span>
            <h2>資料來源與估算口徑</h2>
          </div>
        </div>
        <div className="source-method-grid">
          <div>
            <strong>來源規則</strong>
            <span>{dailyMovementMeta.sourcePolicy}</span>
          </div>
          <div>
            <strong>機器來源</strong>
            <span>{dailyMovementMeta.source}</span>
            <a href={dailyMovementMeta.sourceUrl} target="_blank" rel="noreferrer">{dailyMovementMeta.sourceUrl}</a>
          </div>
          <div>
            <strong>官方揭露制度</strong>
            <span>{dailyMovementMeta.officialDisclosure}</span>
          </div>
          <div>
            <strong>價值排序</strong>
            <span>{dailyMovementMeta.note}</span>
          </div>
        </div>
        <div className="source-health-grid">
          {sourceHealthRows.map((item) => (
            <article className={`source-health-card source-health-${item.status || "fallback"}`} key={item.etfCode}>
              <div className="source-health-card-head">
                <strong className="mono">{item.etfCode}</strong>
                <span className={`source-status source-status-${item.status || "fallback"}`}>{item.statusLabel}</span>
              </div>
              <b>{item.issuer} · {item.etfName}</b>
              <small>{item.previousDate || "前日未定"} → {item.latestDate || "當日未定"} · 持股 {item.holdingCount || 0} 檔</small>
              <a href={item.sourceUrl || dailyMovementMeta.sourceUrl} target="_blank" rel="noreferrer">{item.primarySource}</a>
              <span>二次查核：{item.secondarySource || "待補來源"}</span>
              {item.fallbackReason && <span className="source-fallback-reason">{item.fallbackReason}</span>}
              {!!item.notes?.length && (
                <div className="source-health-notes">
                  {item.notes.map((note) => (
                    <span key={note}>{note}</span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function buildCrowdingAlerts(crowdingProfiles) {
  return Object.values(crowdingProfiles || {})
    .filter((profile) => profile.score >= 50 || profile.attackHits > 0)
    .sort((a, b) => b.score - a.score || b.attackHits - a.attackHits);
}

function buildRiskHoldingLeaders(rows, attackImpact, crowdingProfiles) {
  const impactByCode = Object.fromEntries(attackImpact.map((row) => [row.code, row]));
  return rows
    .map((etf) => ({
      ...etf,
      footprint: riskHoldingFootprint(impactByCode[etf.code], crowdingProfiles[etf.code]),
    }))
    .filter((row) => row.footprint.total > 0)
    .sort(
      (a, b) =>
        b.footprint.total - a.footprint.total ||
        b.footprint.attack - a.footprint.attack ||
        b.footprint.crowding - a.footprint.crowding ||
      b.commandScore - a.commandScore,
    );
}

function buildEtfDataAuditRows(rows, etfFreshness, attackImpact, crowdingProfiles) {
  const impactByCode = Object.fromEntries(attackImpact.map((row) => [row.code, row]));
  const severity = { red: 3, gold: 2, green: 1 };

  return rows
    .map((etf) => {
      const missing = missingQualityLabels(etf);
      const holdingsCount = etf.holdingsCount || etf.holdings?.length || etf.topHoldings?.length || 0;
      const flowRows = etf.flowChanges || [...(etf.adds || []), ...(etf.cuts || [])];
      const diffRange =
        etf.comparisonFromDate && etf.comparisonToDate
          ? `${etf.comparisonFromDate} -> ${etf.comparisonToDate}`
          : "未揭露";
      const hasDiff = Boolean(etf.comparisonToDate || flowRows.length);
      const dateMismatch = Boolean(etf.dataDate && snapshotMeta.asOf && etf.dataDate !== snapshotMeta.asOf);
      const issues = [];

      if (!holdingsCount) issues.push("無完整持股");
      if (!hasDiff) issues.push("無 latestDiff");
      if (missing.length) issues.push(`缺 ${missing.slice(0, 2).join("、")}`);
      if (dateMismatch) issues.push(`資料日 ${etf.dataDate}`);
      if (etfFreshness?.status && etfFreshness.status !== "live") issues.push(`快照 ${etfFreshness.label}`);
      if (etf.holdingsSource === "pocket") issues.push("持股包來源");

      const tone = !holdingsCount || missing.length ? "red" : issues.length ? "gold" : "green";
      const impact = impactByCode[etf.code];
      const crowding = crowdingProfiles?.[etf.code];

      return {
        code: etf.code,
        name: etf.name,
        sourceUrl: etf.sourceUrl,
        tone,
        status: tone === "red" ? "需補資料" : tone === "gold" ? "待複核" : "已核對",
        dataDate: etf.dataDate || snapshotMeta.asOf || "未揭露",
        holdingsCount,
        holdingsSource: holdingsSourceLabel(etf.holdingsSource),
        holdingsSourceKey: etf.holdingsSource || "unknown",
        diffRange,
        diffRows: flowRows.length,
        hasDiff,
        issues: issues.length ? issues : ["核心欄位完整"],
        attackHits: impact?.attackCount || 0,
        crowdingScore: crowding?.score || 0,
      };
    })
    .sort((a, b) => severity[b.tone] - severity[a.tone] || b.attackHits - a.attackHits || b.crowdingScore - a.crowdingScore || a.code.localeCompare(b.code));
}

function buildDataAuditRefreshQueue(rows) {
  const pickRows = (predicate) =>
    rows
      .filter(predicate)
      .sort((a, b) => b.attackHits - a.attackHits || b.crowdingScore - a.crowdingScore || b.diffRows - a.diffRows || a.code.localeCompare(b.code));
  const staleRows = pickRows((row) => row.issues.some((issue) => issue.includes("快照")));
  const riskRows = pickRows((row) => row.tone !== "green" && (row.attackHits > 0 || row.crowdingScore >= 50));
  const pocketRows = pickRows((row) => row.holdingsSourceKey === "pocket");
  const noDiffRows = pickRows((row) => !row.hasDiff);
  const makeQueue = (key, label, rowsForQueue, detail, tone) => ({
    key,
    label,
    count: rowsForQueue.length,
    codes: rowsForQueue.slice(0, 5).map((row) => row.code),
    allCodes: rowsForQueue.map((row) => row.code),
    command: buildScopedRefreshCommand(rowsForQueue.map((row) => row.code)),
    detail,
    tone,
  });

  return [
    makeQueue("stale", "快照刷新", staleRows, "先重跑 ETF 快照，避免持股與 latestDiff 日期落後。", "red"),
    makeQueue("risk", "高風險複核", riskRows, "優先核對同時有攻擊命中或擁擠分數的 ETF。", "gold"),
    makeQueue("pocket", "持股包複核", pocketRows, "持股來源非投信官方時，優先開來源頁人工比對。", "cyan"),
    makeQueue("noDiff", "補 latestDiff", noDiffRows, "缺 latestDiff 會影響資金流與異動摘要。", "red"),
  ].filter((queue) => queue.count > 0);
}

function buildRefreshAuditBaseline(rows, codes = []) {
  const byCode = Object.fromEntries(rows.map((row) => [row.code, row]));
  return codes
    .map((code) => byCode[code])
    .filter(Boolean)
    .map((row) => ({
      code: row.code,
      dataDate: row.dataDate,
      holdingsCount: row.holdingsCount,
      holdingsSourceKey: row.holdingsSourceKey,
      diffRange: row.diffRange,
        diffRows: row.diffRows,
        tone: row.tone,
      }));
}

function auditToneLabel(tone) {
  return {
    red: "需補資料",
    gold: "待複核",
    green: "已核對",
  }[tone] || valueOrDash(tone);
}

function buildFieldChange(label, before, after) {
  if (before === after) return null;
  return `${label} ${valueOrDash(before)} -> ${valueOrDash(after)}`;
}

function buildRefreshHistoryDelta(record, rows) {
  if (!record.baseline?.length) {
    return {
      tone: "gold",
      label: "尚無基準",
      detail: "舊紀錄未保存刷新前欄位，之後新紀錄會自動比對。",
      items: [],
    };
  }

  const currentByCode = Object.fromEntries(rows.map((row) => [row.code, row]));
  const changedItems = [];
  const missingCodes = [];

  record.baseline.forEach((before) => {
    const current = currentByCode[before.code];
    if (!current) {
      missingCodes.push(before.code);
      return;
    }

    const changes = [
      buildFieldChange("資料日", before.dataDate, current.dataDate),
      buildFieldChange("持股", before.holdingsCount, current.holdingsCount),
      buildFieldChange("來源", holdingsSourceLabel(before.holdingsSourceKey), current.holdingsSource),
      buildFieldChange("latestDiff", before.diffRange, current.diffRange),
      buildFieldChange("異動筆數", before.diffRows, current.diffRows),
      buildFieldChange("狀態", auditToneLabel(before.tone), auditToneLabel(current.tone)),
    ].filter(Boolean);

    if (changes.length) {
      changedItems.push({
        code: before.code,
        text: changes.slice(0, 3).join("；"),
      });
    }
  });

  if (missingCodes.length) {
    return {
      tone: "red",
      label: `缺 ${missingCodes.length} 檔`,
      detail: `${missingCodes.slice(0, 4).join("、")} 目前不在稽核表內。`,
      items: missingCodes.slice(0, 5).map((code) => ({ code, text: "目前不在稽核表內" })),
    };
  }

  if (changedItems.length) {
    return {
      tone: "green",
      label: `變化 ${changedItems.length} 檔`,
      detail: `${changedItems.slice(0, 4).map((item) => item.code).join("、")} 的稽核欄位已不同。`,
      items: changedItems.slice(0, 5),
    };
  }

  return {
    tone: "gold",
    label: "尚無變化",
    detail: "目前資料與複製命令時的基準一致。",
    items: [],
  };
}

function buildRefreshDeltaSummary(record, delta, format = "telegram") {
  const visibleCodes = record.codes?.slice(0, 10).join("、") || "未記錄";
  const codesSuffix = record.codes?.length > 10 ? ` 等 ${record.codes.length} 檔` : "";
  const itemLines = delta.items.length
    ? delta.items.map((item, index) => `${index + 1}. ${item.code}｜${item.text}`)
    : ["明細｜目前無逐檔欄位變化"];

  if (format === "threads") {
    const detailLines = delta.items.length
      ? delta.items.map((item) => `${item.code}：${item.text}。`)
      : ["目前無逐檔欄位變化。"];

    return [
      `ETF 指定刷新差異：${record.label}，${delta.label}。`,
      `複製時間 ${formatTaipeiDateTime(record.copiedAt)}；快照 ${record.snapshotAsOf || "未揭露"}。`,
      `ETF：${visibleCodes}${codesSuffix}。`,
      delta.detail,
      ...detailLines,
      `指定刷新：${record.command}`,
    ].join("\n");
  }

  return [
    `指定刷新差異｜${record.label}｜${delta.label}`,
    `複製時間｜${formatTaipeiDateTime(record.copiedAt)}｜快照 ${record.snapshotAsOf || "未揭露"}`,
    `ETF｜${visibleCodes}${codesSuffix}`,
    `狀態｜${delta.detail}`,
    ...itemLines,
    `指定刷新｜${record.command}`,
  ].join("\n");
}

function buildEtfDataAuditSummary(rows, mode = "watch", sourceMode = "all") {
  const modeLabel = {
    watch: "待處理",
    all: "全部",
    verified: "已核對",
  }[mode] || "待處理";
  const sourceLabel = {
    all: "全部來源",
    official: "投信官方",
    pocket: "持股包",
    noDiff: "缺 latestDiff",
  }[sourceMode] || "全部來源";
  const red = rows.filter((row) => row.tone === "red").length;
  const gold = rows.filter((row) => row.tone === "gold").length;
  const green = rows.filter((row) => row.tone === "green").length;
  const lines = rows.slice(0, 8).map((row, index) => {
    const risk = `攻擊 ${row.attackHits}｜擁擠 ${row.crowdingScore}`;
    return `${index + 1}. ${row.code} ${row.name}｜${row.status}｜持股 ${row.holdingsCount}｜${row.holdingsSource}｜latestDiff ${row.diffRange} ${row.diffRows} 筆｜${row.issues.slice(0, 2).join("、")}｜${risk}`;
  });
  const queueLines = buildDataAuditRefreshQueue(rows).map((queue) => `${queue.label} ${queue.count} 檔｜${queue.codes.join("、") || "無"}`);
  const primaryQueueCommand = buildDataAuditRefreshQueue(rows)[0]?.command || dataRefreshCommand;

  return [
    `ETF 真實資料稽核｜${modeLabel}｜${sourceLabel}｜快照 ${snapshotMeta.asOf || "未揭露"}｜生成 ${formatTaipeiDateTime(snapshotMeta.generatedAt)}`,
    `總檢查 ${rows.length} 檔｜缺資料 ${red}｜待複核 ${gold}｜已核對 ${green}`,
    queueLines.length ? `刷新優先序｜${queueLines.join("；")}` : "刷新優先序｜目前無待處理隊列",
    ...lines,
    `優先指定刷新｜${primaryQueueCommand}`,
    `刷新指令｜${dataRefreshCommand}`,
  ].join("\n");
}

function EtfDataAuditPanel({ rows, selectedCode, onSelect }) {
  const [auditMode, setAuditMode] = useState("watch");
  const [sourceMode, setSourceMode] = useState("all");
  const [copyStatus, setCopyStatus] = useState("idle");
  const [queueCopyKey, setQueueCopyKey] = useState("");
  const [historyCopyId, setHistoryCopyId] = useState("");
  const [deltaCopyId, setDeltaCopyId] = useState("");
  const [deltaFormat, setDeltaFormat] = useState("telegram");
  const [refreshCommandHistory, setRefreshCommandHistory] = useState(loadRefreshCommandHistory);
  const modes = [
    ["watch", "待處理", rows.filter((row) => row.tone !== "green").length],
    ["all", "全部", rows.length],
    ["verified", "已核對", rows.filter((row) => row.tone === "green").length],
  ];
  const sourceModes = [
    ["all", "全部來源", rows.length],
    ["official", "投信官方", rows.filter((row) => row.holdingsSourceKey === "issuer-official").length],
    ["pocket", "持股包", rows.filter((row) => row.holdingsSourceKey === "pocket").length],
    ["noDiff", "缺Diff", rows.filter((row) => !row.hasDiff).length],
  ];
  const summaryCounts = [
    ["缺資料", rows.filter((row) => row.tone === "red").length, "red"],
    ["待複核", rows.filter((row) => row.tone === "gold").length, "gold"],
    ["已核對", rows.filter((row) => row.tone === "green").length, "green"],
    ["持股總筆數", rows.reduce((sum, row) => sum + row.holdingsCount, 0).toLocaleString("zh-TW"), "cyan"],
  ];
  const visibleRows = useMemo(() => {
    const modeRows = rows.filter((row) => {
      if (auditMode === "verified") return row.tone === "green";
      if (auditMode === "watch") return row.tone !== "green";
      return true;
    });
    return modeRows.filter((row) => {
      if (sourceMode === "official") return row.holdingsSourceKey === "issuer-official";
      if (sourceMode === "pocket") return row.holdingsSourceKey === "pocket";
      if (sourceMode === "noDiff") return !row.hasDiff;
      return true;
    });
  }, [auditMode, rows, sourceMode]);
  const refreshQueue = useMemo(() => buildDataAuditRefreshQueue(visibleRows), [visibleRows]);
  const summary = useMemo(() => buildEtfDataAuditSummary(visibleRows, auditMode, sourceMode), [auditMode, sourceMode, visibleRows]);
  const hasClearableHistory = refreshCommandHistory.some((record) => !record.pinned);

  useEffect(() => {
    if (copyStatus === "idle") return undefined;
    const timeout = window.setTimeout(() => setCopyStatus("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyStatus]);
  useEffect(() => {
    if (!queueCopyKey) return undefined;
    const timeout = window.setTimeout(() => setQueueCopyKey(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [queueCopyKey]);
  useEffect(() => {
    if (!historyCopyId) return undefined;
    const timeout = window.setTimeout(() => setHistoryCopyId(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [historyCopyId]);
  useEffect(() => {
    if (!deltaCopyId) return undefined;
    const timeout = window.setTimeout(() => setDeltaCopyId(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [deltaCopyId]);
  useEffect(() => {
    setCopyStatus("idle");
    setQueueCopyKey("");
    setHistoryCopyId("");
    setDeltaCopyId("");
  }, [auditMode, sourceMode, deltaFormat]);

  const copyAuditSummary = async () => {
    try {
      await copyText(summary);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };
  const copyQueueCommand = async (queue) => {
    try {
      await copyText(queue.command);
      setQueueCopyKey(queue.key);
      setRefreshCommandHistory((current) => {
        const record = {
          id: `${Date.now()}-${queue.key}`,
          queueKey: queue.key,
          label: queue.label,
          count: queue.count,
          codes: queue.allCodes,
          command: queue.command,
          copiedAt: new Date().toISOString(),
          snapshotAsOf: snapshotMeta.asOf || "",
          baseline: buildRefreshAuditBaseline(rows, queue.allCodes),
        };
        const next = normalizeRefreshCommandHistory([record, ...current.filter((row) => row.command !== queue.command || row.pinned)]);
        saveRefreshCommandHistory(next);
        return next;
      });
    } catch {
      setQueueCopyKey(`${queue.key}:error`);
    }
  };
  const copyHistoryCommand = async (record) => {
    try {
      await copyText(record.command);
      setHistoryCopyId(record.id);
    } catch {
      setHistoryCopyId(`${record.id}:error`);
    }
  };
  const copyDeltaSummary = async (record, delta) => {
    try {
      await copyText(buildRefreshDeltaSummary(record, delta, deltaFormat));
      setDeltaCopyId(record.id);
    } catch {
      setDeltaCopyId(`${record.id}:error`);
    }
  };
  const removeHistoryRecord = (recordId) => {
    setRefreshCommandHistory((current) => {
      const next = normalizeRefreshCommandHistory(current.filter((record) => record.id !== recordId));
      saveRefreshCommandHistory(next);
      return next;
    });
    setHistoryCopyId("");
    setDeltaCopyId("");
  };
  const clearHistory = () => {
    setRefreshCommandHistory((current) => {
      const next = normalizeRefreshCommandHistory(current.filter((record) => record.pinned));
      saveRefreshCommandHistory(next);
      return next;
    });
    setHistoryCopyId("");
    setDeltaCopyId("");
  };
  const togglePinnedHistory = (recordId) => {
    setRefreshCommandHistory((current) => {
      const next = normalizeRefreshCommandHistory(current.map((record) => (record.id === recordId ? { ...record, pinned: !record.pinned } : record)));
      saveRefreshCommandHistory(next);
      return next;
    });
    setHistoryCopyId("");
    setDeltaCopyId("");
  };

  return (
    <section className="panel data-audit-panel">
      <div className="section-head">
        <div>
          <span className="eyebrow">Real Data Audit</span>
          <h2>全 ETF 真實資料稽核</h2>
        </div>
        <div className="data-audit-actions">
          <div className="segmented data-audit-filter" aria-label="全 ETF 真實資料稽核篩選">
            {modes.map(([key, label, count]) => (
              <button className={auditMode === key ? "active" : ""} key={key} type="button" onClick={() => setAuditMode(key)}>
                {label} <small>{count}</small>
              </button>
            ))}
          </div>
          <div className="segmented data-source-filter" aria-label="全 ETF 真實資料來源篩選">
            {sourceModes.map(([key, label, count]) => (
              <button className={sourceMode === key ? "active" : ""} key={key} type="button" onClick={() => setSourceMode(key)}>
                {label} <small>{count}</small>
              </button>
            ))}
          </div>
          <button className={`mini-copy ${copyStatus !== "idle" ? "active" : ""}`} type="button" onClick={copyAuditSummary} aria-label="複製全 ETF 真實資料稽核摘要">
            {copyStatus === "copied" ? <Check size={15} /> : <Copy size={15} />}
            <span>{copyStatus === "copied" ? "已複製" : copyStatus === "error" ? "複製失敗" : "複製稽核"}</span>
          </button>
          <Database size={20} />
        </div>
      </div>
      <div className="data-audit-summary">
        {summaryCounts.map(([label, value, tone]) => (
          <span className={`data-audit-chip data-audit-${tone}`} key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </span>
        ))}
      </div>
      <div className="data-refresh-queue" aria-label="ETF 真實資料刷新優先序">
        {refreshQueue.length ? (
          refreshQueue.map((queue) => (
            <span className={`data-refresh-card data-refresh-${queue.tone}`} key={queue.key}>
              <small>{queue.label}</small>
              <strong>{queue.count} 檔</strong>
              <em>{queue.codes.join("、") || "無"}</em>
              <b>{queue.detail}</b>
              <button className={`mini-copy data-refresh-copy ${queueCopyKey.startsWith(queue.key) ? "active" : ""}`} type="button" onClick={() => copyQueueCommand(queue)} aria-label={`複製 ${queue.label} 指定 ETF 刷新命令`}>
                {queueCopyKey === queue.key ? <Check size={15} /> : <Copy size={15} />}
                <span>{queueCopyKey === queue.key ? "已複製" : queueCopyKey === `${queue.key}:error` ? "複製失敗" : "複製指定刷新"}</span>
              </button>
            </span>
          ))
        ) : (
          <span className="data-refresh-card data-refresh-green">
            <small>刷新優先序</small>
            <strong>無待處理</strong>
            <em>目前篩選沒有需要刷新或複核的 ETF</em>
            <b>可切到全部來源檢查完整清單。</b>
          </span>
        )}
      </div>
      <div className="refresh-command-history" aria-label="指定 ETF 刷新命令複製紀錄">
        <div className="refresh-command-history-head">
          <div>
            <span>指定刷新紀錄</span>
            <small>固定保留 + 最近 5 筆</small>
          </div>
          <div className="refresh-command-history-tools">
            <div className="segmented refresh-delta-format" aria-label="指定刷新差異摘要格式">
              {timelineFormats.map(([key, label]) => (
                <button className={deltaFormat === key ? "active" : ""} key={key} type="button" onClick={() => setDeltaFormat(key)}>
                  {label}
                </button>
              ))}
            </div>
            <button className="mini-copy history-clear" type="button" onClick={clearHistory} disabled={!hasClearableHistory} aria-label="清空未固定指定 ETF 刷新命令紀錄">
              <Trash2 size={15} />
              <span>清空未固定</span>
            </button>
          </div>
        </div>
        {refreshCommandHistory.length ? (
          <div className="refresh-command-history-list">
            {refreshCommandHistory.map((record) => {
              const delta = buildRefreshHistoryDelta(record, rows);
              const deltaSummary = buildRefreshDeltaSummary(record, delta, deltaFormat);
              return (
                <article className="refresh-command-history-row" key={record.id}>
                  <div>
                    <strong>
                      {record.label} · {record.count} 檔
                      {record.pinned && <span className="refresh-pinned-badge">固定</span>}
                      <span className={`refresh-delta-badge refresh-delta-${delta.tone}`}>{delta.label}</span>
                    </strong>
                    <small>{formatTaipeiDateTime(record.copiedAt)} · 快照 {record.snapshotAsOf || "未揭露"} · {record.codes.slice(0, 5).join("、")}</small>
                    <em>{delta.detail}</em>
                    {delta.items.length > 0 && (
                      <ul className="refresh-delta-list" aria-label={`${record.label} 刷新差異明細`}>
                        {delta.items.map((item) => (
                          <li key={`${record.id}-${item.code}`}>
                            <span>{item.code}</span>
                            <small>{item.text}</small>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="refresh-delta-preview" aria-label={`${record.label} ${timelineFormats.find(([key]) => key === deltaFormat)?.[1] || "Telegram"} 差異摘要預覽`}>
                      <span>{timelineFormats.find(([key]) => key === deltaFormat)?.[1] || "Telegram"} Preview</span>
                      <pre>{deltaSummary}</pre>
                    </div>
                  </div>
                  <div className="refresh-command-history-actions">
                    <button className={`mini-copy history-pin ${record.pinned ? "active" : ""}`} type="button" onClick={() => togglePinnedHistory(record.id)} aria-label={`${record.pinned ? "取消固定" : "固定"} ${record.label} 指定 ETF 刷新命令紀錄`}>
                      {record.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                      <span>{record.pinned ? "取消固定" : "固定"}</span>
                    </button>
                    <button className={`mini-copy ${deltaCopyId.startsWith(record.id) ? "active" : ""}`} type="button" onClick={() => copyDeltaSummary(record, delta)} aria-label={`複製 ${record.label} 刷新差異摘要`}>
                      {deltaCopyId === record.id ? <Check size={15} /> : <Copy size={15} />}
                      <span>{deltaCopyId === record.id ? "已複製" : deltaCopyId === `${record.id}:error` ? "複製失敗" : `複製${timelineFormats.find(([key]) => key === deltaFormat)?.[1] || ""}`}</span>
                    </button>
                    <button className={`mini-copy ${historyCopyId.startsWith(record.id) ? "active" : ""}`} type="button" onClick={() => copyHistoryCommand(record)} aria-label={`再次複製 ${record.label} 指定 ETF 刷新命令`}>
                      {historyCopyId === record.id ? <Check size={15} /> : <Copy size={15} />}
                      <span>{historyCopyId === record.id ? "已複製" : historyCopyId === `${record.id}:error` ? "複製失敗" : "再複製"}</span>
                    </button>
                    <button className="mini-copy history-delete" type="button" onClick={() => removeHistoryRecord(record.id)} aria-label={`刪除 ${record.label} 指定 ETF 刷新命令紀錄`}>
                      <Trash2 size={15} />
                      <span>刪除</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="refresh-command-history-empty">尚未複製指定 ETF 刷新命令</div>
        )}
      </div>
      <div className="data-audit-table" role="table" aria-label="全 ETF 真實資料稽核清單">
        <div className="data-audit-row data-audit-head" role="row">
          <span>ETF</span>
          <span>狀態</span>
          <span>資料日</span>
          <span>持股</span>
          <span>latestDiff</span>
          <span>來源</span>
          <span>風險</span>
        </div>
        {visibleRows.map((row) => (
          <article className={`data-audit-row data-audit-${row.tone} ${selectedCode === row.code ? "active" : ""}`} key={row.code} role="row">
            <button className="data-audit-select" type="button" onClick={() => onSelect(row.code)} aria-label={`查看 ${row.code} ${row.name} 詳情`}>
              <strong className="mono">{row.code}</strong>
              <small>{row.name}</small>
            </button>
            <b>{row.status}</b>
            <span>{row.dataDate}</span>
            <span>{row.holdingsCount} 檔</span>
            <span>
              <strong>{row.diffRange}</strong>
              <small>{row.diffRows} 筆異動</small>
            </span>
            <span className="data-audit-source">
              <strong>{row.holdingsSource}</strong>
              {row.sourceUrl ? (
                <a href={row.sourceUrl} target="_blank" rel="noreferrer" aria-label={`開啟 ${row.code} 來源頁`}>
                  來源頁
                </a>
              ) : (
                <small>無來源頁</small>
              )}
            </span>
            <span>
              <strong>攻擊 {row.attackHits}</strong>
              <small>擁擠 {row.crowdingScore} · {row.issues.slice(0, 2).join("、")}</small>
            </span>
          </article>
        ))}
        {!visibleRows.length && <div className="data-audit-empty">此篩選目前沒有 ETF 需要列出</div>}
      </div>
    </section>
  );
}

function RiskHoldingLeaders({ rows, selectedCode, onSelect, onFocusHolding, onOpenMatrix }) {
  const [copyStatus, setCopyStatus] = useState("idle");
  const [leaderMode, setLeaderMode] = useState("all");
  const modes = [
    ["all", "全部", rows.length],
    ["attack", "攻擊", rows.filter((row) => row.footprint.attack > 0).length],
    ["crowding", "熱區", rows.filter((row) => row.footprint.crowding > 0).length],
  ];
  const visibleRows = useMemo(() => {
    const filteredRows = rows.filter((row) => {
      if (leaderMode === "attack") return row.footprint.attack > 0;
      if (leaderMode === "crowding") return row.footprint.crowding > 0;
      return true;
    });
    const comparators = {
      all: (a, b) =>
        b.footprint.total - a.footprint.total ||
        b.footprint.attack - a.footprint.attack ||
        b.footprint.crowding - a.footprint.crowding ||
        b.commandScore - a.commandScore,
      attack: (a, b) =>
        b.footprint.attack - a.footprint.attack ||
        b.footprint.total - a.footprint.total ||
        b.commandScore - a.commandScore,
      crowding: (a, b) =>
        b.footprint.crowding - a.footprint.crowding ||
        b.footprint.total - a.footprint.total ||
        b.commandScore - a.commandScore,
    };
    return [...filteredRows].sort(comparators[leaderMode] || comparators.all).slice(0, 5);
  }, [leaderMode, rows]);
  const summary = useMemo(() => buildRiskHoldingSummary(visibleRows, leaderMode), [leaderMode, visibleRows]);

  useEffect(() => {
    if (copyStatus === "idle") return undefined;
    const timeout = window.setTimeout(() => setCopyStatus("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyStatus]);
  useEffect(() => {
    setCopyStatus("idle");
  }, [leaderMode]);

  const copyRiskSummary = async () => {
    try {
      await copyText(summary);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };
  const focusHoldingCode = (event, etfCode, holdingCode) => {
    event.stopPropagation();
    onSelect(etfCode);
    onFocusHolding(etfCode, holdingCode);
  };

  return (
    <section className="panel risk-leader-panel">
      <div className="section-head">
        <div>
          <span className="eyebrow">Risk Holdings</span>
          <h2>風險持股 Top 5</h2>
        </div>
        <div className="risk-leader-actions">
          <div className="segmented risk-leader-filter" aria-label="風險持股 Top 5 篩選">
            {modes.map(([key, label, count]) => (
              <button className={leaderMode === key ? "active" : ""} key={key} type="button" onClick={() => setLeaderMode(key)}>
                {label} <small>{count}</small>
              </button>
            ))}
          </div>
          <button className={`mini-copy ${copyStatus !== "idle" ? "active" : ""}`} type="button" onClick={copyRiskSummary} aria-label="複製風險持股 Top 5 清單">
            {copyStatus === "copied" ? <Check size={15} /> : <Copy size={15} />}
            <span>{copyStatus === "copied" ? "已複製" : copyStatus === "error" ? "複製失敗" : "複製清單"}</span>
          </button>
          <button className="mini-copy" type="button" onClick={onOpenMatrix} aria-label="開啟矩陣風險持股排序">
            <ListFilter size={15} />
            <span>開矩陣</span>
          </button>
        </div>
      </div>
      <div className="risk-leader-list">
        {visibleRows.map((row, index) => (
          <article className={`risk-leader-row ${selectedCode === row.code ? "active" : ""}`} key={row.code}>
            <div>
              <button className="risk-leader-title" type="button" onClick={() => onSelect(row.code)}>
                <strong><span className="mono">{row.code}</span> {row.name}</strong>
                <small>{row.issuer} · {row.theme}</small>
              </button>
              <p>
                <span>攻擊 {row.footprint.attack}</span>
                <span>熱區 {row.footprint.crowding}</span>
                {row.footprint.topCodes.slice(0, 2).map((code) => (
                  <button
                    className="risk-code-chip"
                    key={`${row.code}-${code}`}
                    type="button"
                    onMouseDown={(event) => focusHoldingCode(event, row.code, code)}
                    onClick={(event) => focusHoldingCode(event, row.code, code)}
                    aria-label={`搜尋 ${row.code} 持股 ${code}`}
                  >
                    {code}
                  </button>
                ))}
              </p>
            </div>
            <b>{row.footprint.total}</b>
            <small className="risk-rank">#{index + 1}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function buildRiskHoldingSummary(rows, leaderMode = "all") {
  const modeLabel = {
    all: "全部",
    attack: "攻擊命中",
    crowding: "擁擠熱區",
  }[leaderMode] || "全部";
  const lines = rows.slice(0, 5).map((row, index) => {
    const codes = row.footprint.topCodes.slice(0, 3).join("、") || "未揭露";
    return `${index + 1}. ${row.code} ${row.name}｜風險持股 ${row.footprint.total}｜攻擊 ${row.footprint.attack}｜熱區 ${row.footprint.crowding}｜代表 ${codes}`;
  });

  return [
    `風險持股 Top 5｜${modeLabel}｜ETF ${snapshotMeta.asOf || "未揭露"}｜攻擊 ${intradayAttackMeta.asOf || "未匯入"}`,
    ...lines,
    "觀察重點：同時帶有攻擊命中或擁擠熱區的 ETF，需優先檢查完整持股明細與隔日資金流。",
  ].join("\n");
}

function CrowdingAlertBoard({ rows, selectedCode, onSelect, onOpenMatrix }) {
  const [copyStatus, setCopyStatus] = useState("idle");
  const [alertMode, setAlertMode] = useState("all");
  const modes = [
    ["all", "全部", rows.length],
    ["high", "高擁擠", rows.filter((row) => row.label === "高擁擠").length],
    ["attack", "攻擊命中", rows.filter((row) => row.attackHits > 0).length],
  ];
  const visibleRows = useMemo(() => {
    const filteredRows = rows.filter((row) => {
      if (alertMode === "high") return row.label === "高擁擠";
      if (alertMode === "attack") return row.attackHits > 0;
      return true;
    });
    return filteredRows.slice(0, 8);
  }, [alertMode, rows]);
  const summary = useMemo(() => buildCrowdingAlertSummary(visibleRows, alertMode), [alertMode, visibleRows]);

  useEffect(() => {
    if (copyStatus === "idle") return undefined;
    const timeout = window.setTimeout(() => setCopyStatus("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyStatus]);
  useEffect(() => {
    setCopyStatus("idle");
  }, [alertMode]);

  const copyAlertSummary = async () => {
    try {
      await copyText(summary);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };

  return (
    <section className="panel crowding-alert-panel">
      <div className="section-head">
        <div>
          <span className="eyebrow">Crowding Alert</span>
          <h2>高擁擠 ETF 警示榜</h2>
        </div>
        <div className="crowding-alert-actions">
          <div className="segmented crowding-alert-filter" aria-label="高擁擠警示篩選">
            {modes.map(([key, label, count]) => (
              <button className={alertMode === key ? "active" : ""} key={key} type="button" onClick={() => setAlertMode(key)}>
                {label} <small>{count}</small>
              </button>
            ))}
          </div>
          <button className={`mini-copy ${copyStatus !== "idle" ? "active" : ""}`} type="button" onClick={copyAlertSummary} aria-label="複製高擁擠 ETF 警示清單">
            {copyStatus === "copied" ? <Check size={15} /> : <Copy size={15} />}
            <span>{copyStatus === "copied" ? "已複製" : copyStatus === "error" ? "複製失敗" : "複製清單"}</span>
          </button>
          <button className="mini-copy" type="button" onClick={onOpenMatrix} aria-label="開啟矩陣擁擠排序">
            <ListFilter size={15} />
            <span>開矩陣</span>
          </button>
          <AlertTriangle size={20} />
        </div>
      </div>
      <div className="crowding-alert-grid">
        {visibleRows.map((row) => (
          <button className={`crowding-alert-row ${selectedCode === row.code ? "active" : ""} crowding-${row.tone}`} key={row.code} type="button" onClick={() => onSelect(row.code)}>
            <div>
              <strong className="mono">{row.code}</strong>
              <span>{row.name}</span>
              <small>{row.topHotspot?.code} {row.topHotspot?.name} · {row.topHotspot?.etfCount || 0} 檔共同持有</small>
            </div>
            <b>{row.score}</b>
            <p>
              <span>{row.label}</span>
              <span>曝險 {formatYi(row.exposureYi, 1)}</span>
              {row.attackHits > 0 && <span className="risk-hot">攻擊 {row.attackHits}</span>}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}

function buildCrowdingAlertSummary(rows, alertMode = "all") {
  const modeLabel = {
    all: "全部",
    high: "高擁擠",
    attack: "攻擊命中",
  }[alertMode] || "全部";
  const lines = rows.slice(0, 5).map((row, index) => {
    const hotspot = row.topHotspot ? `${row.topHotspot.code} ${row.topHotspot.name}` : "未揭露";
    const attack = row.attackHits ? `攻擊 ${row.attackHits}` : "未命中攻擊";
    return `${index + 1}. ${row.code} ${row.name}｜${row.label} ${row.score}｜曝險 ${formatYi(row.exposureYi, 1)}｜${attack}｜熱區 ${hotspot}`;
  });

  return [
    `高擁擠 ETF 警示清單｜${modeLabel}｜ETF ${snapshotMeta.asOf || "未揭露"}｜攻擊 ${intradayAttackMeta.asOf || "未匯入"}`,
    ...lines,
    "觀察重點：高擁擠且命中攻擊量的 ETF，若共同持股回落，淨值同步波動風險較高。",
  ].join("\n");
}

function DataQualityRadar({ radar }) {
  const visibleGaps = radar.gaps.slice(0, 5);

  return (
    <section className="panel data-quality-panel">
      <div className="section-head">
        <div>
          <span className="eyebrow">Data Quality Radar</span>
          <h2>真實資料品質雷達</h2>
        </div>
        <Database size={20} />
      </div>
      <div className="quality-grid">
        {radar.rows.map((row) => (
          <div className={`quality-card quality-${row.tone}`} key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            <small>{row.detail}</small>
          </div>
        ))}
      </div>
      <div className="quality-gap-list">
        <span>缺值追蹤</span>
        {visibleGaps.length ? (
          visibleGaps.map((gap) => (
            <strong key={gap.code} title={`${gap.name}：${gap.missing.join("、")}`}>
              {gap.code} · {gap.missing.slice(0, 2).join("、")}
            </strong>
          ))
        ) : (
          <strong className="quality-clean">核心欄位完整</strong>
        )}
      </div>
    </section>
  );
}

function buildRefreshPrioritySummary(refreshPriority, refreshHistory, format = "telegram") {
  if (format === "threads") {
    return [
      `ETF 資料刷新狀態：${refreshPriority.label}。`,
      refreshPriority.detail,
      ...refreshHistory.map(([label, value, detail]) => `${label}：${value}，${detail}。`),
      `更新指令：${dataRefreshCommand}`,
    ].join("\n");
  }

  return [
    `ETF Command 全站資料刷新狀態｜${refreshPriority.label}`,
    refreshPriority.detail,
    ...refreshHistory.map(([label, value, detail]) => `${label}｜${value}｜${detail}`),
    `更新指令｜${dataRefreshCommand}`,
  ].join("\n");
}

function RefreshPriorityPanel({ etfFreshness, attackFreshness }) {
  const [commandCopyStatus, setCommandCopyStatus] = useState("idle");
  const [summaryCopyStatus, setSummaryCopyStatus] = useState("idle");
  const [summaryFormat, setSummaryFormat] = useState("telegram");
  const refreshPriority = buildRefreshPriority(etfFreshness, attackFreshness);
  const nextRefresh = nextDailyRefresh();
  const refreshHistory = [
    ["ETF 最近生成", formatTaipeiDateTime(snapshotMeta.generatedAt), `${snapshotMeta.coverage || 0} 檔 · 快照 ${snapshotMeta.asOf || "未匯入"}`, etfFreshness.tone],
    ["攻擊檔更新", attackFreshness.modifiedLabel || "無檔案時間", `${intradayAttackMeta.symbols || 0} 檔 · 快取 ${intradayAttackMeta.asOf || "未匯入"}`, attackFreshness.tone],
    ["下一次排程", nextRefresh.value, nextRefresh.detail, nextRefresh.tone],
  ];
  const refreshSummary = useMemo(() => buildRefreshPrioritySummary(refreshPriority, refreshHistory, summaryFormat), [refreshHistory, refreshPriority, summaryFormat]);

  useEffect(() => {
    if (commandCopyStatus === "idle") return undefined;
    const timeout = window.setTimeout(() => setCommandCopyStatus("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [commandCopyStatus]);
  useEffect(() => {
    if (summaryCopyStatus === "idle") return undefined;
    const timeout = window.setTimeout(() => setSummaryCopyStatus("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [summaryCopyStatus]);
  useEffect(() => {
    setSummaryCopyStatus("idle");
  }, [summaryFormat]);

  const copyRefreshCommand = async () => {
    try {
      await copyText(dataRefreshCommand);
      setCommandCopyStatus("copied");
    } catch {
      setCommandCopyStatus("error");
    }
  };
  const copyRefreshSummary = async () => {
    try {
      await copyText(refreshSummary);
      setSummaryCopyStatus("copied");
    } catch {
      setSummaryCopyStatus("error");
    }
  };

  return (
    <section className={`panel refresh-priority-panel refresh-priority-panel-${refreshPriority.tone}`}>
      <div>
        <span className="eyebrow">Refresh Priority</span>
        <h2>{refreshPriority.label}</h2>
        <p>{refreshPriority.detail}</p>
      </div>
      <div className="refresh-priority-actions">
        <div className="segmented refresh-summary-format" aria-label="全站資料刷新狀態摘要格式">
          {timelineFormats.map(([key, label]) => (
            <button className={summaryFormat === key ? "active" : ""} key={key} type="button" onClick={() => setSummaryFormat(key)}>
              {label}
            </button>
          ))}
        </div>
        <button className={`mini-copy ${summaryCopyStatus !== "idle" ? "active" : ""}`} type="button" onClick={copyRefreshSummary} aria-label="複製全站資料刷新狀態摘要">
          {summaryCopyStatus === "copied" ? <Check size={15} /> : <Copy size={15} />}
          <span>{summaryCopyStatus === "copied" ? "已複製" : summaryCopyStatus === "error" ? "複製失敗" : `複製${timelineFormats.find(([key]) => key === summaryFormat)?.[1] || ""}`}</span>
        </button>
        <code>{dataRefreshCommand}</code>
        <button className={`mini-copy ${commandCopyStatus !== "idle" ? "active" : ""}`} type="button" onClick={copyRefreshCommand} aria-label="複製全站資料刷新指令">
          {commandCopyStatus === "copied" ? <Check size={15} /> : <Copy size={15} />}
          <span>{commandCopyStatus === "copied" ? "已複製" : commandCopyStatus === "error" ? "複製失敗" : "複製指令"}</span>
        </button>
      </div>
      <div className="timeline-preview refresh-priority-preview" aria-label={`${timelineFormats.find(([key]) => key === summaryFormat)?.[1] || "Telegram"} 全站資料刷新狀態摘要預覽`}>
        <span>{timelineFormats.find(([key]) => key === summaryFormat)?.[1] || "Telegram"} Preview</span>
        <pre>{refreshSummary}</pre>
      </div>
      <div className="refresh-history-grid" aria-label="資料刷新紀錄">
        {refreshHistory.map(([label, value, detail, tone]) => (
          <span className={`refresh-history-item refresh-history-${tone}`} key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
            <em>{detail}</em>
          </span>
        ))}
      </div>
    </section>
  );
}

function AttackSummary({ attackCross }) {
  return (
    <section className="panel compact-panel attack-summary">
      <div className="section-head">
        <div>
          <span className="eyebrow">Intraday Attack</span>
          <h2>盤中攻擊交集</h2>
        </div>
        <Target size={20} />
      </div>
      {attackCross.slice(0, 3).map((attack) => (
        <AttackCard attack={attack} key={attack.symbol} compact />
      ))}
    </section>
  );
}

function Matrix({ rows, selected, setSelected, attackImpact, attackFreshness, sortMode, setSortMode, assetMode, setAssetMode, assetCounts, researchUrl, compareRows, crowdingProfiles, holdingFocus, setHoldingFocus }) {
  const impactByCode = useMemo(() => Object.fromEntries(attackImpact.map((row) => [row.code, row])), [attackImpact]);
  const sortedRows = useMemo(() => {
    const comparators = {
      command: (a, b) => b.commandScore - a.commandScore,
      attack: (a, b) =>
        adjustedAttackScore(impactByCode[b.code]?.score, attackFreshness) - adjustedAttackScore(impactByCode[a.code]?.score, attackFreshness),
      risk: (a, b) =>
        riskHoldingFootprint(impactByCode[b.code], crowdingProfiles[b.code]).total -
          riskHoldingFootprint(impactByCode[a.code], crowdingProfiles[a.code]).total ||
        (crowdingProfiles[b.code]?.score || 0) - (crowdingProfiles[a.code]?.score || 0),
      aum: (a, b) => b.aum - a.aum,
      tsmc: (a, b) => b.tsmcWeight - a.tsmcWeight,
      income: (a, b) => b.incomeScore - a.incomeScore,
      crowding: (a, b) => (crowdingProfiles[b.code]?.score || 0) - (crowdingProfiles[a.code]?.score || 0) || b.aum - a.aum,
    };
    return [...rows].sort(comparators[sortMode] || comparators.command);
  }, [attackFreshness, crowdingProfiles, impactByCode, rows, sortMode]);

  return (
    <div className="matrix-layout">
      <section className="panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">Ranking Engine</span>
            <h2>ETF 矩陣篩選</h2>
          </div>
          <div className="matrix-actions">
            <div className="segmented type-segmented" aria-label="ETF 類型">
              {assetKeys.map((key) => (
                <button className={assetMode === key ? "active" : ""} key={key} type="button" onClick={() => setAssetMode(key)}>
                  {assetLabel(key)} <small>{assetCounts[key] || 0}</small>
                </button>
              ))}
            </div>
            <div className="segmented">
              {[
                ["command", "指揮分"],
                ["attack", "攻擊敏感"],
                ["risk", "風險持股"],
                ["aum", "AUM"],
                ["tsmc", "台積電"],
                ["income", "收益品質"],
                ["crowding", "擁擠風險"],
              ].map(([key, label]) => (
                <button className={sortMode === key ? "active" : ""} key={key} type="button" onClick={() => setSortMode(key)}>
                  {label}
                </button>
              ))}
            </div>
            <span className={`badge attack-weight-badge freshness-${attackFreshness?.status || "missing"}`}>{attackWeightLabel(attackFreshness)}</span>
            <span className="badge">{assetLabel(assetMode)} {rows.length} 檔</span>
          </div>
        </div>
        <EtfTable rows={sortedRows} selectedCode={selected.code} onSelect={setSelected} attackImpact={attackImpact} attackFreshness={attackFreshness} assetMode={assetMode} sortMode={sortMode} crowdingProfiles={crowdingProfiles} />
      </section>
      <EtfDetail
        etf={selected}
        attackImpact={attackImpact}
        attackFreshness={attackFreshness}
        researchUrl={researchUrl}
        compareRows={compareRows}
        crowdingProfile={crowdingProfiles[selected.code]}
        holdingFocus={holdingFocus}
        onFocusHolding={(etfCode, holdingCode) => setHoldingFocus?.({ etfCode, holdingCode, nonce: Date.now() })}
        onClearHoldingFocus={() => setHoldingFocus?.(null)}
      />
    </div>
  );
}

function buildMoveSummary(rows, emptyLabel) {
  if (!rows.length) return emptyLabel;
  return rows
    .slice(0, 2)
    .map(([code, name, shares, weight]) => `${code} ${name} ${formatShares(shares)} / ${formatPct(weight)}`)
    .join("、");
}

function buildAttackSummary(attackProfile) {
  if (!attackProfile) return "盤中攻擊曝險：未命中目前攻擊快取";

  const symbols = attackProfile.symbols
    .slice(0, 2)
    .map((symbol) => `${symbol.symbol} ${symbol.name} ${symbol.relation} ${formatPct(symbol.weight)}`)
    .join("、");
  return `盤中攻擊曝險 ${attackProfile.score}｜${symbols}`;
}

function formatAttackFreshnessLine(attackFreshness) {
  if (!attackFreshness) return "攻擊資料狀態未載入";
  return `${attackFreshness.label}｜${attackFreshness.detail}`;
}

function buildTopHoldingsSummary(etf, limit = 3) {
  return etf.topHoldings
    .slice(0, limit)
    .map(([code, name, weight]) => `${code} ${name} ${formatPct(weight)}`)
    .join("、");
}

function formatEtfDataLine(etf) {
  const comparison =
    etf.comparisonFromDate && etf.comparisonToDate
      ? `異動區間 ${etf.comparisonFromDate} -> ${etf.comparisonToDate}`
      : "異動區間未揭露";
  return `ETF 真實資料日 ${etf.dataDate || "未揭露"}，${comparison}`;
}

function buildEtfShareSummary(etf, attackProfile, attackFreshness, researchUrl, format = "telegram") {
  const topHoldings = buildTopHoldingsSummary(etf);
  const addSummary = buildMoveSummary(etf.adds, "無明顯加碼");
  const cutSummary = buildMoveSummary(etf.cuts, "無明顯減碼");
  const attackSummary = buildAttackSummary(attackProfile);
  const attackFreshnessLine = formatAttackFreshnessLine(attackFreshness);

  if (format === "threads") {
    return [
      `${etf.code} ${etf.name} 今日 ETF 觀察`,
      `指揮分 ${etf.commandScore}，${etf.issuer} ${etf.theme}，AUM ${formatYi(etf.aum)}。`,
      formatEtfDataLine(etf),
      `台積電權重 ${formatPct(etf.tsmcWeight)}，前五大集中在 ${topHoldings}。`,
      `${attackSummary}。`,
      `攻擊資料：${attackFreshnessLine}。`,
      `加碼：${addSummary}；減碼：${cutSummary}。`,
      researchUrl,
    ].join("\n");
  }

  if (format === "research") {
    return [
      `# ETF 研究稿：${etf.code} ${etf.name}`,
      `發行投信：${etf.issuer}`,
      `主題定位：${etf.theme}`,
      `指揮分：${etf.commandScore}`,
      `資料來源：${formatEtfDataLine(etf)}；來源頁 ${etf.sourceUrl || snapshotMeta.sourceUrl}。`,
      `規模與交易：AUM ${formatYi(etf.aum)}，NAV ${etf.nav.toFixed(2)}，折溢價 ${formatPct(etf.premium)}，管理費 ${formatPct(etf.fee)}。`,
      `集中度：台積電權重 ${formatPct(etf.tsmcWeight)}，前三大持股為 ${topHoldings}。`,
      `盤中攻擊：${attackSummary}。`,
      `攻擊資料狀態：${attackFreshnessLine}。`,
      `持股異動：加碼 ${addSummary}；減碼 ${cutSummary}。`,
      `研究連結：${researchUrl}`,
    ].join("\n");
  }

  return [
    `ETF 交易卡｜${etf.code} ${etf.name}`,
    `評分 ${etf.commandScore}｜${etf.issuer}｜${etf.theme}`,
    formatEtfDataLine(etf),
    `規模 ${formatYi(etf.aum)}｜NAV ${etf.nav.toFixed(2)}｜折溢價 ${formatPct(etf.premium)}`,
    `TSMC ${formatPct(etf.tsmcWeight)}｜前三大 ${topHoldings}`,
    `攻擊 ${attackSummary}`,
    `攻擊資料 ${attackFreshnessLine}`,
    `加碼 ${addSummary}`,
    `減碼 ${cutSummary}`,
    `連結 ${researchUrl}`,
  ].join("\n");
}

function EtfShareBrief({ etf, attackProfile, attackFreshness, researchUrl }) {
  const [briefStatus, setBriefStatus] = useState("idle");
  const [briefFormat, setBriefFormat] = useState("telegram");
  const summary = useMemo(
    () => buildEtfShareSummary(etf, attackProfile, attackFreshness, researchUrl, briefFormat),
    [attackFreshness, attackProfile, briefFormat, etf, researchUrl],
  );
  const preview = summary.split("\n").slice(0, briefFormat === "research" ? 5 : 4);

  useEffect(() => {
    setBriefStatus("idle");
  }, [briefFormat, etf.code]);
  useEffect(() => {
    if (briefStatus === "idle") return undefined;
    const timeout = window.setTimeout(() => setBriefStatus("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [briefStatus]);

  const copySummary = async () => {
    try {
      await copyText(summary);
      setBriefStatus("copied");
    } catch {
      setBriefStatus("error");
    }
  };

  return (
    <div className="share-brief">
      <div className="share-brief-head">
        <div>
          <span className="eyebrow">Share Brief</span>
          <strong>貼文摘要</strong>
        </div>
        <button className={`mini-copy ${briefStatus !== "idle" ? "active" : ""}`} type="button" onClick={copySummary} aria-label="複製 ETF 研究摘要">
          {briefStatus === "copied" ? <Check size={15} /> : <Copy size={15} />}
          <span>{briefStatus === "copied" ? "已複製" : briefStatus === "error" ? "複製失敗" : "複製摘要"}</span>
        </button>
      </div>
      <div className="brief-format segmented" aria-label="摘要格式">
        {briefFormats.map(([key, label]) => (
          <button className={briefFormat === key ? "active" : ""} key={key} type="button" onClick={() => setBriefFormat(key)}>
            {label}
          </button>
        ))}
      </div>
      <span className={`attack-freshness-note freshness-${attackFreshness?.status || "missing"}`}>
        攻擊資料 {attackFreshness?.label || "未匯入"}
      </span>
      <div className="share-brief-lines">
        {preview.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
    </div>
  );
}

function attackScoreFor(code, attackImpact) {
  return attackImpact.find((row) => row.code === code)?.score || 0;
}

function formatSignedNumber(value) {
  return `${value > 0 ? "+" : ""}${Number(value || 0).toLocaleString("zh-TW")}`;
}

function formatSignedYi(value) {
  return `${value > 0 ? "+" : ""}${formatYi(value)}`;
}

function formatSignedPct(value) {
  return `${value > 0 ? "+" : ""}${formatPct(value)}`;
}

function pickCompareWinner(etf, compareEtf, current, peer, lowerBetter = false) {
  if (current === peer) return "平手";
  const currentWins = lowerBetter ? current < peer : current > peer;
  return currentWins ? etf.code : compareEtf.code;
}

function buildCompareVerdicts(etf, compareEtf, currentAttackScore, compareAttackScore, attackFreshness) {
  return [
    {
      label: "指揮分",
      winner: pickCompareWinner(etf, compareEtf, etf.commandScore, compareEtf.commandScore),
      note: "較高",
    },
    {
      label: "規模",
      winner: pickCompareWinner(etf, compareEtf, etf.aum, compareEtf.aum),
      note: "AUM 較大",
    },
    {
      label: "集中風險",
      winner: pickCompareWinner(etf, compareEtf, etf.tsmcWeight, compareEtf.tsmcWeight, true),
      note: "台積電較低",
    },
    {
      label: "攻擊敏感",
      winner: pickCompareWinner(etf, compareEtf, currentAttackScore, compareAttackScore),
      note: attackFreshness?.status === "live" ? "攻擊分較高" : "降權後較高",
    },
    {
      label: "折溢價貼近",
      winner: pickCompareWinner(etf, compareEtf, Math.abs(etf.premium), Math.abs(compareEtf.premium), true),
      note: "更貼近 NAV",
    },
  ];
}

function verdictLabelsFor(verdicts, code) {
  return verdicts.filter((verdict) => verdict.winner === code).map((verdict) => verdict.label);
}

function describeVerdictLabels(labels) {
  if (!labels.length) return "無明顯單項勝出";
  const dictionary = {
    指揮分: "整體評分",
    規模: "規模",
    集中風險: "低集中風險",
    攻擊敏感: "降權攻擊敏感",
    折溢價貼近: "折溢價貼近",
  };
  return labels.map((label) => dictionary[label] || label).join("、");
}

function buildCompareConclusion(etf, compareEtf, verdicts) {
  const currentEdges = verdictLabelsFor(verdicts, etf.code);
  const peerEdges = verdictLabelsFor(verdicts, compareEtf.code);
  return `結論：${etf.code} 優勢在 ${describeVerdictLabels(currentEdges)}；${compareEtf.code} 優勢在 ${describeVerdictLabels(peerEdges)}。`;
}

function buildCompareSummary(etf, compareEtf, metrics, verdicts, conclusion, attackFreshness, researchUrl) {
  return [
    `ETF 對比｜${etf.code} ${etf.name} vs ${compareEtf.code} ${compareEtf.name}`,
    `${etf.code} ${etf.issuer} ${etf.theme}；${compareEtf.code} ${compareEtf.issuer} ${compareEtf.theme}`,
    ...metrics.map(([label, current, peer, delta]) => `${label}：${current} vs ${peer}（差值 ${delta}）`),
    `勝出標籤：${verdicts.map((verdict) => `${verdict.label} ${verdict.winner}`).join("、")}`,
    conclusion,
    `攻擊資料：${formatAttackFreshnessLine(attackFreshness)}`,
    `研究連結：${researchUrl}`,
  ].join("\n");
}

function EtfSourceLine({ etf }) {
  const holdingsCount = etf.holdingsCount || etf.holdings?.length || etf.topHoldings?.length || 0;
  return (
    <div className="etf-source-line">
      <Database size={16} aria-hidden="true" />
      <div>
        <strong>{formatEtfDataLine(etf)}</strong>
        <span>latestMarket、完整持股 {holdingsCount} 檔、latestDiff 皆由該 ETF active 頁匯入</span>
      </div>
      {etf.sourceUrl && (
        <a href={etf.sourceUrl} target="_blank" rel="noreferrer">
          來源頁
        </a>
      )}
    </div>
  );
}

function holdingsSourceLabel(source) {
  return {
    "issuer-official": "投信官方持股",
    pocket: "ETFINFO 持股包",
    etfinfo: "ETFINFO active 頁",
  }[source] || valueOrDash(source);
}

function buildRefreshPriority(etfFreshness, attackFreshness) {
  const needsEtf = etfFreshness?.status && etfFreshness.status !== "live";
  const needsAttack = attackFreshness?.status && attackFreshness.status !== "live";

  if (needsEtf && needsAttack) {
    return {
      tone: "red",
      label: "建議立即刷新",
      detail: `ETF ${etfFreshness.label}，攻擊 ${attackFreshness.label}；先執行 ${dataRefreshCommand}。`,
    };
  }
  if (needsEtf) {
    return {
      tone: "red",
      label: "優先刷新 ETF 快照",
      detail: `ETF ${etfFreshness.label}；會影響完整持股、latestMarket 與 latestDiff。`,
    };
  }
  if (needsAttack) {
    return {
      tone: "gold",
      label: "優先刷新攻擊快取",
      detail: `攻擊 ${attackFreshness.label}；ETF 快照可用，攻擊交集僅適合參考。`,
    };
  }
  return {
    tone: "green",
    label: "資料可用",
    detail: "ETF 快照與盤中攻擊快取皆為今日狀態。",
  };
}

function EtfDataTrustCard({ etf, attackFreshness }) {
  const [copyStatus, setCopyStatus] = useState("idle");
  const etfFreshness = etfSnapshotFreshness(snapshotMeta);
  const refreshPriority = buildRefreshPriority(etfFreshness, attackFreshness);
  const holdingsCount = etf.holdingsCount || etf.holdings?.length || etf.topHoldings?.length || 0;
  const diffRange =
    etf.comparisonFromDate && etf.comparisonToDate
      ? `${etf.comparisonFromDate} → ${etf.comparisonToDate}`
      : "未揭露";
  const trustItems = [
    ["ETF 快照", etf.dataDate || snapshotMeta.asOf || "未匯入", etfFreshness.label, etfFreshness.status],
    ["完整持股", `${holdingsCount} 檔`, holdingsSourceLabel(etf.holdingsSource), holdingsCount ? "live" : "missing"],
    ["異動區間", diffRange, "latestDiff", etf.comparisonToDate ? "live" : "missing"],
    ["攻擊快取", intradayAttackMeta.asOf || "未匯入", attackFreshness?.label || "未匯入", attackFreshness?.status || "missing"],
  ];

  useEffect(() => {
    if (copyStatus === "idle") return undefined;
    const timeout = window.setTimeout(() => setCopyStatus("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyStatus]);

  const copyRefreshCommand = async () => {
    try {
      await copyText(dataRefreshCommand);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };

  return (
    <div className="data-trust-card">
      <div className="data-trust-head">
        <div>
          <span className="eyebrow">Data Trust</span>
          <strong>資料可信度</strong>
          <small>ETF 生成 {formatTaipeiDateTime(snapshotMeta.generatedAt)} · 攻擊檔 {attackFreshness?.modifiedLabel || "無檔案時間"}</small>
        </div>
        <div className="data-trust-actions">
          <b className={`source-status source-status-${etfFreshness.status}`}>{etfFreshness.label}</b>
          <button className={`mini-copy ${copyStatus !== "idle" ? "active" : ""}`} type="button" onClick={copyRefreshCommand} aria-label="複製資料刷新指令">
            {copyStatus === "copied" ? <Check size={15} /> : <Copy size={15} />}
            <span>{copyStatus === "copied" ? "已複製" : copyStatus === "error" ? "複製失敗" : "複製更新指令"}</span>
          </button>
        </div>
      </div>
      <code className="data-refresh-command">{dataRefreshCommand}</code>
      <div className={`refresh-priority refresh-priority-${refreshPriority.tone}`}>
        <strong>{refreshPriority.label}</strong>
        <span>{refreshPriority.detail}</span>
      </div>
      <div className="data-trust-grid">
        {trustItems.map(([label, value, detail, status]) => (
          <span className={`trust-status trust-status-${status}`} key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
            <em>{detail}</em>
          </span>
        ))}
      </div>
    </div>
  );
}

function valueOrDash(value) {
  return value == null || value === "" ? "未揭露" : value;
}

function feeLabel(etf) {
  const pieces = [`管理 ${formatPct(etf.managementFee ?? etf.fee)}`];
  if (etf.custodyFee != null) pieces.push(`保管 ${formatPct(etf.custodyFee)}`);
  if (etf.totalExpenseRatio != null) pieces.push(`總費用 ${formatPct(etf.totalExpenseRatio)}`);
  return pieces.join(" / ");
}

function EtfProfileFacts({ etf }) {
  const facts = [
    ["基金類型", valueOrDash(etf.fundType)],
    ["經理人", valueOrDash(etf.manager)],
    ["成立日", valueOrDash(etf.launchDate)],
    ["配息", etf.dividend],
    ["費用", feeLabel(etf)],
    ["近 12 月殖利率", etf.trailingYield == null ? "未揭露" : formatPct(etf.trailingYield)],
  ];

  return (
    <div className="profile-facts">
      <div className="profile-full-name">
        <span>基金全名</span>
        <strong>{valueOrDash(etf.fullName)}</strong>
      </div>
      {facts.map(([label, value]) => (
        <div className="profile-fact" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
      <div className="profile-full-name profile-links">
        <span>官方資訊</span>
        <strong>{valueOrDash(etf.trackingIndex)}</strong>
        <div>
          {etf.issuerSite && (
            <a href={etf.issuerSite} target="_blank" rel="noreferrer">
              投信頁
            </a>
          )}
          {etf.sourceUrl && (
            <a href={etf.sourceUrl} target="_blank" rel="noreferrer">
              ETF 資料頁
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function EtfCompare({ etf, compareRows = [], attackImpact = [], attackFreshness, researchUrl }) {
  const candidates = useMemo(() => compareRows.filter((row) => row.code !== etf.code), [compareRows, etf.code]);
  const [compareCode, setCompareCode] = useState(candidates[0]?.code || "");
  const [compareCopyStatus, setCompareCopyStatus] = useState("idle");
  const compareEtf = compareRows.find((row) => row.code === compareCode) || candidates[0];
  const currentRawAttackScore = attackScoreFor(etf.code, attackImpact);
  const compareRawAttackScore = compareEtf ? attackScoreFor(compareEtf.code, attackImpact) : 0;
  const currentAttackScore = adjustedAttackScore(currentRawAttackScore, attackFreshness);
  const compareAttackScore = adjustedAttackScore(compareRawAttackScore, attackFreshness);

  useEffect(() => {
    if (!compareEtf || compareEtf.code === etf.code) {
      setCompareCode(candidates[0]?.code || "");
    }
  }, [candidates, compareEtf, etf.code]);
  useEffect(() => {
    setCompareCopyStatus("idle");
  }, [compareCode, etf.code]);
  useEffect(() => {
    if (compareCopyStatus === "idle") return undefined;
    const timeout = window.setTimeout(() => setCompareCopyStatus("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [compareCopyStatus]);

  if (!compareEtf) return null;

  const metrics = [
    ["指揮分", etf.commandScore, compareEtf.commandScore, formatSignedNumber(etf.commandScore - compareEtf.commandScore)],
    ["AUM", formatYi(etf.aum), formatYi(compareEtf.aum), formatSignedYi(etf.aum - compareEtf.aum)],
    ["台積電", formatPct(etf.tsmcWeight), formatPct(compareEtf.tsmcWeight), formatSignedPct(etf.tsmcWeight - compareEtf.tsmcWeight)],
    [
      attackFreshness?.status === "live" ? "攻擊分" : "攻擊參考分",
      `${currentAttackScore}（原 ${currentRawAttackScore}）`,
      `${compareAttackScore}（原 ${compareRawAttackScore}）`,
      formatSignedNumber(currentAttackScore - compareAttackScore),
    ],
    ["折溢價", formatPct(etf.premium), formatPct(compareEtf.premium), formatSignedPct(etf.premium - compareEtf.premium)],
  ];
  const verdicts = buildCompareVerdicts(etf, compareEtf, currentAttackScore, compareAttackScore, attackFreshness);
  const conclusion = buildCompareConclusion(etf, compareEtf, verdicts);
  const compareSummary = buildCompareSummary(etf, compareEtf, metrics, verdicts, conclusion, attackFreshness, researchUrl);

  const copyCompareSummary = async () => {
    try {
      await copyText(compareSummary);
      setCompareCopyStatus("copied");
    } catch {
      setCompareCopyStatus("error");
    }
  };

  return (
    <div className="compare-box">
      <div className="compare-head">
        <div>
          <span className="eyebrow">ETF Compare</span>
          <strong>雙檔對比</strong>
        </div>
        <div className="compare-actions">
          <label>
            <span>比較</span>
            <select value={compareEtf.code} onChange={(event) => setCompareCode(event.target.value)} aria-label="選擇比較 ETF">
              {candidates.map((row) => (
                <option key={row.code} value={row.code}>
                  {row.code} {row.name}
                </option>
              ))}
            </select>
          </label>
          <button className={`mini-copy ${compareCopyStatus !== "idle" ? "active" : ""}`} type="button" onClick={copyCompareSummary} aria-label="複製 ETF 對比摘要">
            {compareCopyStatus === "copied" ? <Check size={15} /> : <Copy size={15} />}
            <span>{compareCopyStatus === "copied" ? "已複製" : compareCopyStatus === "error" ? "複製失敗" : "複製對比"}</span>
          </button>
        </div>
      </div>
      <div className="compare-verdicts" aria-label="對比勝出標籤">
        {verdicts.map((verdict) => (
          <span className={verdict.winner === etf.code ? "current" : verdict.winner === compareEtf.code ? "peer" : "tie"} key={verdict.label}>
            <small>{verdict.label}</small>
            <strong>{verdict.winner}</strong>
            <em>{verdict.note}</em>
          </span>
        ))}
      </div>
      <p className="compare-conclusion">{conclusion}</p>
      <div className="compare-table">
        <span className="compare-label">項目</span>
        <span className="compare-label">{etf.code}</span>
        <span className="compare-label">{compareEtf.code}</span>
        <span className="compare-label">差值</span>
        {metrics.map(([label, current, peer, delta]) => (
          <div className="compare-row" key={label}>
            <span>{label}</span>
            <b>{current}</b>
            <b>{peer}</b>
            <strong className={String(delta).startsWith("-") ? "down" : "up"}>{delta}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function IncomeQualityPanel({ etf }) {
  if (!isBondEtf(etf)) return null;
  const yieldLabel = etf.trailingYield == null ? "未揭露" : formatPct(etf.trailingYield);
  const feeText = feeLabel(etf);
  const riskFlags = etf.incomeRiskFlags || [];

  return (
    <div className="income-quality-card">
      <div>
        <span className="eyebrow">Income Quality</span>
        <strong>{etf.incomeScore} 分</strong>
      </div>
      <div>
        <span>近 12 月殖利率</span>
        <b>{yieldLabel}</b>
      </div>
      <div>
        <span>配息節奏</span>
        <b>{valueOrDash(etf.dividend)}</b>
      </div>
      <div>
        <span>折溢價</span>
        <b className={etf.premium >= 0 ? "up" : "down"}>{formatPct(etf.premium)}</b>
      </div>
      <div>
        <span>規模</span>
        <b>{formatYi(etf.aum)}</b>
      </div>
      <small>評分綜合殖利率、配息頻率、費率、折溢價、AUM 與受益人規模。</small>
      <small>{feeText}</small>
      <div className="income-risk-list">
        <span>風險提示</span>
        {riskFlags.length ? (
          riskFlags.map((flag) => (
            <strong className={`risk-${flag.tone}`} key={flag.key} title={flag.detail}>
              {flag.label}
            </strong>
          ))
        ) : (
          <strong className="risk-green">暫無明顯警訊</strong>
        )}
      </div>
    </div>
  );
}

function EtfDetail({ etf, attackImpact = [], attackFreshness, researchUrl, compareRows = [], crowdingProfile, holdingFocus, onFocusHolding, onClearHoldingFocus }) {
  const attackProfile = attackImpact.find((row) => row.code === etf.code);

  return (
    <section className="panel detail-panel">
      <div className="section-head">
        <div>
          <span className="eyebrow">{etf.issuer} · {etf.theme}</span>
          <h2>{etf.code} {etf.name}</h2>
        </div>
        <Sparkline values={etf.pricePath} tone="green" label={`${etf.code} 淨值走勢`} />
      </div>

      <div className="detail-stats">
        <span>AUM <b>{formatYi(etf.aum)}</b></span>
        <span>NAV <b>{etf.nav.toFixed(2)}</b></span>
        <span>折溢價 <b className={etf.premium >= 0 ? "up" : "down"}>{formatPct(etf.premium)}</b></span>
        <span>管理費 <b>{formatPct(etf.fee)}</b></span>
      </div>

      <EtfSourceLine etf={etf} />

      <EtfDataTrustCard etf={etf} attackFreshness={attackFreshness} />

      <EtfProfileFacts etf={etf} />

      <IncomeQualityPanel etf={etf} />

      <EtfShareBrief etf={etf} attackProfile={attackProfile} attackFreshness={attackFreshness} researchUrl={researchUrl} />

      <EtfCompare etf={etf} compareRows={compareRows} attackImpact={attackImpact} attackFreshness={attackFreshness} researchUrl={researchUrl} />

      <WeightBars holdings={etf.topHoldings} />

      <EtfRiskHoldingTop etf={etf} attackProfile={attackProfile} crowdingProfile={crowdingProfile} onFocusHolding={onFocusHolding} />

      <FullHoldingsExplorer etf={etf} attackProfile={attackProfile} crowdingProfile={crowdingProfile} holdingFocus={holdingFocus} onClearHoldingFocus={onClearHoldingFocus} />

      <EtfAttackExposure attackProfile={attackProfile} />

      <EtfCrowdingRisk profile={crowdingProfile} />

      <div className="moves-grid">
        <MoveColumn title="加碼" rows={etf.adds} tone="up" />
        <MoveColumn title="減碼" rows={etf.cuts} tone="down" />
      </div>
    </section>
  );
}

function formatHoldingShares(value) {
  const shares = Number(value || 0);
  if (!shares) return "未揭露股數";
  if (Math.abs(shares) >= 1000) return `${Math.round(shares / 1000).toLocaleString("zh-TW")} 張`;
  return `${shares.toLocaleString("zh-TW")} 股`;
}

function csvCell(value) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function buildHoldingRiskMap(attackProfile, crowdingProfile) {
  const riskMap = new Map();
  const addRisk = (code, risk) => {
    if (!code) return;
    const key = String(code);
    const existing = riskMap.get(key) || [];
    if (!existing.some((item) => item.label === risk.label)) existing.push(risk);
    riskMap.set(key, existing);
  };

  (attackProfile?.symbols || []).forEach((symbol) => {
    addRisk(symbol.symbol, { label: "攻擊命中", tone: "red" });
  });
  (crowdingProfile?.hotspots || []).forEach((hotspot) => {
    addRisk(hotspot.code, { label: "擁擠熱區", tone: hotspot.attackHit ? "red" : "gold" });
  });

  return riskMap;
}

function holdingRiskFlags(risks = []) {
  return {
    attackHit: risks.some((risk) => risk.label === "攻擊命中"),
    crowdingHit: risks.some((risk) => risk.label === "擁擠熱區"),
  };
}

function holdingRiskContributionScore(weight, risks = []) {
  const { attackHit, crowdingHit } = holdingRiskFlags(risks);
  const multiplier = (attackHit ? 2 : 0) + (crowdingHit ? 1 : 0);
  return multiplier * Number(weight || 0);
}

function buildRiskHoldingRows(etf, attackProfile, crowdingProfile) {
  const holdings = etf.holdings?.length ? etf.holdings : etf.topHoldings || [];
  const riskMap = buildHoldingRiskMap(attackProfile, crowdingProfile);
  return holdings
    .map(([code, name, weight, shares]) => {
      const risks = riskMap.get(code) || [];
      const numericWeight = Number(weight || 0);
      const riskScore = holdingRiskContributionScore(numericWeight, risks);
      return {
        code,
        name,
        weight: numericWeight,
        shares,
        exposureYi: (etf.aum * numericWeight) / 100,
        riskScore,
        risks,
      };
    })
    .filter((row) => row.riskScore > 0)
    .sort((a, b) => b.riskScore - a.riskScore || b.weight - a.weight || String(a.code).localeCompare(String(b.code)));
}

function buildHoldingsCsv(etf, holdings, riskMap = new Map()) {
  const header = ["etf_code", "etf_name", "data_date", "holding_code", "holding_name", "weight_pct", "shares", "exposure_yi", "risk_tags", "risk_weight_score", "risk_exposure_yi"];
  const rows = holdings.map(([code, name, weight, shares]) => {
    const numericWeight = Number(weight || 0);
    const risks = riskMap.get(code) || [];
    const riskTags = risks.map((risk) => risk.label).join("|");
    const exposureYi = (etf.aum * numericWeight) / 100;
    const riskScore = holdingRiskContributionScore(numericWeight, risks);
    return [
      etf.code,
      etf.name,
      etf.dataDate || snapshotMeta.asOf || "",
      code,
      name,
      numericWeight.toFixed(4),
      shares || "",
      exposureYi.toFixed(4),
      riskTags,
      riskScore.toFixed(4),
      (riskTags ? exposureYi : 0).toFixed(4),
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function EtfRiskHoldingTop({ etf, attackProfile, crowdingProfile, onFocusHolding }) {
  const rows = useMemo(() => buildRiskHoldingRows(etf, attackProfile, crowdingProfile), [attackProfile, crowdingProfile, etf]);
  const topRows = rows.slice(0, 5);
  const totalRiskWeight = rows.reduce((sum, row) => sum + row.weight, 0);
  const totalRiskExposure = rows.reduce((sum, row) => sum + row.exposureYi, 0);

  if (!topRows.length) {
    return (
      <div className="risk-holdings-card risk-holdings-empty">
        <div>
          <span className="eyebrow">Risk Holdings</span>
          <strong>暫無風險持股命中</strong>
        </div>
        <small>完整持股目前未命中盤中攻擊或擁擠熱區。</small>
      </div>
    );
  }

  return (
    <div className="risk-holdings-card">
      <div className="risk-holdings-head">
        <div>
          <span className="eyebrow">Risk Holdings</span>
          <strong>風險持股前 5 名</strong>
          <small>依攻擊命中與擁擠熱區的權重貢獻排序。</small>
        </div>
        <b>{rows.length}</b>
      </div>
      <div className="risk-holdings-summary">
        <span>風險權重 <b>{formatPct(totalRiskWeight)}</b></span>
        <span>風險曝險 <b>{formatYi(totalRiskExposure, 1)}</b></span>
        <span>最高分 <b>{topRows[0].riskScore.toFixed(2)}</b></span>
      </div>
      <div className="risk-holdings-list">
        {topRows.map((row) => {
          const { attackHit } = holdingRiskFlags(row.risks);
          return (
            <button
              className={`risk-holding-row ${attackHit ? "has-attack" : ""}`}
              key={`${etf.code}-${row.code}`}
              type="button"
              onClick={() => onFocusHolding?.(etf.code, row.code)}
              aria-label={`搜尋 ${etf.code} 完整持股 ${row.code}`}
            >
              <div>
                <span className="mono">{row.code}</span>
                <strong>{row.name}</strong>
                <small>{formatPct(row.weight)} · {formatYi(row.exposureYi, 1)} · 分數 {row.riskScore.toFixed(2)}</small>
              </div>
              <div className="holding-risk-tags">
                {row.risks.map((risk) => (
                  <span className={`risk-${risk.tone}`} key={`${row.code}-${risk.label}`}>{risk.label}</span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FullHoldingsExplorer({ etf, attackProfile, crowdingProfile, holdingFocus, onClearHoldingFocus }) {
  const [holdingQuery, setHoldingQuery] = useState("");
  const [holdingSort, setHoldingSort] = useState("weight");
  const [riskFilter, setRiskFilter] = useState("all");
  const [showAllHoldings, setShowAllHoldings] = useState(false);
  const [copyStatus, setCopyStatus] = useState("idle");
  const holdings = etf.holdings?.length ? etf.holdings : etf.topHoldings || [];
  const holdingRiskMap = useMemo(() => buildHoldingRiskMap(attackProfile, crowdingProfile), [attackProfile, crowdingProfile]);
  const attackRiskCount = useMemo(() => [...holdingRiskMap.values()].filter((items) => items.some((risk) => risk.label === "攻擊命中")).length, [holdingRiskMap]);
  const crowdingRiskCount = useMemo(() => [...holdingRiskMap.values()].filter((items) => items.some((risk) => risk.label === "擁擠熱區")).length, [holdingRiskMap]);
  const anyRiskCount = useMemo(() => new Set([...holdingRiskMap.keys()]).size, [holdingRiskMap]);
  const sortOptions = [
    ["weight", "權重"],
    ["risk", "風險"],
    ["shares", "股數"],
    ["code", "代號"],
  ];
  const riskOptions = [
    ["all", "全部", holdings.length],
    ["risk", "任一風險", anyRiskCount],
    ["attack", "攻擊", attackRiskCount],
    ["crowding", "熱區", crowdingRiskCount],
  ];
  const sortedHoldings = useMemo(() => {
    const query = holdingQuery.trim().toLowerCase();
    const filtered = holdings.filter(([code, name]) => {
      const risks = holdingRiskMap.get(code) || [];
      const matchesQuery = `${code} ${name}`.toLowerCase().includes(query);
      const matchesRisk =
        riskFilter === "all" ||
        (riskFilter === "risk" && risks.length > 0) ||
        (riskFilter === "attack" && risks.some((risk) => risk.label === "攻擊命中")) ||
        (riskFilter === "crowding" && risks.some((risk) => risk.label === "擁擠熱區"));
      return matchesQuery && matchesRisk;
    });
    const comparators = {
      weight: (a, b) => (b[2] || 0) - (a[2] || 0),
      risk: (a, b) =>
        holdingRiskContributionScore(b[2], holdingRiskMap.get(b[0]) || []) -
          holdingRiskContributionScore(a[2], holdingRiskMap.get(a[0]) || []) ||
        (b[2] || 0) - (a[2] || 0),
      shares: (a, b) => (b[3] || 0) - (a[3] || 0),
      code: (a, b) => String(a[0]).localeCompare(String(b[0])),
    };
    return [...filtered].sort(comparators[holdingSort] || comparators.weight);
  }, [holdingQuery, holdingRiskMap, holdingSort, holdings, riskFilter]);
  const collapsedLimit = holdingQuery.trim() ? 24 : 12;
  const canToggleAll = sortedHoldings.length > collapsedLimit;
  const visibleHoldings = useMemo(
    () => (showAllHoldings ? sortedHoldings : sortedHoldings.slice(0, collapsedLimit)),
    [collapsedLimit, showAllHoldings, sortedHoldings],
  );
  const focusedHolding = useMemo(() => {
    if (!holdingFocus?.holdingCode || holdingFocus.etfCode !== etf.code) return null;
    const row = holdings.find(([code]) => String(code) === String(holdingFocus.holdingCode));
    if (!row) return null;
    const [code, name, weight, shares] = row;
    const numericWeight = Number(weight || 0);
    return {
      code,
      name,
      weight: numericWeight,
      shares,
      exposureYi: (etf.aum * numericWeight) / 100,
      risks: holdingRiskMap.get(code) || [],
    };
  }, [etf.aum, etf.code, holdingFocus?.etfCode, holdingFocus?.holdingCode, holdingRiskMap, holdings]);
  const exposureSummary = useMemo(() => {
    return sortedHoldings.reduce(
      (summary, [code, , weight]) => {
        const numericWeight = Number(weight || 0);
        const risks = holdingRiskMap.get(code) || [];
        const { attackHit, crowdingHit } = holdingRiskFlags(risks);

        summary.totalWeight += numericWeight;
        if (attackHit || crowdingHit) summary.riskWeight += numericWeight;
        if (attackHit) summary.attackWeight += numericWeight;
        if (crowdingHit) summary.crowdingWeight += numericWeight;
        return summary;
      },
      { totalWeight: 0, riskWeight: 0, attackWeight: 0, crowdingWeight: 0 },
    );
  }, [holdingRiskMap, sortedHoldings]);
  const summaryItems = [
    ["篩選權重", formatPct(exposureSummary.totalWeight)],
    ["篩選曝險", formatYi((etf.aum * exposureSummary.totalWeight) / 100, 1)],
    ["風險權重", formatPct(exposureSummary.riskWeight)],
    ["攻擊權重", formatPct(exposureSummary.attackWeight)],
    ["熱區權重", formatPct(exposureSummary.crowdingWeight)],
  ];

  useEffect(() => {
    if (!holdingFocus?.holdingCode || holdingFocus.etfCode !== etf.code) return;
    setHoldingQuery(holdingFocus.holdingCode);
    setRiskFilter("all");
    setShowAllHoldings(false);
  }, [etf.code, holdingFocus?.etfCode, holdingFocus?.holdingCode, holdingFocus?.nonce]);
  useEffect(() => {
    setShowAllHoldings(false);
  }, [etf.code, holdingQuery, riskFilter]);

  useEffect(() => {
    setCopyStatus("idle");
  }, [etf.code, holdingQuery, holdingSort, riskFilter]);
  useEffect(() => {
    if (copyStatus === "idle") return undefined;
    const timeout = window.setTimeout(() => setCopyStatus("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyStatus]);

  const copyHoldingsCsv = async () => {
    try {
      await copyText(buildHoldingsCsv(etf, sortedHoldings, holdingRiskMap));
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };
  const resetHoldingsFilter = () => {
    setHoldingQuery("");
    setRiskFilter("all");
    setShowAllHoldings(false);
    onClearHoldingFocus?.();
  };
  const updateHoldingQuery = (event) => {
    const nextQuery = event.target.value;
    setHoldingQuery(nextQuery);
    if (holdingFocus?.etfCode === etf.code && nextQuery !== holdingFocus.holdingCode) {
      onClearHoldingFocus?.();
    }
  };

  if (!holdings.length) return null;

  return (
    <div className="full-holdings">
      <div className="full-holdings-head">
        <div>
          <span className="eyebrow">Full Holdings</span>
          <strong>完整持股明細</strong>
          <small>{holdings.length} 檔 · 匹配 {sortedHoldings.length} 檔 · 顯示 {visibleHoldings.length} 檔 · 攻擊 {attackRiskCount} · 熱區 {crowdingRiskCount}</small>
        </div>
        <div className="full-holdings-controls">
          <label className="mini-search">
            <Search size={15} aria-hidden="true" />
            <input value={holdingQuery} onChange={updateHoldingQuery} placeholder="股票代號 / 名稱" />
          </label>
          {(holdingQuery.trim() || riskFilter !== "all") && (
            <button className="mini-copy holdings-reset" type="button" onClick={resetHoldingsFilter} aria-label={`清除 ${etf.code} 完整持股篩選`}>
              <ListFilter size={15} />
              <span>回到全部</span>
            </button>
          )}
          {canToggleAll && (
            <button className="mini-copy holdings-expand" type="button" onClick={() => setShowAllHoldings((value) => !value)} aria-label={`${showAllHoldings ? "收合" : "顯示"} ${etf.code} 全部完整持股`}>
              <Eye size={15} />
              <span>{showAllHoldings ? "收合" : "顯示全部"}</span>
            </button>
          )}
          <div className="segmented holdings-risk-filter" aria-label={`${etf.code} 完整持股風險篩選`}>
            {riskOptions.map(([key, label, count]) => (
              <button className={riskFilter === key ? "active" : ""} key={key} type="button" onClick={() => setRiskFilter(key)}>
                {label} <small>{count}</small>
              </button>
            ))}
          </div>
          <div className="segmented holdings-sort" aria-label={`${etf.code} 完整持股排序`}>
            {sortOptions.map(([key, label]) => (
              <button className={holdingSort === key ? "active" : ""} key={key} type="button" onClick={() => setHoldingSort(key)}>
                {label}
              </button>
            ))}
          </div>
          <button className={`mini-copy holdings-copy ${copyStatus !== "idle" ? "active" : ""}`} type="button" onClick={copyHoldingsCsv} aria-label={`複製 ${etf.code} 完整持股 CSV`}>
            {copyStatus === "copied" ? <Check size={15} /> : <Copy size={15} />}
            <span>{copyStatus === "copied" ? "已複製" : copyStatus === "error" ? "複製失敗" : "複製CSV"}</span>
          </button>
        </div>
      </div>
      {focusedHolding && (
        <div className="focus-holding-banner" aria-label={`${etf.code} 目前聚焦持股 ${focusedHolding.code}`}>
          <div>
            <span className="eyebrow">Focused Holding</span>
            <strong><span className="mono">{focusedHolding.code}</span> {focusedHolding.name}</strong>
            <small>{formatPct(focusedHolding.weight)} · {formatYi(focusedHolding.exposureYi, 1)} · {formatHoldingShares(focusedHolding.shares)}</small>
          </div>
          <div className="focus-holding-tags">
            <div className="holding-risk-tags">
              {focusedHolding.risks.map((risk) => (
                <span className={`risk-${risk.tone}`} key={`${focusedHolding.code}-${risk.label}`}>{risk.label}</span>
              ))}
            </div>
            <button className="mini-copy focus-clear" type="button" onClick={resetHoldingsFilter} aria-label={`清除 ${etf.code} 聚焦持股 ${focusedHolding.code}`}>
              <ListFilter size={15} />
              <span>回到全部</span>
            </button>
          </div>
        </div>
      )}
      <div className="holding-exposure-strip" aria-label={`${etf.code} 目前篩選持股曝險摘要`}>
        {summaryItems.map(([label, value]) => (
          <span key={label}>
            <small>{label}</small>
            <b>{value}</b>
          </span>
        ))}
      </div>
      <div className="full-holdings-table">
        {visibleHoldings.map(([code, name, weight, shares]) => {
          const risks = holdingRiskMap.get(code) || [];
          return (
            <div className={`full-holding-row ${risks.length ? "has-risk" : ""}`} key={`${etf.code}-${code}`}>
              <span className="mono">{code}</span>
              <strong>{name}</strong>
              <b>{formatPct(weight)}</b>
              <small>{formatHoldingShares(shares)}</small>
              <div className="holding-risk-tags">
                {risks.map((risk) => (
                  <span className={`risk-${risk.tone}`} key={`${code}-${risk.label}`}>{risk.label}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EtfAttackExposure({ attackProfile }) {
  if (!attackProfile) {
    return (
      <div className="detail-attack detail-attack-empty">
        <div>
          <span className="eyebrow">Intraday Attack Exposure</span>
          <strong>未命中盤中攻擊股</strong>
        </div>
        <small>目前匯入的攻擊快取與此 ETF 前五持股 / 加減碼清單沒有交集。</small>
      </div>
    );
  }

  return (
    <div className="detail-attack">
      <div className="detail-attack-head">
        <div>
          <span className="eyebrow">Intraday Attack Exposure</span>
          <strong>盤中攻擊曝險</strong>
        </div>
        <b>{attackProfile.score}</b>
      </div>
      <div className="detail-attack-stats">
        <span>曝險 <b>{formatYi(attackProfile.exposureYi, 1)}</b></span>
        <span>最高權重 <b>{formatPct(attackProfile.maxWeight)}</b></span>
        <span>命中股 <b>{attackProfile.attackCount}</b></span>
      </div>
      <div className="detail-attack-symbols">
        {attackProfile.symbols.map((symbol) => (
          <span key={symbol.symbol}>
            <strong className="mono">{symbol.symbol}</strong>
            {symbol.name} · {symbol.relation} · {formatPct(symbol.weight)}
          </span>
        ))}
      </div>
    </div>
  );
}

function EtfCrowdingRisk({ profile }) {
  const [copyStatus, setCopyStatus] = useState("idle");
  const summary = useMemo(() => (profile ? buildCrowdingShareSummary(profile) : ""), [profile]);
  const topHotspots = useMemo(() => profile?.hotspots.slice(0, 3) || [], [profile]);
  const maxContribution = useMemo(() => Math.max(1, ...topHotspots.map((hotspot) => hotspot.contribution || 0)), [topHotspots]);

  useEffect(() => {
    setCopyStatus("idle");
  }, [profile?.code]);
  useEffect(() => {
    if (copyStatus === "idle") return undefined;
    const timeout = window.setTimeout(() => setCopyStatus("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyStatus]);

  const copyCrowdingSummary = async () => {
    try {
      await copyText(summary);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };

  if (!profile) {
    return (
      <div className="detail-crowding detail-crowding-empty">
        <div>
          <span className="eyebrow">Crowding Risk</span>
          <strong>無重疊熱區暴露</strong>
        </div>
        <small>此 ETF 前五大持股沒有落在目前的多檔共同持有熱區。</small>
      </div>
    );
  }

  return (
    <div className={`detail-crowding crowding-${profile.tone}`}>
      <div className="detail-crowding-head">
        <div>
          <span className="eyebrow">Crowding Risk</span>
          <strong>擁擠交易風險</strong>
        </div>
        <div className="detail-crowding-actions">
          <button className={`mini-copy ${copyStatus !== "idle" ? "active" : ""}`} type="button" onClick={copyCrowdingSummary} aria-label="複製擁擠風險摘要">
            {copyStatus === "copied" ? <Check size={15} /> : <Copy size={15} />}
            <span>{copyStatus === "copied" ? "已複製" : copyStatus === "error" ? "複製失敗" : "複製風險"}</span>
          </button>
          <b>{profile.score}</b>
        </div>
      </div>
      <div className="detail-crowding-stats">
        <span>等級 <b>{profile.label}</b></span>
        <span>熱區曝險 <b>{formatYi(profile.exposureYi, 1)}</b></span>
        <span>攻擊命中 <b>{profile.attackHits}</b></span>
      </div>
      <div className="detail-crowding-symbols">
        {profile.hotspots.slice(0, 4).map((hotspot) => (
          <span className={hotspot.attackHit ? "has-attack" : ""} key={hotspot.code}>
            <strong className="mono">{hotspot.code}</strong>
            {hotspot.name} · {hotspot.etfCount} 檔 · {formatPct(hotspot.weight)}
          </span>
        ))}
      </div>
      <div className="detail-crowding-breakdown" aria-label={`${profile.code} 擁擠熱區拆解`}>
        {topHotspots.map((hotspot) => (
          <article className={hotspot.attackHit ? "has-attack" : ""} key={`breakdown-${hotspot.code}`}>
            <div className="crowding-breakdown-head">
              <div>
                <strong><span className="mono">{hotspot.code}</span> {hotspot.name}</strong>
                <small>{hotspot.etfCount} 檔共同持有 · 熱區總權重 {formatPct(hotspot.totalWeight, 1)}</small>
              </div>
              <b>+{hotspot.contribution}</b>
            </div>
            <ProgressRail value={hotspot.contribution} max={maxContribution} tone={hotspot.attackHit ? "red" : profile.tone} label={`${hotspot.code} 擁擠貢獻`} />
            <p>
              <span>本檔權重 <b>{formatPct(hotspot.weight)}</b></span>
              <span>曝險 <b>{formatYi(hotspot.exposureYi, 1)}</b></span>
              <span>熱度 <b>{hotspot.heatScore}</b></span>
              {hotspot.attackHit && <span className="risk-hot">攻擊命中</span>}
            </p>
            <div className="crowding-peer-list" aria-label={`${hotspot.code} 共同持有 ETF`}>
              {(hotspot.peerHoldings || []).slice(0, 5).map((peer) => (
                <span className={peer.isCurrent ? "current" : ""} key={`${hotspot.code}-${peer.code}`}>
                  <strong className="mono">{peer.code}</strong>
                  <b>{formatPct(peer.weight)}</b>
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function buildCrowdingShareSummary(profile) {
  const hotspots = profile.hotspots
    .slice(0, 4)
    .map(
      (hotspot) => {
        const peers = (hotspot.peerHoldings || [])
          .slice(0, 4)
          .map((peer) => `${peer.code}${peer.isCurrent ? "*" : ""}${formatPct(peer.weight, 1)}`)
          .join("、");
        return `${hotspot.code} ${hotspot.name} 貢獻+${hotspot.contribution} / 權重${formatPct(hotspot.weight)} / 曝險${formatYi(hotspot.exposureYi, 1)} / ${hotspot.etfCount}檔${hotspot.attackHit ? " / 攻擊" : ""} / 同持ETF ${peers}`;
      },
    )
    .join("；");

  return [
    `ETF 擁擠風險｜${profile.code} ${profile.name}`,
    `等級 ${profile.label}｜分數 ${profile.score}｜熱區曝險 ${formatYi(profile.exposureYi, 1)}｜攻擊命中 ${profile.attackHits}`,
    `主要熱區：${hotspots}`,
    `資料日期：ETF ${snapshotMeta.asOf || "未揭露"}｜攻擊量 ${intradayAttackMeta.asOf || "未匯入"}`,
    "解讀：多檔主動 ETF 共同持有的熱區若回落，該 ETF 淨值波動可能同步放大。",
  ].join("\n");
}

function MoveColumn({ title, rows, tone }) {
  return (
    <div className="move-column">
      <h3>{title}</h3>
      {rows.length ? (
        rows.map(([code, name, shares, weight]) => (
          <div className="move-row" key={`${title}-${code}`}>
            <span className="mono">{code}</span>
            <span>{name}</span>
            <b className={tone}>{formatShares(shares)}</b>
            <small>{formatPct(weight)}</small>
          </div>
        ))
      ) : (
        <div className="empty-line">無符合門檻項目</div>
      )}
    </div>
  );
}

function formatFlowYi(value, digits = 1) {
  const numeric = Number(value || 0);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${formatYi(numeric, digits)}`;
}

function Flow({ consensus, watchlist, insights }) {
  const [mode, setMode] = useState("all");
  const [board, setBoard] = useState("sync");
  const rows = consensus.filter((row) => {
    if (mode === "buy") return row.buyEtfs.length > row.sellEtfs.length;
    if (mode === "sell") return row.sellEtfs.length > 0;
    return true;
  });
  const leadingEtf = insights.etfs[0];
  const leadingIndustry = insights.industries[0];
  const attackHits = insights.attackMatchedStocks;
  const boardRows = {
    sync: rows,
    industry: insights.industries,
    etf: insights.etfs,
    overlap: insights.overlapHotspots,
    detail: insights.detailRows,
  }[board];

  return (
    <div className="flow-layout">
      <section className="panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">Flow Command</span>
            <h2>主動圈經理人流向</h2>
          </div>
          <div className="segmented">
            {[
              ["all", "全部"],
              ["buy", "加碼"],
              ["sell", "減碼"],
            ].map(([key, label]) => (
              <button className={mode === key ? "active" : ""} key={key} type="button" onClick={() => setMode(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flow-command-strip">
          <FlowMetric label="估算加碼" value={formatFlowYi(insights.totalBuyYi)} sub={`${insights.buyEtfCount} 檔 ETF 有買進`} tone="up" />
          <FlowMetric label="估算減碼" value={formatFlowYi(insights.totalSellYi)} sub={`${insights.sellEtfCount} 檔 ETF 有賣出`} tone="down" />
          <FlowMetric label="領頭 ETF" value={leadingEtf?.code || "-"} sub={leadingEtf ? `${leadingEtf.name} ${formatFlowYi(leadingEtf.netYi)}` : "資料不足"} />
          <FlowMetric label="領頭產業" value={leadingIndustry?.industry || "-"} sub={leadingIndustry ? formatFlowYi(leadingIndustry.netYi) : "資料不足"} />
          <FlowMetric label="重疊熱區" value={insights.overlapHotspots.length} sub={insights.overlapHotspots[0] ? `${insights.overlapHotspots[0].name} ${insights.overlapHotspots[0].etfCount} 檔持有` : "資料不足"} />
        </div>

        <div className="flow-board-tabs segmented">
          {[
            ["sync", "同步個股"],
            ["industry", "產業流向"],
            ["etf", "ETF 領頭"],
            ["overlap", "重疊熱區"],
            ["detail", "明細"],
          ].map(([key, label]) => (
            <button className={board === key ? "active" : ""} key={key} type="button" onClick={() => setBoard(key)}>
              {label}
            </button>
          ))}
        </div>

        {board === "sync" && (
          <div className="flow-grid">
            {boardRows.map((row) => (
              <SignalRow key={row.code} row={row} large />
            ))}
          </div>
        )}

        {board === "industry" && (
          <div className="flow-rank-board">
            {boardRows.map((row) => (
              <FlowRankRow
                key={row.industry}
                title={row.industry}
                primary={formatFlowYi(row.netYi)}
                sub={`買 ${formatFlowYi(row.buyYi)} · 賣 ${formatFlowYi(row.sellYi)}`}
                tone={row.netYi >= 0 ? "up" : "down"}
              />
            ))}
          </div>
        )}

        {board === "etf" && (
          <div className="flow-rank-board">
            {boardRows.map((row) => (
              <FlowRankRow
                key={row.code}
                title={`${row.code} ${row.name}`}
                primary={formatFlowYi(row.netYi)}
                sub={`加碼 ${formatFlowYi(row.buyYi)} · 減碼 ${formatFlowYi(row.sellYi)} · ${row.changes} 筆`}
                tone={row.netYi >= 0 ? "up" : "down"}
              />
            ))}
          </div>
        )}

        {board === "overlap" && (
          <div className="flow-overlap-list">
            {boardRows.slice(0, 20).map((row) => (
              <FlowOverlapRow key={row.code} row={row} />
            ))}
          </div>
        )}

        {board === "detail" && (
          <div className="flow-detail-list">
            {boardRows.slice(0, 40).map((row) => (
              <div className={`flow-detail-row ${row.flowYi >= 0 ? "is-buy" : "is-sell"}`} key={`${row.etfCode}-${row.code}-${row.typeLabel}`}>
                <span className="mono">{row.etfCode}</span>
                <div>
                  <strong>{row.code} {row.name}</strong>
                  <small>{row.industry} · {row.typeLabel} · {formatShares(row.shares)}</small>
                </div>
                {row.attackHit && <b className="attack-chip">攻擊</b>}
                <strong>{formatFlowYi(row.flowYi)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel watch-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">Attack Overlay</span>
            <h2>攻擊量交集清單</h2>
          </div>
          <ShieldCheck size={20} />
        </div>
        {attackHits.length ? (
          attackHits.slice(0, 6).map((item) => (
            <div className="watch-row attack-watch-row" key={item.code}>
              <span className="mono">{item.code}</span>
              <div>
                <strong>{item.name}</strong>
                <small>{item.industry} · {item.buyEtfs.length} 買 / {item.sellEtfs.length} 賣</small>
              </div>
              <b>{formatFlowYi(item.netYi)}</b>
            </div>
          ))
        ) : (
          <div className="empty-line">目前流向個股尚未命中盤中攻擊快取</div>
        )}

        <div className="section-head watchlist-head">
          <div>
            <span className="eyebrow">Watchlist</span>
            <h2>事件型觀察清單</h2>
          </div>
        </div>
        {watchlist.map((item) => (
          <div className="watch-row" key={item.code}>
            <span className="mono">{item.code}</span>
            <div>
              <strong>{item.name}</strong>
              <small>{item.reason}</small>
            </div>
            <b>{item.sector}</b>
          </div>
        ))}
      </section>
    </div>
  );
}

function FlowOverlapRow({ row }) {
  return (
    <div className={`flow-overlap-row ${row.attackHit ? "has-attack" : ""}`}>
      <div>
        <span className="mono">{row.code}</span>
        <strong>{row.name}</strong>
        <small>{row.etfs.slice(0, 8).join(" · ")}</small>
      </div>
      <b>{row.heatScore}</b>
      <p>
        <span>{row.etfCount} 檔持有</span>
        <span>合計權重 {formatPct(row.totalWeight)}</span>
        <span>曝險 {formatYi(row.exposureYi, 1)}</span>
        {row.netYi !== 0 && <span>{formatFlowYi(row.netYi)}</span>}
        {row.attackHit && <span className="attack-chip">攻擊</span>}
      </p>
    </div>
  );
}

function FlowMetric({ label, value, sub, tone = "neutral" }) {
  return (
    <div className={`flow-metric flow-metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}

function FlowRankRow({ title, primary, sub, tone }) {
  return (
    <div className={`flow-rank-row flow-rank-${tone}`}>
      <div>
        <strong>{title}</strong>
        <small>{sub}</small>
      </div>
      <b>{primary}</b>
    </div>
  );
}

function SignalRow({ row, large = false }) {
  return (
    <article className={`signal-row ${large ? "large" : ""}`}>
      <div>
        <strong className="mono">{row.code}</strong>
        <span>{row.name}</span>
      </div>
      <div className="signal-score">
        <b>{Math.round(row.conviction)}</b>
        <small>score</small>
      </div>
      <p>
        <span className="up">買 {row.buyEtfs.length || 0}</span>
        <span className="down">賣 {row.sellEtfs.length || 0}</span>
        <span>{formatShares(row.netShares)}</span>
        {row.netTradeValue ? <span>{formatFlowYi(row.netTradeValue)}</span> : null}
      </p>
      <small>{[...row.buyEtfs, ...row.sellEtfs].join(" · ")}</small>
    </article>
  );
}

function Attack({ attackCross, attackImpact, freshness, onOpenEtf }) {
  return (
    <div className="attack-layout">
      <section className="panel attack-main">
        <div className="section-head">
          <div>
            <span className="eyebrow">Intraday Attack Volume</span>
            <h2>攻擊量與 ETF 持股交集</h2>
          </div>
          <span className={`badge freshness-badge freshness-${freshness.status}`}>{freshness.label}</span>
        </div>
        {attackCross.length ? (
          <div className="attack-grid">
            {attackCross.map((attack) => (
              <AttackCard attack={attack} key={attack.symbol} />
            ))}
          </div>
        ) : (
          <AttackEmptyState freshness={freshness} />
        )}
      </section>

      <section className="panel watch-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">Data Readiness</span>
            <h2>下一步接線</h2>
          </div>
          <ShieldCheck size={20} />
        </div>
        <FreshnessPanel freshness={freshness} meta={intradayAttackMeta} />
        <AttackUpdatePanel meta={intradayAttackMeta} freshness={freshness} />
        <EtfAttackImpact rows={attackImpact} onOpenEtf={onOpenEtf} />
        <div className="rule-note">
          盤中攻擊訊號由 `npm run import:intraday` 讀取本機最新 CSV 後生成。若狀態不是今日盤中，頁面會明確標示資料日與快取年齡。
        </div>
        <div className="pipeline vertical">
          <span>盤中攻擊 CSV</span>
          <span>去重與分數聚合</span>
          <span>ETF 持股交集</span>
          <span>網頁雷達</span>
          <span>Telegram 警示</span>
        </div>
      </section>
    </div>
  );
}

function AttackEmptyState({ freshness }) {
  return (
    <div className="attack-empty-state">
      <strong>目前沒有可顯示的攻擊交集</strong>
      <span>{freshness.detail}</span>
      <small>先確認短線監控已產生 `*_attack_events.csv`，再用右側更新入口重新匯入。</small>
    </div>
  );
}

function AttackUpdatePanel({ meta, freshness }) {
  const [copyCommandStatus, setCopyCommandStatus] = useState("idle");
  const projectCwd = "/Users/justin/Documents/chatgpt/active-etf-command";
  const importCommand = "npm run import:intraday";
  const fullImportCommand = `cd ${projectCwd} && ${importCommand}`;
  const sourcePath = meta.sourcePath || "../tw_shortterm_screener/data/cache/intraday_events";

  useEffect(() => {
    if (copyCommandStatus === "idle") return undefined;
    const timeout = window.setTimeout(() => setCopyCommandStatus("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyCommandStatus]);

  const copyImportCommand = async () => {
    try {
      await copyText(fullImportCommand);
      setCopyCommandStatus("copied");
    } catch {
      setCopyCommandStatus("error");
    }
  };

  return (
    <div className="update-card">
      <div className="update-card-head">
        <div>
          <span className="eyebrow">Refresh Entry</span>
          <strong>攻擊資料更新入口</strong>
        </div>
        <button className={`mini-copy ${copyCommandStatus !== "idle" ? "active" : ""}`} type="button" onClick={copyImportCommand} aria-label="複製攻擊資料更新指令">
          {copyCommandStatus === "copied" ? <Check size={15} /> : <Copy size={15} />}
          <span>{copyCommandStatus === "copied" ? "已複製" : copyCommandStatus === "error" ? "複製失敗" : "複製指令"}</span>
        </button>
      </div>
      <code>{fullImportCommand}</code>
      <small>工作目錄 {projectCwd}</small>
      <small>短指令 {importCommand}</small>
      <span>{sourcePath}</span>
      <small>狀態 {freshness.label} · 來源檔修改 {freshness.modifiedLabel}</small>
    </div>
  );
}

function EtfAttackImpact({ rows, onOpenEtf }) {
  return (
    <div className="impact-board">
      <div className="section-head">
        <div>
          <span className="eyebrow">ETF Impact</span>
          <h2>受影響排行</h2>
        </div>
      </div>
      {rows.length ? (
        rows.slice(0, 6).map((row) => (
          <button className="impact-row" key={row.code} type="button" onClick={() => onOpenEtf(row.code)}>
            <div>
              <strong className="mono">{row.code}</strong>
              <span>{row.name}</span>
            </div>
            <b>{row.score}</b>
            <small>
              {formatYi(row.exposureYi, 1)} · 最高權重 {formatPct(row.maxWeight)} · {row.symbols[0]?.symbol}
            </small>
          </button>
        ))
      ) : (
        <div className="impact-empty">
          <strong>沒有受影響 ETF</strong>
          <small>攻擊股尚未命中目前 ETF 前五大持股或加減碼清單。</small>
        </div>
      )}
    </div>
  );
}

function FreshnessPanel({ freshness, meta }) {
  return (
    <div className={`freshness-card freshness-${freshness.status}`}>
      <strong>{freshness.label}</strong>
      <span>{freshness.detail}</span>
      <small>來源列數 {meta.sourceRows ?? 0} · 聚合股票 {meta.symbols ?? 0}</small>
      <small>來源檔修改 {freshness.modifiedLabel}</small>
    </div>
  );
}

function AttackCard({ attack, compact = false }) {
  return (
    <article className={`attack-card ${compact ? "compact" : ""}`}>
      <div className="attack-card-head">
        <div>
          <strong className="mono">{attack.symbol}</strong>
          <span>{attack.name}</span>
        </div>
        <b>{Math.round(attack.weightedScore)}</b>
      </div>

      <div className="attack-stats">
        <span>事件 <b>{attack.eventCount}</b></span>
        <span>最高分 <b>{attack.maxScore}</b></span>
        <span>爆量 <b>{Number(attack.maxBurstRatio || 0).toFixed(1)}x</b></span>
        <span>ETF 曝險 <b>{formatYi(attack.exposureYi, 1)}</b></span>
      </div>

      <div className="attack-window">
        <span>{attack.level}</span>
        <small>{attack.firstSeen} - {attack.lastSeen} · {attack.direction === "buy" ? "買盤" : "賣盤"}</small>
      </div>

      {!compact && (
        <>
          <div className="attack-reasons">
            {attack.reasons.map((reason) => (
              <span key={reason}>{reason}</span>
            ))}
          </div>
          <div className="attack-matches">
            {attack.matches.map((match) => (
              <div className="attack-match" key={match.code}>
                <span className="mono">{match.code}</span>
                <strong>{match.name}</strong>
                <small>{match.relation} · {formatPct(match.weight)} · {formatYi(match.exposureYi, 1)}</small>
              </div>
            ))}
          </div>
        </>
      )}
    </article>
  );
}

function Tsmc({ rows, universe }) {
  const [stress, setStress] = useState(10);
  return (
    <div className="tsmc-layout">
      <section className="panel tsmc-main">
        <div className="section-head">
          <div>
            <span className="eyebrow">Limit Simulator</span>
            <h2>台積電 25% 上限壓力測試</h2>
          </div>
          <AlertTriangle size={20} />
        </div>
        <div className="stress-control">
          <label htmlFor="stress">假設台積電價格變動</label>
          <input id="stress" type="range" min="-15" max="25" value={stress} onChange={(event) => setStress(Number(event.target.value))} />
          <strong>{stress > 0 ? "+" : ""}{stress}%</strong>
        </div>
        <div className="tsmc-table">
          {rows.map((row) => {
            const projected = row.weight * (1 + stress / 100);
            return (
              <div className={`tsmc-row status-${row.status}`} key={row.code}>
                <div>
                  <strong>{row.code}</strong>
                  <span>{row.name}</span>
                </div>
                <span>目前 {formatPct(row.weight)}</span>
                <span>壓測 {formatPct(projected)}</span>
                <ProgressRail value={projected} max={25} tone={projected >= 18 ? "red" : "gold"} />
                <b>{formatYi(row.headroom, 1)}</b>
              </div>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">Exposure</span>
            <h2>曝險摘要</h2>
          </div>
        </div>
        <div className="exposure-board">
          <strong>{formatYi(universe.tsmcExposure, 1)}</strong>
          <span>台股型主動 ETF 台積電部位估算</span>
          <ProgressRail value={universe.tsmcExposure} max={900} tone="red" />
        </div>
        <div className="rule-note">
          主動 ETF 單一公司持股上限以 25% 作為監管觀察點；既有條款、契約與海外型基金需分開標記。
        </div>
      </section>
    </div>
  );
}

function Reports() {
  const timeline = useMemo(() => buildUpdateTimeline(etfs), []);
  const diffWindows = useMemo(() => buildDiffWindows(etfs), []);
  const styleRows = useMemo(() => buildIssuerStyleRows(etfs), []);

  return (
    <div className="report-layout">
      <UpdateTimeline timeline={timeline} diffWindows={diffWindows} />
      <IssuerStyleMap rows={styleRows} />
      {reports.map((report) => (
        <section className="panel report-card" key={report.id}>
          <div className="section-head">
            <div>
              <span className="eyebrow">{report.time}</span>
              <h2>{report.title}</h2>
            </div>
            <SlidersHorizontal size={20} />
          </div>
          <span className="badge">{report.tone}</span>
          <ul>
            {report.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
      <section className="panel roadmap">
        <div className="section-head">
          <div>
            <span className="eyebrow">Next Data Layer</span>
            <h2>產品級資料管線</h2>
          </div>
          <LineChart size={20} />
        </div>
        <div className="pipeline">
          <span>官方揭露</span>
          <span>正規化</span>
          <span>異動偵測</span>
          <span>指標引擎</span>
          <span>Telegram / Web 推播</span>
        </div>
      </section>
    </div>
  );
}

function buildDiffWindows(rows) {
  const book = new Map();

  rows.forEach((etf) => {
    const from = etf.comparisonFromDate || "未揭露";
    const to = etf.comparisonToDate || etf.dataDate || "未揭露";
    const key = `${from}->${to}`;
    const row = book.get(key) || {
      key,
      from,
      to,
      etfCount: 0,
      changeRows: 0,
      etfs: [],
    };
    row.etfCount += 1;
    row.changeRows += etf.flowChanges?.length || etf.adds?.length + etf.cuts?.length || 0;
    row.etfs.push(etf.code);
    book.set(key, row);
  });

  return [...book.values()].sort((a, b) => {
    const byDate = String(b.to).localeCompare(String(a.to));
    if (byDate !== 0) return byDate;
    return b.changeRows - a.changeRows;
  });
}

function buildIssuerStyleRows(rows) {
  const book = new Map();

  rows.forEach((etf) => {
    const issuer = etf.issuer || "未揭露投信";
    const row = book.get(issuer) || {
      issuer,
      managers: new Set(),
      codes: [],
      themes: new Map(),
      aum: 0,
      etfCount: 0,
      tw: 0,
      global: 0,
      bond: 0,
      avgTsmc: 0,
      flowRows: 0,
      leadCode: etf.code,
      leadAum: 0,
    };
    const asset = classifyEtfAsset(etf);
    row.etfCount += 1;
    row.aum += etf.aum || 0;
    row.codes.push(etf.code);
    if (etf.manager) row.managers.add(etf.manager);
    row.themes.set(etf.theme, (row.themes.get(etf.theme) || 0) + 1);
    if (asset === "tw") row.tw += 1;
    if (asset === "global") row.global += 1;
    if (asset === "bond") row.bond += 1;
    row.avgTsmc += etf.tsmcWeight || 0;
    row.flowRows += etf.flowChanges?.length || 0;
    if ((etf.aum || 0) > row.leadAum) {
      row.leadCode = etf.code;
      row.leadAum = etf.aum || 0;
    }
    book.set(issuer, row);
  });

  return [...book.values()]
    .map((row) => {
      const assetCounts = [
        ["tw", row.tw],
        ["global", row.global],
        ["bond", row.bond],
      ].sort((a, b) => b[1] - a[1]);
      const themes = [...row.themes.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([theme]) => theme)
        .join("、");

      return {
        ...row,
        bondShare: row.etfCount ? row.bond / row.etfCount : 0,
        dominantAsset: assetLabel(assetCounts[0][0]),
        avgTsmc: row.etfCount ? row.avgTsmc / row.etfCount : 0,
        managers: [...row.managers],
        themes,
      };
    })
    .sort((a, b) => b.aum - a.aum);
}

function buildUpdateTimeline(rows) {
  const diffWindows = buildDiffWindows(rows);
  const latestWindow = diffWindows[0];
  const etfFreshness = etfSnapshotFreshness(snapshotMeta);
  const attackFreshness = intradayFreshness(intradayAttackMeta);
  const nextRefresh = nextDailyRefresh();

  return [
    {
      label: "下一次排程",
      value: nextRefresh.value,
      detail: nextRefresh.detail,
      tone: nextRefresh.tone,
    },
    {
      label: "ETF 快照",
      value: snapshotMeta.asOf || "未匯入",
      detail: `${etfFreshness.label} · ${snapshotMeta.coverage || rows.length} 檔 · 生成 ${formatTaipeiDateTime(snapshotMeta.generatedAt)}`,
      tone: etfFreshness.tone,
    },
    {
      label: "最新異動區間",
      value: latestWindow ? `${latestWindow.from} -> ${latestWindow.to}` : "未揭露",
      detail: latestWindow ? `${latestWindow.etfCount} 檔 ETF · ${latestWindow.changeRows} 筆 latestDiff` : "尚無 latestDiff 區間",
      tone: latestWindow?.changeRows ? "green" : "gold",
    },
    {
      label: "盤中攻擊快取",
      value: intradayAttackMeta.asOf || "未匯入",
      detail: `${attackFreshness.label} · ${intradayAttackMeta.symbols || 0} 檔攻擊股 · ${intradayAttackMeta.sourceRows || 0} 筆事件`,
      tone: attackFreshness.tone,
    },
  ];
}

function buildTimelineSummary(timeline, diffWindows, format = "telegram", diffMode = "latest") {
  const limit = diffMode === "all" ? 5 : 1;
  const diffLines = diffWindows.length
    ? diffWindows.slice(0, limit).map((row, index) => `${index + 1}. ${row.from} -> ${row.to}｜${row.etfCount} 檔｜${row.changeRows} 筆｜${row.etfs.slice(0, 4).join("、")}`)
    : ["尚無 latestDiff 區間"];

  if (format === "threads") {
    const nextSchedule = timeline.find((item) => item.label === "下一次排程");
    const etfSnapshot = timeline.find((item) => item.label === "ETF 快照");
    const latestDiff = timeline.find((item) => item.label === "最新異動區間");
    const attackCache = timeline.find((item) => item.label === "盤中攻擊快取");
    return [
      `ETF 異動日曆：下一次重抓 ${nextSchedule?.value || "未揭露"}。`,
      `ETF 快照 ${etfSnapshot?.value || "未匯入"}，${etfSnapshot?.detail || "狀態未揭露"}。`,
      `latestDiff ${latestDiff?.value || "未揭露"}，${latestDiff?.detail || "尚無異動統計"}。`,
      `盤中攻擊快取 ${attackCache?.value || "未匯入"}，${attackCache?.detail || "尚未匯入"}。`,
      `主要異動區間：${diffLines.slice(0, 2).join("；")}。`,
    ].join("\n");
  }

  return [
    "ETF 異動日曆",
    ...timeline.map((item) => `${item.label}：${item.value}｜${item.detail}`),
    "持股異動區間",
    ...diffLines,
  ].join("\n");
}

function UpdateTimeline({ timeline, diffWindows }) {
  const [copyStatus, setCopyStatus] = useState("idle");
  const [summaryFormat, setSummaryFormat] = useState("telegram");
  const [diffMode, setDiffMode] = useState("latest");
  const timelineSummary = useMemo(() => buildTimelineSummary(timeline, diffWindows, summaryFormat, diffMode), [diffMode, diffWindows, summaryFormat, timeline]);

  useEffect(() => {
    if (copyStatus === "idle") return undefined;
    const timeout = window.setTimeout(() => setCopyStatus("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyStatus]);
  useEffect(() => {
    setCopyStatus("idle");
  }, [diffMode, summaryFormat]);

  const copyTimelineSummary = async () => {
    try {
      await copyText(timelineSummary);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };

  return (
    <section className="panel timeline-panel">
      <div className="section-head">
        <div>
          <span className="eyebrow">ETF Update Calendar</span>
          <h2>資料更新與異動時間線</h2>
        </div>
        <div className="timeline-actions">
          <div className="segmented timeline-format" aria-label="ETF 異動日曆摘要格式">
            {timelineFormats.map(([key, label]) => (
              <button className={summaryFormat === key ? "active" : ""} key={key} type="button" onClick={() => setSummaryFormat(key)}>
                {label}
              </button>
            ))}
          </div>
          <div className="segmented timeline-range" aria-label="ETF 異動日曆區間數量">
            {timelineDiffModes.map(([key, label]) => (
              <button className={diffMode === key ? "active" : ""} key={key} type="button" onClick={() => setDiffMode(key)}>
                {label}
              </button>
            ))}
          </div>
          <button className={`mini-copy ${copyStatus !== "idle" ? "active" : ""}`} type="button" onClick={copyTimelineSummary} aria-label="複製 ETF 異動日曆摘要">
            {copyStatus === "copied" ? <Check size={15} /> : <Copy size={15} />}
            <span>{copyStatus === "copied" ? "已複製" : copyStatus === "error" ? "複製失敗" : `複製${timelineFormats.find(([key]) => key === summaryFormat)?.[1] || ""}`}</span>
          </button>
          <CalendarClock size={20} />
        </div>
      </div>
      <div className="timeline-grid">
        {timeline.map((item) => (
          <article className={`timeline-card timeline-${item.tone}`} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </div>
      <div className="timeline-preview" aria-label={`${timelineFormats.find(([key]) => key === summaryFormat)?.[1] || "Telegram"} 異動日曆摘要預覽`}>
        <span>{timelineFormats.find(([key]) => key === summaryFormat)?.[1] || "Telegram"} Preview</span>
        <pre>{timelineSummary}</pre>
      </div>
      <div className="diff-window-list">
        <span>持股異動區間</span>
        {diffWindows.slice(0, 5).map((diffWindow) => (
          <strong key={diffWindow.key} title={diffWindow.etfs.join("、")}>
            {`${diffWindow.from} -> ${diffWindow.to} · ${diffWindow.etfCount} 檔 · ${diffWindow.changeRows} 筆`}
          </strong>
        ))}
      </div>
    </section>
  );
}

function IssuerStyleMap({ rows }) {
  const [sortMode, setSortMode] = useState("aum");
  const sortOptions = [
    ["aum", "AUM"],
    ["flow", "異動活躍"],
    ["tsmc", "台積電集中"],
    ["bond", "收益占比"],
  ];
  const sortedRows = useMemo(() => {
    const comparators = {
      aum: (a, b) => b.aum - a.aum,
      flow: (a, b) => b.flowRows - a.flowRows,
      tsmc: (a, b) => b.avgTsmc - a.avgTsmc,
      bond: (a, b) => b.bondShare - a.bondShare || b.aum - a.aum,
    };
    return [...rows].sort(comparators[sortMode] || comparators.aum);
  }, [rows, sortMode]);
  const sortLabel = sortOptions.find(([key]) => key === sortMode)?.[1] || "AUM";

  return (
    <section className="panel issuer-style-panel">
      <div className="section-head">
        <div>
          <span className="eyebrow">Manager Style Map</span>
          <h2>投信 / 經理人風格分群</h2>
        </div>
        <div className="issuer-style-actions">
          <div className="segmented" aria-label="投信風格排序">
            {sortOptions.map(([key, label]) => (
              <button className={sortMode === key ? "active" : ""} key={key} type="button" onClick={() => setSortMode(key)}>
                {label}
              </button>
            ))}
          </div>
          <SlidersHorizontal size={20} />
        </div>
      </div>
      <div className="issuer-style-grid">
        {sortedRows.slice(0, 8).map((row, index) => (
          <article className="issuer-style-card" key={row.issuer}>
            <div>
              <strong>{row.issuer}</strong>
              <span>#{index + 1} {sortLabel} · {row.etfCount} 檔 · {row.dominantAsset} · 主力 {row.leadCode}</span>
            </div>
            <b>{formatYi(row.aum, 0)}</b>
            <p>
              <span>台股 {row.tw}</span>
              <span>海外 {row.global}</span>
              <span>債券 {row.bond}</span>
              <span>異動 {row.flowRows}</span>
              <span>債券占比 {formatPct(row.bondShare * 100, 0)}</span>
            </p>
            <small>經理人 {row.managers.slice(0, 2).join("、") || "未揭露"}</small>
            <small>風格 {row.themes || "未分類"} · 平均台積電 {formatPct(row.avgTsmc)}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

export default App;
