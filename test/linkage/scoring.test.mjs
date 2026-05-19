import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboardModel, directAssetScore, riskLabel, scoreLabel } from "../../src/features/linkage/server/scoring.js";

const sampleAsset = (symbol, group, dayPct, fiveDayPct, twentyDayPct, latest = 100) => ({
  symbol,
  displaySymbol: symbol === "^VIX" ? "VIX" : symbol,
  label: symbol,
  group,
  role: "test",
  latest,
  dayPct,
  fiveDayPct,
  twentyDayPct,
  volumeRatio: 1,
  bars: [],
  freshness: { status: "recent", label: "recent" },
  source: { name: "test", status: "recent" },
});

test("directAssetScore rewards positive multi-window trend", () => {
  const strong = directAssetScore(sampleAsset("QQQ", "broad", 1.2, 3.4, 8.5));
  const weak = directAssetScore(sampleAsset("QQQ", "broad", -1.2, -3.4, -8.5));
  assert.ok(strong > 60);
  assert.ok(weak < 40);
});

test("scoreLabel classifies risk bands", () => {
  assert.equal(scoreLabel(75).label, "強多");
  assert.equal(scoreLabel(50).label, "中性");
  assert.equal(scoreLabel(30).label, "強空");
  assert.equal(riskLabel(74).label, "高風險");
  assert.equal(riskLabel(20).label, "低風險");
});

function dashboardAssets() {
  return [
    sampleAsset("ACWI", "global", 0.4, 1.6, 5),
    sampleAsset("EFA", "global", 0.2, 1, 3),
    sampleAsset("VGK", "global", 0.3, 1.3, 4),
    sampleAsset("EWJ", "global", 0.1, 0.8, 2),
    sampleAsset("MCHI", "global", -0.2, -1, -3),
    sampleAsset("EEM", "global", 0.2, 0.9, 2.5),
    sampleAsset("INDA", "global", 0.3, 1.2, 4),
    sampleAsset("EWT", "global", 0.4, 1.5, 5),
    sampleAsset("SPY", "broad", 0.5, 1, 2),
    sampleAsset("RSP", "risk", 0.1, 0.2, -1),
    sampleAsset("QQQ", "broad", 0.7, 2, 4),
    sampleAsset("DIA", "broad", 0.2, 0.5, 1),
    sampleAsset("IWM", "broad", 0.6, 1.8, 3),
    sampleAsset("^VIX", "risk", -2, -3, -4, 16),
    sampleAsset("VIX3M", "risk", -1, -2, -3, 19),
    sampleAsset("VVIX", "risk", 0, 0, 1, 86),
    sampleAsset("SKEW", "risk", 0, 0, 1, 135),
    sampleAsset("HYG", "risk", 0.1, 0.5, 1),
    sampleAsset("LQD", "risk", 0.05, 0.3, 0.8),
    sampleAsset("GLD", "risk", 0.1, 0.4, 1),
    sampleAsset("TLT", "macro", 0.1, 0.4, 1),
    sampleAsset("UUP", "macro", -0.2, -0.5, -1),
    sampleAsset("SMH", "semi", 1.1, 4, 9),
    sampleAsset("SOXX", "semi", 1.0, 3.8, 8),
    sampleAsset("NVDA", "semi", 1.4, 5, 10),
    sampleAsset("TSM", "semi", 0.9, 3.5, 7),
    sampleAsset("AMD", "semi", 0.6, 2.5, 5),
    sampleAsset("AVGO", "semi", 0.4, 2, 4),
    sampleAsset("ASML", "semi", 0.3, 1.8, 3),
    sampleAsset("ARM", "semi", 0.7, 3, 6),
    sampleAsset("MU", "semi", 1.2, 5, 11),
    sampleAsset("00981A", "taiwan", 0, 0, 0),
    sampleAsset("00991A", "taiwan", 0, 0, 0),
    sampleAsset("2330", "taiwan", 0, 0, 0),
    sampleAsset("2454", "taiwan", 0, 0, 0),
    sampleAsset("8299", "taiwan", 0, 0, 0),
  ];
}

test("dashboard model returns five Taiwan holding impact rows", () => {
  const assets = dashboardAssets();
  const dashboard = buildDashboardModel(
    assets,
    { status: "pass", liveCount: assets.length, totalCount: assets.length, fallbackCount: 0 },
    [],
  );
  assert.equal(dashboard.impacts.length, 5);
  assert.ok(dashboard.pulse.overall.score > 50);
  assert.ok(dashboard.impacts.every((impact) => Number.isFinite(impact.score)));
});

test("dashboard model includes global health and top-risk signals", () => {
  const assets = [
    ...dashboardAssets().filter((asset) => !["^VIX", "VIX3M", "RSP", "IWM"].includes(asset.displaySymbol)),
    sampleAsset("^VIX", "risk", 8, 30, 20, 29),
    sampleAsset("VIX3M", "risk", 2, 5, 4, 21),
    sampleAsset("RSP", "risk", -0.6, -2, -5),
    sampleAsset("IWM", "broad", -0.8, -3, -6),
  ];
  const dashboard = buildDashboardModel(
    assets,
    { status: "pass", liveCount: assets.length, totalCount: assets.length, fallbackCount: 0 },
    [],
  );
  assert.ok(dashboard.globalHealth.rows.length >= 8);
  assert.ok(dashboard.globalHealth.riskSignals.length >= 6);
  assert.equal(dashboard.globalHealth.riskSignals[0].label, "高風險");
  assert.ok(dashboard.warnings.some((warning) => warning.id === "global-top-risk"));
});
