# ETF Map Merge Audit

Generated: 2026-05-20

## Decision

Keep `active-etf-command` as the target site. Treat `/Users/justin/etfmap` as a source asset library, not as the new architecture.

Reasons:

- `active-etf-command` already owns the GitHub Pages/Vite/static-data workflow, SEC migration, launchd refresh path, and current ETF command surface.
- `etfmap` is a Next.js app with API routes, `.env`, Prisma-oriented dependencies, and a heavier runtime shape that does not fit the current static GitHub Pages deployment.
- The useful part of `etfmap` is domain knowledge and a few data/UI ideas: rotation chains, leading indicators, TWSE/Yahoo market map logic, and overlap calculations.
- Several `etfmap` screens use mock/static data or card-heavy UI that conflicts with the current dense, source-audited dashboard direction.

## Verification

Commands run against `/Users/justin/etfmap`:

| Command | Result | Notes |
|---|---:|---|
| `npm run build` | PASS | Next.js build completed and generated static/application routes. |
| `npm run lint` | FAIL | 27 errors and 784 warnings observed. Major noise comes from `public/etf-command/assets/index-DVI8kM6G.js`; source errors include hook/set-state lint issues and `any` usage. |

`.env` exists in `/Users/justin/etfmap`; it was not opened or modified.

## Keep And Move

| Source asset | Usefulness | Target shape |
|---|---:|---|
| `knowledge/rotation_chains.yaml` | High | Move to `active-etf-command/knowledge/rotation_chains.yaml`. This becomes the human-maintained sector-rotation playbook. |
| `knowledge/leading_indicators.yaml` | High | Move to `active-etf-command/knowledge/leading_indicators.yaml`. Use as the indicator glossary behind rotation scoring. |
| `src/lib/rotation-engine.ts` | High | Port as `src/features/rotation/server/rotationEngine.js`, using active-site market data and static generated outputs. |
| Rotation UI concept | High | Rebuild as a dense `RotationRadarView` with source freshness, triggered stages, next-stage candidates, and Threads draft snippets. |
| TWSE/Yahoo fetch logic | High | Convert Next API logic into scripts that generate `src/features/*/data/*.js` and `public/data/*.json`. |
| `MarketHeatmap.tsx` concept | Medium/High | Rebuild later as `src/features/map/components/MarketMapView.jsx`; keep it decision-focused, not decorative. |
| ETF overlap calculations | Medium | Reuse logic only, backed by active site's real ETF holdings data. Do not import static ETF profiles as truth. |
| Threads draft helper | Medium | Reuse phrasing logic later inside a shared Threads composer. It must remain human-review only. |

## Reuse Logic Only

| Source asset | Reason |
|---|---|
| `ETFOverlap.tsx` | Useful analytic shape, but data should come from active ETF holdings. |
| `PortfolioHealth.tsx` | Concentration logic may be useful, but the personal holdings surface should stay out of the main dashboard unless explicitly requested. |
| `InstitutionalFlow.tsx` / FinMind helpers | Potential future source, but sponsor/free-tier constraints need fresh validation before promoting to core workflow. |
| `DividendCalendar.tsx` | Lower priority. Useful only if income/配息 workflow becomes part of the daily decision loop. |

## Ignore Or Delete From Merge Scope

| Source asset | Reason |
|---|---|
| `DailyFocus`, `IndexCard`, `NewsCard` | Mock/news-card style; weak fit for the command workflow. |
| `AIAnalysis` / `/api/ai` | Looks like simulated scoring rather than a verified model-backed feature. |
| `CompanyDatabase` | Static/mock feel; source freshness contract is unclear. |
| `ThemesOverview`, `ThemeCard` | Duplicates active site's theme-risk direction and uses card-heavy layout. |
| `IndustryMap`, `IndustryOverview` | Lower-value wrappers unless backed by verified data. |
| `SupplyChainSim` | Interesting future tool, but not first merge slice. |
| `public/etf-command/*` | Embedded old build artifact; causes lint noise and should not be imported. |
| Next.js framework/API route structure | Incompatible with current Vite/GitHub Pages static-first deployment. |

## Recommended Target Structure

```txt
active-etf-command/
├── knowledge/
│   ├── rotation_chains.yaml
│   └── leading_indicators.yaml
├── src/features/rotation/
│   ├── components/RotationRadarView.jsx
│   ├── data/rotationSignals.js
│   └── server/rotationEngine.js
├── src/features/map/
│   ├── components/MarketMapView.jsx
│   ├── data/marketMap.js
│   └── server/twseMap.js
├── src/features/overlap/
│   ├── components/EtfOverlapPanel.jsx
│   └── server/overlap.js
└── scripts/
    ├── rotation/importRotationSignals.mjs
    └── map/importMarketMap.mjs
```

## Migration Order

1. Rotation knowledge and engine.
2. Rotation generated data.
3. Rotation UI skeleton.
4. Market map/TWSE heatmap generated data.
5. ETF overlap integration using active site's real holdings.
6. Shared Threads composer extraction.

## Product Rule

The merge should answer one repeated question:

> Which US/global signal is starting a Taiwan-market rotation, and can it become a Threads topic today?

Any visual element that does not support that decision should stay out of the first merged version.
