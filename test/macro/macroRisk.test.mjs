import test from "node:test";
import assert from "node:assert/strict";
import { macroRiskLabel, parseBerkshireCashText, parseFredCsv } from "../../src/features/macro/server/macroRisk.js";

test("parseFredCsv keeps numeric observations and skips missing values", () => {
  const rows = parseFredCsv("observation_date,BAMLH0A0HYM2\n2026-05-08,2.81\n2026-05-09,.\n2026-05-11,2.79\n");
  assert.deepEqual(rows, [
    { date: "2026-05-08", value: 2.81 },
    { date: "2026-05-11", value: 2.79 },
  ]);
});

test("parseBerkshireCashText extracts cash and Treasury bills in dollars", () => {
  const data = parseBerkshireCashText(`
    Cash and cash equivalents* $ 51,478 $ 47,719
    Short-term investments in U.S. Treasury Bills** 339,261 321,434
  `);
  assert.equal(data.cash, 51_478_000_000);
  assert.equal(data.treasuryBills, 339_261_000_000);
  assert.equal(data.total, 390_739_000_000);
  assert.equal(data.previousTotal, 369_153_000_000);
});

test("macroRiskLabel classifies pressure bands", () => {
  assert.equal(macroRiskLabel(80).label, "高壓力");
  assert.equal(macroRiskLabel(63).label, "警戒");
  assert.equal(macroRiskLabel(45).label, "觀察");
  assert.equal(macroRiskLabel(25).label, "低壓力");
});
