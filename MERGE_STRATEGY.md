# MERGE_STRATEGY.md

Audit date: 2026-05-20 Asia/Taipei

Scope: Phase 1 only. This document audits the latest local state of both repos and proposes merge structures. No pipeline was moved, no source code was deleted, no `.env` / API key / credential file was read or changed, and no commit was created.

Source repo to retire later: `/Users/justin/Documents/chatgpt/us-market-radar`

Destination repo: `/Users/justin/Documents/chatgpt/active-etf-command`

Safety tags confirmed locally:

- `us-market-radar`: `pre-migration-snapshot-20260520`
- `active-etf-command`: `pre-merge-snapshot-20260520`

Current repo caveat:

- `active-etf-command` is already dirty before this audit. Existing modified/untracked files must be preserved during later migration.
- `us-market-radar` latest local tree includes newer modules not present in the previous audit: `server/memoryMarket.js` and `server/etfAlertBridge.js`.

## Executive Decision Frame

Recommended direction: merge into `active-etf-command` and evolve it into a single "stock command" surface with four high-level views:

1. ETF command center: current Taiwan active ETF workflow.
2. SEC Hunter: 13F / Form 4 / 13D-G idea feed.
3. Macro / Memory / Theme risk: FRED, Treasury, TrendForce memory pricing, Yahoo theme risk.
4. Linkage Radar: US-to-Taiwan transmission such as MU -> memory names, TSM ADR -> 2330, SMH/SOXX -> semiconductor ETF and holdings risk.

Main structural choice Justin needs to make before Phase 2:

- Option A: flat structure, fastest migration and lowest ceremony.
- Option B: feature folders, cleaner long-term shape and better for SEC / ETF / macro / linkage separation.

My recommendation is Option B if this site becomes the main long-lived workstation.

## 1. us-market-radar Latest Architecture

### 1.1 Directory Tree

Tree excludes `.git`, `node_modules`, `dist`, and `outbox`.

```text
us-market-radar/
├── .github/
│   └── workflows/
│       ├── pages.yml
│       └── refresh-data.yml
├── docs/
│   └── source-check.md
├── launchd/
│   ├── com.justin.usmarketradar.form4tg.plist
│   ├── com.justin.usmarketradar.morning.plist
│   ├── com.justin.usmarketradar.publishdaily.plist
│   └── com.justin.usmarketradar.publishmarket.plist
├── public/
│   ├── .nojekyll
│   └── data/
│       ├── .gitkeep
│       ├── active-etf-scan.png
│       ├── dashboard.json
│       ├── meta.json
│       ├── smart-money.json
│       ├── us_market_radar.md
│       └── us_market_radar_telegram.txt
├── scripts/
│   ├── export_static_site.mjs
│   ├── install_form4_agent.sh
│   ├── install_launch_agent.sh
│   ├── install_publish_site_agents.sh
│   ├── publish_public_site.mjs
│   ├── publish_site_job.sh
│   ├── run_form4_telegram_job.sh
│   ├── send_form4_telegram.mjs
│   ├── send_telegram_report.mjs
│   ├── telegram_utils.mjs
│   └── write_daily_report.mjs
├── server/
│   ├── etfAlertBridge.js
│   ├── events.js
│   ├── form4Digest.js
│   ├── index.js
│   ├── macroRisk.js
│   ├── marketData.js
│   ├── memoryMarket.js
│   ├── reporting.js
│   ├── scoring.js
│   ├── smartMoney.js
│   └── trumpOge.js
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── test/
│   ├── macroRisk.test.mjs
│   ├── scoring.test.mjs
│   └── smartMoney.test.mjs
├── index.html
├── package-lock.json
├── package.json
├── README.md
└── vite.config.js
```

### 1.2 Main Functional Modules

| Module | Files | Current Role | Merge Action |
|---|---|---|---|
| SEC Smart Money | `server/smartMoney.js`, `test/smartMoney.test.mjs` | Fetches and parses SEC 13F, Form 4, 13D/G; creates fund, insider, alert, freshness summary | Move |
| Form 4 digest | `server/form4Digest.js`, `scripts/send_form4_telegram.mjs`, `scripts/run_form4_telegram_job.sh` | Renders Form 4 digest SVG/PNG and Telegram-ready source links | Move, but leave Telegram sending disabled until approved |
| Yahoo market data | `server/marketData.js` | Fetches Yahoo chart data for global, US, semiconductor, risk, macro, Taiwan holdings symbols | Move and refactor into market data utility |
| Macro risk | `server/macroRisk.js`, `test/macroRisk.test.mjs` | Berkshire cash from SEC, Treasury debt, FRED credit/financial stress series | Move |
| Memory market | `server/memoryMarket.js` | TrendForce DRAM/NAND/HBM public pages plus Yahoo memory-chain quotes; creates memory alert/price cards | Move; important for DRAM monitoring request |
| ETF alert bridge | `server/etfAlertBridge.js` | Reads destination `theme-risk-latest.json` and exposes ETF theme alerts inside us-market-radar | Do not move as-is; replace with internal integration in target |
| US/Taiwan linkage scoring | `server/scoring.js`, `test/scoring.test.mjs` | Converts US/global factors into pulse, global health, Taiwan holding impact, warnings, movers | Move and evolve into Linkage Radar |
| Static event calendar | `server/events.js` | FOMC/CPI/PCE/NVDA event calendar and US market clock | Optional move; useful for events route |
| Report renderer | `server/reporting.js`, `scripts/write_daily_report.mjs` | Markdown/Telegram report renderer mixing SEC, macro, memory, ETF bridge, alerts | Move as report/Threads draft base, rewrite output boundaries |
| Express API shell | `server/index.js` | `/api/health`, `/api/dashboard`, `/api/smart-money`, `/api/report`, Vite middleware | Partially move; target currently static Vite, so API choice needs Phase 2 decision |
| Trump OGE | `server/trumpOge.js`, `TrumpOgePanel` | Hardcoded Trump 278-T interpretation | Delete; explicitly out of merge scope |
| Force publish old site | `scripts/publish_public_site.mjs`, `scripts/publish_site_job.sh`, publish launchd plists | Force-pushes generated static site to `Sun16z/us-market-radar-site` | Delete/retire; do not migrate |
| Telegram full report job | `scripts/send_telegram_report.mjs`, morning launchd plist | Sends old full report to Telegram | Delete/retire; do not migrate |

### 1.3 Data Pipelines

| Pipeline | Source File(s) | External Source | Env Keys | Output Today | Merge Notes |
|---|---|---|---|---|---|
| SEC EDGAR Smart Money | `server/smartMoney.js` | `data.sec.gov/submissions`, `www.sec.gov/Archives` | `SEC_USER_AGENT`, `SEC_CACHE_TTL_MS`, `SEC_TIMEOUT_MS`, `SEC_MIN_INTERVAL_MS` | `public/data/smart-money.json`, Smart Money UI, report sections | Preserve request pacing and tests |
| Form 4 digest | `server/form4Digest.js`, `scripts/send_form4_telegram.mjs` | Smart Money output | `TELEGRAM_ENV`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_REQUEST_TIMEOUT_MS` | `outbox/YYYY-MM-DD/form4_digest.*`, Telegram image/text | Move renderer; credentials stay local and untouched |
| Yahoo market data | `server/marketData.js` | Yahoo Finance chart endpoint | `MARKET_CACHE_TTL_MS`, `MARKET_REQUEST_TIMEOUT_MS` | Asset rows, source health, fallback quotes | Merge with target theme-risk Yahoo usage |
| Macro risk | `server/macroRisk.js` | SEC Berkshire filings, FiscalData Treasury, FRED CSV | `MACRO_RISK_TIMEOUT_MS`, `MACRO_CACHE_TTL_MS`, `SEC_USER_AGENT` | Macro indicators and summary score | Move behind macro route / static export |
| Memory market | `server/memoryMarket.js` | TrendForce public price pages, Yahoo memory-chain quotes | `MEMORY_MARKET_CACHE_TTL_MS`, `MEMORY_MARKET_REQUEST_TIMEOUT_MS` | Memory market summary/cards/alerts/sources | Move and add durable daily persistence later |
| ETF alert bridge | `server/etfAlertBridge.js` | `active-etf-command/public/data/theme-risk-latest.json` | `ETF_THEME_RISK_PATH` | ETF theme alerts in us-market-radar | Replace with direct target data import |
| Static export | `scripts/export_static_site.mjs` | dashboard builder | `STATIC_SMART_MONEY_PREFER_DISK` | `public/data/dashboard.json`, `smart-money.json`, `meta.json`, report files | Rebuild inside target as multi-dataset export |
| Old public publish | `scripts/publish_public_site.mjs` | GitHub remote `Sun16z/us-market-radar-site` | `PUBLIC_SITE_REPO` | force-pushed old Pages repo | Confirmed cut |

### 1.4 UI Components

Current `src/App.jsx` component inventory:

| Component | Role | Merge Action |
|---|---|---|
| `Sparkline` | Small SVG trend line | Move or use target `MiniCharts.Sparkline` |
| `ScoreBar` | Compact score bar | Move into shared UI if needed |
| `Metric` | Generic metric tile | Use target `MetricTile` style instead |
| `SourceBadge` | Source health badge | Move |
| `SecBadge` | SEC freshness/status badge | Move |
| `AssetRow` | Quote row | Move for linkage / market table |
| `ImpactCard` | Taiwan holding impact card | Replace with Linkage Radar table |
| `WarningList` | Warning panel | Move logic, restyle |
| `EventList` | Calendar list | Optional move |
| `DetailDisclosure` | Collapsible detail | Move if feature-folder option chosen |
| `GlobalMarketGlance` | Compact global market strip | Move |
| `GlobalMarketTable` | Global market table | Move |
| `GlobalHealthPanel` | Global health / top-risk panel | Move |
| `MacroRiskPanel` | Macro pressure panel | Move |
| `MemoryLineChart` | Memory normalized trend chart | Move |
| `MemoryStageCard` | Memory cycle stage card | Move |
| `MemoryPriceCard` | DRAM/NAND/HBM price card | Move |
| `MemoryAlertList` | Memory alert list | Move |
| `MemorySourceList` | TrendForce/Yahoo source list | Move |
| `MemoryMarketSnapshot` | Memory market panel | Move |
| `SmartMoneySnapshot` | SEC summary block | Move |
| `TrumpTradeGlance` | Trump OGE compact trade summary | Delete |
| `TrumpTradeTable` | Trump OGE table | Delete |
| `TrumpOgePanel` | Trump OGE panel | Delete |
| `DecisionDeck` | Top decision/action surface | Rebuild in target design |
| `PlatformMonitorPanel` | System/source monitor | Move concept, restyle |
| `AlertLight` | Alert indicator | Move |
| `AlertCenterPanel` | Cross-domain alert center | Move |
| `ReportPanel` | Report preview | Move concept for Threads/report drafts |
| `OverviewFold` | Folded overview section | Move only if needed |
| `DashboardView` | Old dashboard view | Rebuild |
| `SemisView` | Semiconductor table | Move into Linkage Radar |
| `MemoryMarketView` | Memory market full view | Move |
| `AlertCenterView` | Alert center view | Move |
| `HoldingsView` | Old Taiwan holdings impact | Replace with target ETF details |
| `MoversView` | Cross-asset movers | Move |
| `SmartAlertList` | SEC alert list | Move |
| `FundCard` | 13F fund card | Move |
| `InsiderGlance` | Compact insider view | Move |
| `InsiderFullTable` | Full Form 4 table | Move |
| `InsiderTable` | Insider wrapper/table | Move |
| `SmartMoneyView` | SEC main view | Move and restyle as SEC Hunter |
| `App` | Sidebar shell and data loading | Do not move as-is |

### 1.5 Routes / Views

`us-market-radar` uses internal tab state rather than router files:

| Tab | Current View | Merge Destination |
|---|---|---|
| `overview` | Dashboard, decision deck, alert center, memory/SEC/macro panels | Target dashboard summary or `/events` |
| `semis` | Semiconductor assets | `/macro` or `/events` as Linkage Radar subsection |
| `memory` | Memory market and TrendForce/Yahoo chain | `/macro` or `/events` |
| `alerts` | Cross-domain alert center | Global top alert zone |
| `holdings` | Taiwan holdings impact | ETF view / Linkage Radar |
| `smart` | SEC Smart Money | `/sec` |
| `events` | Event calendar and movers | `/events` |
| `report` | Report preview | Shared report / Threads composer |

### 1.6 Scheduling

GitHub Actions:

| File | Trigger | Purpose | Merge Action |
|---|---|---|---|
| `.github/workflows/pages.yml` | push to `main`, manual | Build only | Fold into target Pages workflow if needed |
| `.github/workflows/refresh-data.yml` | daily `20 22 * * *` UTC, manual | `npm run export:static`, commit `public/data` | Merge carefully; target already has daily Pages schedule |

launchd:

| File | Schedule | Purpose | Merge Action |
|---|---|---|---|
| `com.justin.usmarketradar.form4tg.plist` | 15:00 Taipei | Form 4 Telegram digest | Optional move only after notification policy approval |
| `com.justin.usmarketradar.morning.plist` | 08:00 Taipei | Full Telegram report | Confirmed cut |
| `com.justin.usmarketradar.publishdaily.plist` | 06:35 Taipei | Force publish old public site | Confirmed cut |
| `com.justin.usmarketradar.publishmarket.plist` | every 21,600 seconds in latest plist | Force publish old public site | Confirmed cut |

## 2. active-etf-command Current State

### 2.1 Directory Tree

Tree excludes `.git`, `node_modules`, and `dist`. Generated `outputs` are listed by durable groups and latest files.

```text
active-etf-command/
├── .github/
│   └── workflows/
│       └── pages.yml
├── outputs/
│   ├── active-etf-0518-*.png/svg/json
│   ├── active-etf-0519-*.png/svg/json
│   ├── backtests/
│   │   ├── etf_buy_signal_backtest_2026-05-15_to_2026-05-18.*
│   │   ├── etf_buy_signal_backtest_2026-05-18_to_2026-05-19.*
│   │   └── today_tw_backtest_*_2026-05-19.*
│   ├── core_db/
│   │   ├── daily/2026-05-19/
│   │   │   ├── daily_etf_summaries.json
│   │   │   ├── daily_movements.json
│   │   │   ├── etf_universe.json
│   │   │   ├── intraday_attacks.json
│   │   │   ├── manifest.json
│   │   │   └── theme_risk.json
│   │   ├── latest/
│   │   │   ├── daily_etf_summaries.json
│   │   │   ├── daily_movements.json
│   │   │   ├── etf_universe.json
│   │   │   ├── intraday_attacks.json
│   │   │   ├── manifest.json
│   │   │   └── theme_risk.json
│   │   └── latest_manifest.json
│   ├── reports/
│   │   └── 2026-05-19_* ETF completion / holding changes reports
│   ├── daily_refresh_stdout.log
│   └── daily_refresh_stderr.log
├── public/
│   └── data/
│       └── theme-risk-latest.json
├── scripts/
│   ├── exportCoreDatabaseSnapshot.mjs
│   ├── importDailyMovements.mjs
│   ├── importEtfUniverse.mjs
│   ├── importIntradayAttacks.mjs
│   ├── importThemeRisk.mjs
│   ├── render_0519_full_market_scan.py
│   ├── render_0519_qa_etf_radar.py
│   ├── render_three_etf_threads_card.py
│   └── run_daily_refresh.sh
├── src/
│   ├── components/
│   │   ├── EtfTable.jsx
│   │   ├── MetricTile.jsx
│   │   └── MiniCharts.jsx
│   ├── data/
│   │   ├── dailyMovements.js
│   │   ├── etfUniverse.js
│   │   ├── intradayAttacks.js
│   │   └── themeRisk.js
│   ├── lib/
│   │   └── analytics.js
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── com.justin.activeetf.refresh.plist
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── README.md
├── vercel.json
└── vite.config.js
```

### 2.2 Existing Features

| Area | Current Assets | Notes |
|---|---|---|
| ETF command dashboard | `Dashboard`, `EtfTable`, `MetricTile`, `DataQualityRadar`, `RefreshPriorityPanel` | Dense operational UI already exists |
| ETF PCF / daily diff | `scripts/importDailyMovements.mjs`, `src/data/dailyMovements.js`, `DailyMovements`, `MovementLeaderBoard`, `EtfNetFlowBoard`, `StockFlowBoard` | Strongest current dataset; includes official PCF sources and historical snapshot diffs |
| Full ETF holdings | `scripts/importEtfUniverse.mjs`, `src/data/etfUniverse.js`, `FullHoldingsExplorer`, `EtfProfileFacts` | Complete holdings and source URL surfaces already exist |
| 00991A / 00981A / 00988A / 00403A coverage | `officialSources` map includes all four | Matches fixed target set |
| Taiwan intraday attack overlay | `scripts/importIntradayAttacks.mjs`, `src/data/intradayAttacks.js`, `Attack`, `EtfAttackImpact` | Pulls from `tw_shortterm_screener` cache |
| Theme risk | `scripts/importThemeRisk.mjs`, `src/data/themeRisk.js`, `public/data/theme-risk-latest.json`, `ThemeRisk` | Already uses Yahoo for US/Taiwan memory/semiconductor watchlist |
| TSMC concentration | `tsmcRows`, `Tsmc`, 25% radar | Needs rule change if Justin wants >20% yellow from DESIGN v2 |
| Reports / post material | `Reports`, `EtfShareBrief`, render scripts | Good base for Threads composer, currently embedded in large App file |
| URL state / sharing | `readUrlState`, `writeUrlState`, `buildResearchUrl` | Existing SPA query param state |
| Core DB export | `scripts/exportCoreDatabaseSnapshot.mjs`, `outputs/core_db/latest/*` | Good durable data boundary for merged site |

### 2.3 Current Data Sources And Update Mechanism

| Data | Script/File | Source | Env Keys | Output |
|---|---|---|---|---|
| ETF universe / holdings | `scripts/importEtfUniverse.mjs` | `https://www.etfinfo.tw/etf`, ETF active pages | `ACTIVE_ETF_SCOPE`, `ACTIVE_ETF_FETCH_TIMEOUT_MS`, `ACTIVE_ETF_CODES` | `src/data/etfUniverse.js` |
| Daily PCF / diff | `scripts/importDailyMovements.mjs` | ETFInfo, issuer official PCF APIs/pages: EzMoney, Fuh Hwa, Capital, CTBC, Allianz, Nomura, Cathay, JPM, Yuanta, etc. | `ACTIVE_ETF_DAILY_ROWS`, `ACTIVE_ETF_FETCH_TIMEOUT_MS`, `ACTIVE_ETF_REPORT_DATE`, `HOME` | `src/data/dailyMovements.js` |
| Intraday attack | `scripts/importIntradayAttacks.mjs` | local `tw_shortterm_screener/data/cache/intraday_events` | `INTRADAY_EVENTS_DIR` | `src/data/intradayAttacks.js` |
| Theme risk | `scripts/importThemeRisk.mjs` | Yahoo chart endpoint + recent ETF flow | `THEME_RISK_FETCH_TIMEOUT_MS` | `src/data/themeRisk.js`, `public/data/theme-risk-latest.json` |
| Core DB export | `scripts/exportCoreDatabaseSnapshot.mjs` | Generated source data modules | none | `outputs/core_db/daily/YYYY-MM-DD/*.json`, `outputs/core_db/latest/*.json` |

### 2.4 UI Components

The destination currently has a large `src/App.jsx` plus a few reusable components.

Reusable component files:

| File | Components |
|---|---|
| `src/components/EtfTable.jsx` | `EtfTable`, internal `CrowdingCell`, `RiskFootprintCell` |
| `src/components/MetricTile.jsx` | `MetricTile` |
| `src/components/MiniCharts.jsx` | `Sparkline`, `ProgressRail`, `WeightBars` |

Major `src/App.jsx` components:

| Component | Current Role |
|---|---|
| `App` | SPA state, route tab, query params, selected ETF, search, copy status |
| `Dashboard` | Main command surface |
| `DailyMovements` and movement boards | PCF/daily diff exploration |
| `ThemeRisk` | US/Taiwan theme risk table |
| `EtfDataAuditPanel` | ETF source/data audit |
| `RiskHoldingLeaders`, `CrowdingAlertBoard` | risk holdings and crowding summary |
| `DataQualityRadar`, `RefreshPriorityPanel` | freshness and refresh command surface |
| `Matrix` | ETF sortable matrix |
| `EtfDetail`, `FullHoldingsExplorer` | ETF details and complete holdings |
| `Flow` | consensus fund flow |
| `Attack` | intraday attack overlay |
| `Tsmc` | 25% monitoring radar |
| `Reports`, `UpdateTimeline`, `IssuerStyleMap` | report center and issuer grouping |

### 2.5 Current Scheduling

GitHub Actions:

| File | Trigger | Schedule | Purpose |
|---|---|---|---|
| `.github/workflows/pages.yml` | push to `main`, daily cron, manual | `0 10 * * *` UTC = 18:00 Taipei | `npm run refresh:data`, `npm run build`, deploy GitHub Pages |

launchd:

| File | Schedule | Purpose |
|---|---|---|
| `com.justin.activeetf.refresh.plist` | 18:00 Taipei | Runs `scripts/run_daily_refresh.sh` |
| `scripts/run_daily_refresh.sh` | invoked by launchd | Runs `npm run refresh:data`, logs to `outputs/daily_refresh_logs` |

## 3. Migration Asset List

### 3.1 Core Assets To Keep And Move

| Asset | Source | Destination Proposal | Why |
|---|---|---|---|
| SEC Smart Money pipeline | `us-market-radar/server/smartMoney.js` | `src/features/sec/server/smartMoney.js` or `src/server/sec/smartMoney.js` | Core SEC Hunter data |
| Smart Money tests | `us-market-radar/test/smartMoney.test.mjs` | `test/sec/smartMoney.test.mjs` | Protect parser/sort/freshness logic |
| Form 4 digest | `server/form4Digest.js` | `src/features/sec/server/form4Digest.js` | Useful for alert artifacts and future content cards |
| Yahoo market data | `server/marketData.js` | `src/features/market/server/marketData.js` | Shared quote base for linkage radar and macro |
| Macro risk | `server/macroRisk.js` | `src/features/macro/server/macroRisk.js` | Macro context layer |
| Memory market | `server/memoryMarket.js` | `src/features/memory/server/memoryMarket.js` | DRAM/HBM/NAND monitoring and TrendForce-derived alerting |
| Linkage scoring | `server/scoring.js` | `src/features/linkage/server/scoring.js` | Seed for US/Taiwan linkage radar |
| SEC UI | `SmartMoneyView`, `FundCard`, `InsiderTable`, `SmartAlertList`, `SecBadge`, `SourceBadge` | `src/features/sec/components/*` | Convert to SEC Hunter view |
| Report renderer | `server/reporting.js` | `src/features/reports/server/reporting.js` | Future Threads draft / report generator base |
| Static fallback/export pattern | `export_static_site.mjs`, front-end fetch fallback helpers | `scripts/exportMergedData.mjs`, shared fetch utility | GitHub Pages needs static JSON |
| Event calendar | `server/events.js` | `src/features/events/server/events.js` | Keep only if Justin wants `/events` |

### 3.2 Confirmed Cut / Do Not Migrate

| Asset | Files | Action |
|---|---|---|
| Force publish old site | `scripts/publish_public_site.mjs`, `scripts/publish_site_job.sh`, `scripts/install_publish_site_agents.sh`, `launchd/com.justin.usmarketradar.publishdaily.plist`, `launchd/com.justin.usmarketradar.publishmarket.plist` | Do not migrate |
| Telegram full report job | `scripts/send_telegram_report.mjs`, `launchd/com.justin.usmarketradar.morning.plist` | Do not migrate |
| Trump OGE module | `server/trumpOge.js`, `TrumpOgePanel`, `TrumpTradeGlance`, `TrumpTradeTable` | Do not migrate |
| Old ETF bridge file | `server/etfAlertBridge.js` | Do not migrate as a bridge; target already owns source data |
| Old active ETF image | `public/data/active-etf-scan.png` | Do not migrate |

### 3.3 Needs Decision During Phase 2

| Item | Options |
|---|---|
| Express API in target | A. Keep target static and pre-export all data. B. Add Node server mode for local dev/API. |
| Events route | A. Keep `/events`. B. Fold into dashboard alert center. |
| Form 4 Telegram digest | A. Keep renderer only. B. Also migrate launchd notification after UI is stable. |
| Macro and Memory route split | A. One `/macro` route with memory section. B. Separate `/macro` and `/memory`. |

## 4. Merged Directory Structure Options

### Option A: Flat Structure

```text
active-etf-command/
├── scripts/
│   ├── importEtfUniverse.mjs
│   ├── importDailyMovements.mjs
│   ├── importSecSmartMoney.mjs
│   ├── importMacroRisk.mjs
│   ├── importMemoryMarket.mjs
│   └── exportCoreDatabaseSnapshot.mjs
├── src/
│   ├── components/
│   │   ├── EtfTable.jsx
│   │   ├── SecHunter.jsx
│   │   ├── MacroPanel.jsx
│   │   ├── LinkageRadar.jsx
│   │   └── ThreadsComposer.jsx
│   ├── data/
│   │   ├── etfUniverse.js
│   │   ├── dailyMovements.js
│   │   ├── smartMoney.js
│   │   ├── macroRisk.js
│   │   ├── memoryMarket.js
│   │   └── linkageSignals.js
│   ├── lib/
│   │   ├── analytics.js
│   │   ├── marketData.js
│   │   ├── smartMoney.js
│   │   ├── macroRisk.js
│   │   └── reporting.js
│   ├── App.jsx
│   └── styles.css
└── test/
    ├── smartMoney.test.mjs
    ├── macroRisk.test.mjs
    └── scoring.test.mjs
```

Pros:

- Fastest migration.
- Minimal import-path churn.
- Easier to keep current `App.jsx` route model.
- Lower chance of breaking build during first move.

Cons:

- `src/App.jsx` is already 4,461 lines; flat merge makes it harder to maintain.
- SEC, ETF, macro, and linkage logic remain easy to tangle.
- Shared UI and data utilities will blur together.
- Later Threads composer extraction will require another refactor.

Best if: Justin wants a quick local proof first and accepts a cleanup round later.

### Option B: Feature Folder

```text
active-etf-command/
├── scripts/
│   ├── etf/
│   │   ├── importEtfUniverse.mjs
│   │   ├── importDailyMovements.mjs
│   │   └── importIntradayAttacks.mjs
│   ├── sec/
│   │   ├── importSmartMoney.mjs
│   │   └── renderForm4Digest.mjs
│   ├── macro/
│   │   ├── importMacroRisk.mjs
│   │   └── importMemoryMarket.mjs
│   └── exportCoreDatabaseSnapshot.mjs
├── src/
│   ├── app/
│   │   ├── AppShell.jsx
│   │   └── routes.js
│   ├── features/
│   │   ├── etf/
│   │   │   ├── components/
│   │   │   ├── data/
│   │   │   └── analytics.js
│   │   ├── sec/
│   │   │   ├── components/
│   │   │   ├── data/
│   │   │   └── server/
│   │   ├── macro/
│   │   │   ├── components/
│   │   │   ├── data/
│   │   │   └── server/
│   │   ├── memory/
│   │   │   ├── components/
│   │   │   ├── data/
│   │   │   └── server/
│   │   ├── linkage/
│   │   │   ├── components/
│   │   │   ├── data/
│   │   │   └── scoring.js
│   │   └── reports/
│   │       ├── ThreadsComposer.jsx
│   │       └── reporting.js
│   ├── shared/
│   │   ├── components/
│   │   ├── data/
│   │   ├── formatters.js
│   │   └── design-tokens.css
│   ├── main.jsx
│   └── styles.css
├── test/
│   ├── sec/
│   ├── macro/
│   └── linkage/
└── outputs/
    └── core_db/
```

Pros:

- Better long-term shape for a combined Taiwan/US command center.
- Clear ownership: ETF, SEC, macro, memory, linkage, reports.
- Easier to move `smartMoney.js`, `macroRisk.js`, `memoryMarket.js` with tests.
- Easier to add `/etf`, `/sec`, `/macro`, `/events` without inflating `App.jsx`.
- Shared design tokens and Threads composer get a natural home.

Cons:

- Larger first refactor.
- More import-path churn.
- Needs disciplined commits and build checks after each move.
- Some current scripts assume top-level `src/data/*`, so compatibility shims may be needed during migration.

Best if: this is the durable main workstation. This is my preferred option.

## 5. Risk Points

### 5.1 GitHub Actions Cron Conflict

Current schedules:

- `active-etf-command`: `0 10 * * *` UTC = 18:00 Taipei, refresh ETF data and deploy Pages.
- `us-market-radar`: `20 22 * * *` UTC = 06:20 Taipei, export market snapshot and commit `public/data`.

Risk:

- If SEC/Yahoo/FRED/TrendForce imports are added directly to the target Pages workflow, build time and external request volume increase.
- `active-etf-command` currently deploys Pages artifact, while `us-market-radar` commits generated data. These models should be unified.

Mitigation:

- Keep one Pages workflow in target.
- Put ETF refresh at 18:00 Taipei.
- Add SEC/macro/memory refresh either in the same workflow after ETF refresh or in a separate scheduled data workflow that writes generated data.
- Avoid committing generated data from GitHub Actions until Justin approves the storage model.

### 5.2 API Rate Limit / Source Blocking

Sources involved:

- SEC EDGAR: requires responsible `SEC_USER_AGENT` and request pacing.
- Yahoo chart endpoint: used by both `marketData.js` and target `importThemeRisk.mjs`.
- ETFInfo and issuer PCF pages: already many external requests.
- TrendForce public pages: HTML parsing may be brittle.
- FRED/FiscalData: generally stable, but should be cached.

Risk:

- Combining refreshes could make a single scheduled job too heavy.
- Yahoo and issuer pages may throttle or return changed HTML.
- SEC should not be called concurrently without pacing.

Mitigation:

- Preserve SEC `SEC_MIN_INTERVAL_MS`.
- Cache generated results in `outputs/core_db/latest`.
- Split import jobs by dataset with visible status/failure fields.
- Treat stale source as warning when static build can still complete.

### 5.3 CSS Namespace Conflict

Current state:

- `us-market-radar/src/styles.css`: 2,959 lines.
- `active-etf-command/src/styles.css`: 5,257 lines.
- Both define panel/card/table/metric/shell concepts.

Risk:

- Directly importing old CSS will override target UI.
- Both apps use broad class names like panel, metric, table-ish blocks.

Mitigation:

- Do not copy old CSS wholesale.
- Rebuild SEC/macro/memory components using target classes and shared tokens.
- If old styles are needed temporarily, prefix them under `.sec-feature` / `.macro-feature`.
- Prefer extracting only source badge, alert, dense table, and sparkline patterns.

### 5.4 Data Shape Conflict

Risk:

- Target imports generated JS modules under `src/data/*`.
- Source builds JSON from server-side modules and serves API/static fallback.
- Moving Node server code into a static Vite app requires deciding between pre-generated modules and runtime API.

Mitigation:

- Phase 2 should first create generated `src/data/smartMoney.js`, `src/data/macroRisk.js`, `src/data/memoryMarket.js` or JSON files under `public/data`.
- Keep Node fetchers in scripts/server utilities.
- Keep browser UI read-only from generated data for GitHub Pages compatibility.

### 5.5 Launchd Conflict

Risk:

- Existing `us-market-radar` launchd jobs may keep publishing old site or sending old reports after migration.
- Target already has `com.justin.activeetf.refresh`.

Mitigation:

- Do not install or remove launchd jobs in Phase 2.
- Phase 3 should explicitly disable/replace old labels after merged site passes local and Pages checks.

## 6. Rollback SOP

Preconditions:

- Safety tags exist:
  - `us-market-radar`: `pre-migration-snapshot-20260520`
  - `active-etf-command`: `pre-merge-snapshot-20260520`

Rollback plan for Phase 2:

1. Stop before each major move and commit the completed step.
2. If a step breaks build or data refresh, inspect only that step's diff.
3. Revert the last migration commit with `git revert <commit>` in `active-etf-command`.
4. If multiple steps need rollback, reset only after Justin approval; default is non-destructive `git revert`.
5. Keep `us-market-radar` untouched until Phase 3 archive/redirect.
6. Keep old launchd jobs unchanged until Phase 3.
7. Verify rollback with:
   - `npm run lint`
   - `npm run build`
   - `npm run refresh:data` if the rollback touched data scripts
8. If GitHub Pages deployment fails after merge, keep public traffic on the existing active ETF Pages build and do not redirect old `us-market-radar-site`.

Recommended commit boundaries for Phase 2:

1. `refactor(merge): create merged feature structure`
2. `refactor(merge): migrate SEC pipeline from us-market-radar`
3. `feat(merge): add SEC Hunter view`
4. `refactor(merge): migrate macro and memory pipelines`
5. `feat(merge): add linkage radar`
6. `refactor(merge): consolidate data export and pages workflow`
7. `chore(merge): add migration tests and build verification`

## 7. Phase 1 Conclusion

Decision needed from Justin:

1. Choose directory structure:
   - A: Flat structure
   - B: Feature folder
2. Decide whether `events.js` becomes `/events` or folds into dashboard.
3. Decide whether Form 4 digest stays renderer-only in Phase 2 or includes launchd notification later.
4. Confirm static-only target for GitHub Pages, or allow a local Express mode for live APIs.

Recommended next move after review:

- Pick Option B.
- Migrate generated data first, then UI.
- Keep all old `us-market-radar` publish and Telegram full-report jobs retired from migration.
- Keep `us-market-radar` repo untouched until the target site is verified.

Phase 1 stop condition satisfied. Do not start Phase 2 until Justin reviews this document.
