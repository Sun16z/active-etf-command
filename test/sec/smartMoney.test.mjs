import test from "node:test";
import assert from "node:assert/strict";
import {
  businessDaysBetween,
  calendarDaysBetween,
  compareHoldings,
  compareTransactionsByTime,
  findFilings,
  nextForm13fDeadline,
  parseForm4,
  parseInfoTable,
  scoreTransaction,
} from "../../src/features/sec/server/smartMoney.js";

const infoXml = `
<informationTable>
  <infoTable>
    <nameOfIssuer>NVIDIA CORP</nameOfIssuer>
    <titleOfClass>COM</titleOfClass>
    <cusip>67066G104</cusip>
    <value>2500000</value>
    <shrsOrPrnAmt><sshPrnamt>10000</sshPrnamt><sshPrnamtType>SH</sshPrnamtType></shrsOrPrnAmt>
  </infoTable>
  <infoTable>
    <nameOfIssuer>APPLE INC</nameOfIssuer>
    <titleOfClass>COM</titleOfClass>
    <cusip>037833100</cusip>
    <value>1200000</value>
    <shrsOrPrnAmt><sshPrnamt>5000</sshPrnamt><sshPrnamtType>SH</sshPrnamtType></shrsOrPrnAmt>
  </infoTable>
</informationTable>`;

const form4Xml = `
<ownershipDocument>
  <issuer><issuerName>NVIDIA CORP</issuerName><issuerTradingSymbol>NVDA</issuerTradingSymbol></issuer>
  <reportingOwner>
    <reportingOwnerId><rptOwnerName>DOE JANE</rptOwnerName></reportingOwnerId>
    <reportingOwnerRelationship>
      <isDirector>false</isDirector>
      <isOfficer>true</isOfficer>
      <officerTitle>Chief Technology Officer</officerTitle>
    </reportingOwnerRelationship>
  </reportingOwner>
  <aff10b5One>false</aff10b5One>
  <nonDerivativeTable>
    <nonDerivativeTransaction>
      <securityTitle><value>Common Stock</value></securityTitle>
      <transactionDate><value>2026-05-10</value></transactionDate>
      <transactionCoding><transactionCode>P</transactionCode></transactionCoding>
      <transactionAmounts>
        <transactionShares><value>1000</value></transactionShares>
        <transactionPricePerShare><value>200</value></transactionPricePerShare>
        <transactionAcquiredDisposedCode><value>A</value></transactionAcquiredDisposedCode>
      </transactionAmounts>
      <postTransactionAmounts><sharesOwnedFollowingTransaction><value>9000</value></sharesOwnedFollowingTransaction></postTransactionAmounts>
    </nonDerivativeTransaction>
  </nonDerivativeTable>
</ownershipDocument>`;

test("parseInfoTable extracts 13F holdings and strategic tickers", () => {
  const holdings = parseInfoTable(infoXml);
  assert.equal(holdings.length, 2);
  assert.equal(holdings[0].ticker, "NVDA");
  assert.equal(holdings[0].value, 2_500_000);
});

test("compareHoldings classifies new and increased positions", () => {
  const current = parseInfoTable(infoXml);
  const previous = [{ ...current[0], value: 1_000_000, shares: 4000 }];
  const changes = compareHoldings(current, previous);
  assert.equal(changes.find((row) => row.ticker === "NVDA").status, "INCREASED");
  assert.equal(changes.find((row) => row.ticker === "AAPL").status, "NEW");
});

test("parseForm4 extracts insider purchase with a high score", () => {
  const transactions = parseForm4(
    form4Xml,
    { filingDate: "2026-05-11", accessionNumber: "0000000000-26-000001" },
    { ticker: "NVDA", name: "NVIDIA", cik: "0001045810", theme: "AI GPU" },
  );
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0].code, "P");
  assert.equal(transactions[0].value, 200_000);
  assert.ok(transactions[0].score > 80);
});

test("scoreTransaction discounts 10b5-1 sale", () => {
  const plannedSale = scoreTransaction({ code: "S", value: 2_000_000 }, "Chief Financial Officer", true);
  const purchase = scoreTransaction({ code: "P", value: 2_000_000 }, "Chief Financial Officer", false);
  assert.ok(plannedSale < 50);
  assert.ok(purchase > 80);
});

test("compareTransactionsByTime keeps Form 4 rows in newest filing order", () => {
  const rows = [
    { ticker: "A", filingDate: "2026-05-06", transactionDate: "2026-05-06", accessionNumber: "1", score: 90 },
    { ticker: "B", filingDate: "2026-05-07", transactionDate: "2026-05-07", accessionNumber: "2", score: 20 },
    { ticker: "C", filingDate: "2026-05-06", transactionDate: "2026-05-05", accessionNumber: "3", score: 60 },
  ].sort(compareTransactionsByTime);

  assert.deepEqual(rows.map((row) => row.ticker), ["B", "A", "C"]);
});

test("compareTransactionsByTime uses SEC acceptance time before trade date", () => {
  const rows = [
    { ticker: "TRADE-NEW", acceptanceDateTime: "2026-05-06T20:00:00.000Z", filingDate: "2026-05-06", transactionDate: "2026-05-07", accessionNumber: "1" },
    { ticker: "FILED-NEW", acceptanceDateTime: "2026-05-07T12:00:00.000Z", filingDate: "2026-05-07", transactionDate: "2026-05-06", accessionNumber: "2" },
  ].sort(compareTransactionsByTime);

  assert.deepEqual(rows.map((row) => row.ticker), ["FILED-NEW", "TRADE-NEW"]);
});

test("findFilings picks recent 13D/G filings from SEC submissions", () => {
  const filings = findFilings(
    {
      filings: {
        recent: {
          form: ["8-K", "SC 13D", "SC 13G", "4"],
          accessionNumber: ["1", "2", "3", "4"],
          filingDate: ["2026-05-01", "2026-05-11", "2026-05-10", "2026-05-09"],
          acceptanceDateTime: ["2026-05-01T10:00:00Z", "2026-05-11T10:00:00Z", "2026-05-10T10:00:00Z", "2026-05-09T10:00:00Z"],
          reportDate: ["", "", "", ""],
          primaryDocument: ["a.htm", "b.htm", "c.htm", "d.htm"],
        },
      },
    },
    ["SC 13D", "SC 13G"],
    2,
  );

  assert.deepEqual(filings.map((filing) => filing.form), ["SC 13D", "SC 13G"]);
});

test("findFilings sorts by acceptance time before filing date", () => {
  const filings = findFilings(
    {
      filings: {
        recent: {
          form: ["SC 13G", "SC 13D", "4"],
          accessionNumber: ["1", "2", "3"],
          filingDate: ["2026-05-11", "2026-05-11", "2026-05-10"],
          acceptanceDateTime: ["2026-05-11T09:00:00Z", "2026-05-11T10:00:00Z", "2026-05-10T08:00:00Z"],
          reportDate: ["", "", ""],
          primaryDocument: ["a.htm", "b.htm", "c.htm"],
        },
      },
    },
    ["SC 13D", "SC 13G"],
    2,
  );

  assert.deepEqual(filings.map((filing) => filing.form), ["SC 13D", "SC 13G"]);
});

test("nextForm13fDeadline uses the upcoming quarter-end window", () => {
  const deadline = nextForm13fDeadline(new Date("2026-05-13T00:00:00Z"));
  assert.equal(deadline.quarter, "1Q");
  assert.equal(deadline.reportDate, "2026-03-31");
  assert.equal(deadline.deadline, "2026-05-15");
  assert.equal(deadline.daysUntil, 2);
});

test("calendar and business day helpers stay stable across weekend gaps", () => {
  assert.equal(calendarDaysBetween("2026-05-13", new Date("2026-05-15T00:00:00Z")), 2);
  assert.equal(businessDaysBetween("2026-05-09", new Date("2026-05-13T00:00:00Z")), 3);
});
