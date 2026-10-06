export const memoryMarketData = {
  "meta": {
    "generatedAt": "2026-10-06T00:30:21.299Z",
    "source": "us-market-radar memoryMarket pipeline",
    "summary": {
      "status": "pass",
      "score": 69.6,
      "label": "記憶體循環偏多",
      "headline": "HBM 是 AI 主線，DRAM / NAND 是供給排擠與資料中心擴張的放大器。",
      "interpretation": "優先看 HBM 供應商、封裝產能與 HBM4 進度；DDR5 與 NAND 價格代表 AI demand 擴散到通用伺服器與儲存鏈。",
      "cycleRiskScore": 34,
      "cycleRiskLabel": "暫無崩盤背離",
      "cycleRiskTone": "up",
      "topCycleAlert": "尚未出現價格/股價崩盤背離",
      "failedSources": 0,
      "proxySymbols": [
        "000660.KS",
        "MU",
        "005930.KS",
        "WDC"
      ],
      "proxyNote": "Yahoo Finance supplier basket proxy; not a DDR/HBM/NAND exchange futures contract"
    }
  },
  "memoryMarket": {
    "generatedAt": "2026-10-06T00:30:15.516Z",
    "summary": {
      "status": "pass",
      "score": 69.6,
      "label": "記憶體循環偏多",
      "headline": "HBM 是 AI 主線，DRAM / NAND 是供給排擠與資料中心擴張的放大器。",
      "interpretation": "優先看 HBM 供應商、封裝產能與 HBM4 進度；DDR5 與 NAND 價格代表 AI demand 擴散到通用伺服器與儲存鏈。",
      "cycleRiskScore": 34,
      "cycleRiskLabel": "暫無崩盤背離",
      "cycleRiskTone": "up",
      "topCycleAlert": "尚未出現價格/股價崩盤背離",
      "failedSources": 0,
      "proxySymbols": [
        "000660.KS",
        "MU",
        "005930.KS",
        "WDC"
      ],
      "proxyNote": "Yahoo Finance supplier basket proxy; not a DDR/HBM/NAND exchange futures contract"
    },
    "stages": [
      {
        "id": "hbm",
        "label": "HBM",
        "rank": 1,
        "score": 79.6,
        "tone": "up",
        "metric": "代理20日 +2.02%",
        "detail": "AI 訓練與推論 decode 的高頻寬核心，供應商往 HBM4 / HBM4e 競爭。",
        "components": [
          "HBM3e",
          "HBM4",
          "CoWoS/TSV",
          "AI GPU/ASIC"
        ],
        "sourceLabel": "TrendForce HBM Market Bulletin",
        "sourceUrl": "https://www.trendforce.com/research/download/RP260513PF3",
        "sourceAsOf": "2026-05-12T16:00:00.000Z"
      },
      {
        "id": "dram",
        "label": "DRAM / DDR5",
        "rank": 2,
        "score": 70.3,
        "tone": "up",
        "metric": "DDR5 現貨 41.167 USD",
        "detail": "HBM 擠壓傳統 DRAM 產能，DDR5 受 AI 推論與通用伺服器拉動。",
        "components": [
          "DDR5",
          "Server RDIMM",
          "DDR4 legacy",
          "PC/手機降規"
        ],
        "sourceLabel": "TrendForce DRAM Spot Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "sourceAsOf": "2026-10-05T10:10:00.000Z"
      },
      {
        "id": "nand",
        "label": "NAND / SSD",
        "rank": 3,
        "score": 59,
        "tone": "neutral",
        "metric": "NAND 合約 30.475 USD",
        "detail": "AI 資料中心帶動 enterprise SSD 與高效儲存，消費端承受成本壓力。",
        "components": [
          "Enterprise SSD",
          "QLC/TLC",
          "eMMC/UFS",
          "Wafer"
        ],
        "sourceLabel": "TrendForce NAND Flash Contract Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/flash/pcc_oem_ssd_contract",
        "sourceAsOf": "2026-08-31T10:00:00.000Z"
      }
    ],
    "priceCards": [
      {
        "id": "dram-ddr5-spot",
        "chain": "DRAM",
        "kind": "現貨報價",
        "label": "DDR5 16Gb 4800/5600",
        "unit": "USD",
        "latest": 41.167,
        "high": 52.5,
        "low": 30,
        "changePct": 1.15,
        "score": 56.6,
        "tone": "neutral",
        "priority": 2,
        "series": [
          {
            "time": "2026-09-06T10:10:00.000Z",
            "value": 40.699
          },
          {
            "time": "2026-09-07T10:10:00.000Z",
            "value": 40.796
          },
          {
            "time": "2026-09-08T10:10:00.000Z",
            "value": 40.884
          },
          {
            "time": "2026-09-09T10:10:00.000Z",
            "value": 40.955
          },
          {
            "time": "2026-09-10T10:10:00.000Z",
            "value": 41.004
          },
          {
            "time": "2026-09-11T10:10:00.000Z",
            "value": 41.026
          },
          {
            "time": "2026-09-12T10:10:00.000Z",
            "value": 41.02
          },
          {
            "time": "2026-09-13T10:10:00.000Z",
            "value": 40.991
          },
          {
            "time": "2026-09-14T10:10:00.000Z",
            "value": 40.941
          },
          {
            "time": "2026-09-15T10:10:00.000Z",
            "value": 40.879
          },
          {
            "time": "2026-09-16T10:10:00.000Z",
            "value": 40.813
          },
          {
            "time": "2026-09-17T10:10:00.000Z",
            "value": 40.753
          },
          {
            "time": "2026-09-18T10:10:00.000Z",
            "value": 40.706
          },
          {
            "time": "2026-09-19T10:10:00.000Z",
            "value": 40.679
          },
          {
            "time": "2026-09-20T10:10:00.000Z",
            "value": 40.678
          },
          {
            "time": "2026-09-21T10:10:00.000Z",
            "value": 40.704
          },
          {
            "time": "2026-09-22T10:10:00.000Z",
            "value": 40.756
          },
          {
            "time": "2026-09-23T10:10:00.000Z",
            "value": 40.831
          },
          {
            "time": "2026-09-24T10:10:00.000Z",
            "value": 40.92
          },
          {
            "time": "2026-09-25T10:10:00.000Z",
            "value": 41.018
          },
          {
            "time": "2026-09-26T10:10:00.000Z",
            "value": 41.114
          },
          {
            "time": "2026-09-27T10:10:00.000Z",
            "value": 41.2
          },
          {
            "time": "2026-09-28T10:10:00.000Z",
            "value": 41.268
          },
          {
            "time": "2026-09-29T10:10:00.000Z",
            "value": 41.313
          },
          {
            "time": "2026-09-30T10:10:00.000Z",
            "value": 41.331
          },
          {
            "time": "2026-10-01T10:10:00.000Z",
            "value": 41.322
          },
          {
            "time": "2026-10-02T10:10:00.000Z",
            "value": 41.288
          },
          {
            "time": "2026-10-03T10:10:00.000Z",
            "value": 41.237
          },
          {
            "time": "2026-10-04T10:10:00.000Z",
            "value": 41.173
          },
          {
            "time": "2026-10-05T10:10:00.000Z",
            "value": 41.108
          }
        ],
        "historyStatus": "latest-plus-change",
        "sourceLabel": "TrendForce DRAM Spot Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "sourceAsOf": "2026-10-05T10:10:00.000Z",
        "checkedAt": "2026-10-06T00:30:15.516Z"
      },
      {
        "id": "dram-ddr5-contract",
        "chain": "DRAM",
        "kind": "合約價",
        "label": "DDR5 8GB SO-DIMM",
        "unit": "USD",
        "latest": 133,
        "high": 141,
        "low": 118,
        "changePct": 2.31,
        "score": 58.2,
        "tone": "neutral",
        "priority": 3,
        "series": [
          {
            "time": "2026-08-02T06:00:00.000Z",
            "value": 129.997
          },
          {
            "time": "2026-08-03T06:00:00.000Z",
            "value": 130.362
          },
          {
            "time": "2026-08-04T06:00:00.000Z",
            "value": 130.698
          },
          {
            "time": "2026-08-05T06:00:00.000Z",
            "value": 130.979
          },
          {
            "time": "2026-08-06T06:00:00.000Z",
            "value": 131.187
          },
          {
            "time": "2026-08-07T06:00:00.000Z",
            "value": 131.309
          },
          {
            "time": "2026-08-08T06:00:00.000Z",
            "value": 131.344
          },
          {
            "time": "2026-08-09T06:00:00.000Z",
            "value": 131.299
          },
          {
            "time": "2026-08-10T06:00:00.000Z",
            "value": 131.19
          },
          {
            "time": "2026-08-11T06:00:00.000Z",
            "value": 131.042
          },
          {
            "time": "2026-08-12T06:00:00.000Z",
            "value": 130.88
          },
          {
            "time": "2026-08-13T06:00:00.000Z",
            "value": 130.736
          },
          {
            "time": "2026-08-14T06:00:00.000Z",
            "value": 130.636
          },
          {
            "time": "2026-08-15T06:00:00.000Z",
            "value": 130.602
          },
          {
            "time": "2026-08-16T06:00:00.000Z",
            "value": 130.65
          },
          {
            "time": "2026-08-17T06:00:00.000Z",
            "value": 130.785
          },
          {
            "time": "2026-08-18T06:00:00.000Z",
            "value": 131.005
          },
          {
            "time": "2026-08-19T06:00:00.000Z",
            "value": 131.296
          },
          {
            "time": "2026-08-20T06:00:00.000Z",
            "value": 131.638
          },
          {
            "time": "2026-08-21T06:00:00.000Z",
            "value": 132.005
          },
          {
            "time": "2026-08-22T06:00:00.000Z",
            "value": 132.367
          },
          {
            "time": "2026-08-23T06:00:00.000Z",
            "value": 132.696
          },
          {
            "time": "2026-08-24T06:00:00.000Z",
            "value": 132.967
          },
          {
            "time": "2026-08-25T06:00:00.000Z",
            "value": 133.163
          },
          {
            "time": "2026-08-26T06:00:00.000Z",
            "value": 133.272
          },
          {
            "time": "2026-08-27T06:00:00.000Z",
            "value": 133.294
          },
          {
            "time": "2026-08-28T06:00:00.000Z",
            "value": 133.238
          },
          {
            "time": "2026-08-29T06:00:00.000Z",
            "value": 133.122
          },
          {
            "time": "2026-08-30T06:00:00.000Z",
            "value": 132.969
          },
          {
            "time": "2026-08-31T06:00:00.000Z",
            "value": 132.809
          }
        ],
        "historyStatus": "latest-plus-change",
        "sourceLabel": "TrendForce DRAM Contract Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "sourceAsOf": "2026-08-31T06:00:00.000Z",
        "checkedAt": "2026-10-06T00:30:15.516Z"
      },
      {
        "id": "dram-ddr4-spot",
        "chain": "DRAM",
        "kind": "現貨報價",
        "label": "DDR4 16Gb 3200",
        "unit": "USD",
        "latest": 58.238,
        "high": 70,
        "low": 33,
        "changePct": 0,
        "score": 55,
        "tone": "neutral",
        "priority": 4,
        "series": [
          {
            "time": "2026-09-06T10:10:00.000Z",
            "value": 58.238
          },
          {
            "time": "2026-09-07T10:10:00.000Z",
            "value": 58.352
          },
          {
            "time": "2026-09-08T10:10:00.000Z",
            "value": 58.454
          },
          {
            "time": "2026-09-09T10:10:00.000Z",
            "value": 58.532
          },
          {
            "time": "2026-09-10T10:10:00.000Z",
            "value": 58.578
          },
          {
            "time": "2026-09-11T10:10:00.000Z",
            "value": 58.586
          },
          {
            "time": "2026-09-12T10:10:00.000Z",
            "value": 58.556
          },
          {
            "time": "2026-09-13T10:10:00.000Z",
            "value": 58.491
          },
          {
            "time": "2026-09-14T10:10:00.000Z",
            "value": 58.398
          },
          {
            "time": "2026-09-15T10:10:00.000Z",
            "value": 58.287
          },
          {
            "time": "2026-09-16T10:10:00.000Z",
            "value": 58.171
          },
          {
            "time": "2026-09-17T10:10:00.000Z",
            "value": 58.063
          },
          {
            "time": "2026-09-18T10:10:00.000Z",
            "value": 57.974
          },
          {
            "time": "2026-09-19T10:10:00.000Z",
            "value": 57.913
          },
          {
            "time": "2026-09-20T10:10:00.000Z",
            "value": 57.889
          },
          {
            "time": "2026-09-21T10:10:00.000Z",
            "value": 57.903
          },
          {
            "time": "2026-09-22T10:10:00.000Z",
            "value": 57.954
          },
          {
            "time": "2026-09-23T10:10:00.000Z",
            "value": 58.036
          },
          {
            "time": "2026-09-24T10:10:00.000Z",
            "value": 58.14
          },
          {
            "time": "2026-09-25T10:10:00.000Z",
            "value": 58.256
          },
          {
            "time": "2026-09-26T10:10:00.000Z",
            "value": 58.369
          },
          {
            "time": "2026-09-27T10:10:00.000Z",
            "value": 58.468
          },
          {
            "time": "2026-09-28T10:10:00.000Z",
            "value": 58.541
          },
          {
            "time": "2026-09-29T10:10:00.000Z",
            "value": 58.581
          },
          {
            "time": "2026-09-30T10:10:00.000Z",
            "value": 58.584
          },
          {
            "time": "2026-10-01T10:10:00.000Z",
            "value": 58.548
          },
          {
            "time": "2026-10-02T10:10:00.000Z",
            "value": 58.478
          },
          {
            "time": "2026-10-03T10:10:00.000Z",
            "value": 58.382
          },
          {
            "time": "2026-10-04T10:10:00.000Z",
            "value": 58.27
          },
          {
            "time": "2026-10-05T10:10:00.000Z",
            "value": 58.154
          }
        ],
        "historyStatus": "latest-plus-change",
        "sourceLabel": "TrendForce DRAM Spot Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "sourceAsOf": "2026-10-05T10:10:00.000Z",
        "checkedAt": "2026-10-06T00:30:15.516Z"
      },
      {
        "id": "dram-ddr4-contract",
        "chain": "DRAM",
        "kind": "合約價",
        "label": "DDR4 16GB SO-DIMM",
        "unit": "USD",
        "latest": 270,
        "high": 290,
        "low": 245,
        "changePct": 1.89,
        "score": 57.6,
        "tone": "neutral",
        "priority": 5,
        "series": [
          {
            "time": "2026-08-02T06:00:00.000Z",
            "value": 264.992
          },
          {
            "time": "2026-08-03T06:00:00.000Z",
            "value": 265.694
          },
          {
            "time": "2026-08-04T06:00:00.000Z",
            "value": 266.339
          },
          {
            "time": "2026-08-05T06:00:00.000Z",
            "value": 266.873
          },
          {
            "time": "2026-08-06T06:00:00.000Z",
            "value": 267.257
          },
          {
            "time": "2026-08-07T06:00:00.000Z",
            "value": 267.468
          },
          {
            "time": "2026-08-08T06:00:00.000Z",
            "value": 267.501
          },
          {
            "time": "2026-08-09T06:00:00.000Z",
            "value": 267.372
          },
          {
            "time": "2026-08-10T06:00:00.000Z",
            "value": 267.114
          },
          {
            "time": "2026-08-11T06:00:00.000Z",
            "value": 266.775
          },
          {
            "time": "2026-08-12T06:00:00.000Z",
            "value": 266.41
          },
          {
            "time": "2026-08-13T06:00:00.000Z",
            "value": 266.079
          },
          {
            "time": "2026-08-14T06:00:00.000Z",
            "value": 265.838
          },
          {
            "time": "2026-08-15T06:00:00.000Z",
            "value": 265.732
          },
          {
            "time": "2026-08-16T06:00:00.000Z",
            "value": 265.791
          },
          {
            "time": "2026-08-17T06:00:00.000Z",
            "value": 266.029
          },
          {
            "time": "2026-08-18T06:00:00.000Z",
            "value": 266.437
          },
          {
            "time": "2026-08-19T06:00:00.000Z",
            "value": 266.991
          },
          {
            "time": "2026-08-20T06:00:00.000Z",
            "value": 267.648
          },
          {
            "time": "2026-08-21T06:00:00.000Z",
            "value": 268.354
          },
          {
            "time": "2026-08-22T06:00:00.000Z",
            "value": 269.052
          },
          {
            "time": "2026-08-23T06:00:00.000Z",
            "value": 269.683
          },
          {
            "time": "2026-08-24T06:00:00.000Z",
            "value": 270.196
          },
          {
            "time": "2026-08-25T06:00:00.000Z",
            "value": 270.555
          },
          {
            "time": "2026-08-26T06:00:00.000Z",
            "value": 270.739
          },
          {
            "time": "2026-08-27T06:00:00.000Z",
            "value": 270.747
          },
          {
            "time": "2026-08-28T06:00:00.000Z",
            "value": 270.596
          },
          {
            "time": "2026-08-29T06:00:00.000Z",
            "value": 270.322
          },
          {
            "time": "2026-08-30T06:00:00.000Z",
            "value": 269.975
          },
          {
            "time": "2026-08-31T06:00:00.000Z",
            "value": 269.612
          }
        ],
        "historyStatus": "latest-plus-change",
        "sourceLabel": "TrendForce DRAM Contract Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "sourceAsOf": "2026-08-31T06:00:00.000Z",
        "checkedAt": "2026-10-06T00:30:15.516Z"
      },
      {
        "id": "nand-contract",
        "chain": "NAND",
        "kind": "合約價",
        "label": "NAND 128Gb 16Gx8 MLC",
        "unit": "USD",
        "latest": 30.475,
        "high": 30.6,
        "low": 30.25,
        "changePct": 1.42,
        "score": 57,
        "tone": "neutral",
        "priority": 6,
        "series": [
          {
            "time": "2026-08-02T10:00:00.000Z",
            "value": 30.048
          },
          {
            "time": "2026-08-03T10:00:00.000Z",
            "value": 30.123
          },
          {
            "time": "2026-08-04T10:00:00.000Z",
            "value": 30.191
          },
          {
            "time": "2026-08-05T10:00:00.000Z",
            "value": 30.246
          },
          {
            "time": "2026-08-06T10:00:00.000Z",
            "value": 30.285
          },
          {
            "time": "2026-08-07T10:00:00.000Z",
            "value": 30.304
          },
          {
            "time": "2026-08-08T10:00:00.000Z",
            "value": 30.303
          },
          {
            "time": "2026-08-09T10:00:00.000Z",
            "value": 30.284
          },
          {
            "time": "2026-08-10T10:00:00.000Z",
            "value": 30.25
          },
          {
            "time": "2026-08-11T10:00:00.000Z",
            "value": 30.207
          },
          {
            "time": "2026-08-12T10:00:00.000Z",
            "value": 30.161
          },
          {
            "time": "2026-08-13T10:00:00.000Z",
            "value": 30.119
          },
          {
            "time": "2026-08-14T10:00:00.000Z",
            "value": 30.086
          },
          {
            "time": "2026-08-15T10:00:00.000Z",
            "value": 30.07
          },
          {
            "time": "2026-08-16T10:00:00.000Z",
            "value": 30.072
          },
          {
            "time": "2026-08-17T10:00:00.000Z",
            "value": 30.094
          },
          {
            "time": "2026-08-18T10:00:00.000Z",
            "value": 30.135
          },
          {
            "time": "2026-08-19T10:00:00.000Z",
            "value": 30.193
          },
          {
            "time": "2026-08-20T10:00:00.000Z",
            "value": 30.262
          },
          {
            "time": "2026-08-21T10:00:00.000Z",
            "value": 30.337
          },
          {
            "time": "2026-08-22T10:00:00.000Z",
            "value": 30.411
          },
          {
            "time": "2026-08-23T10:00:00.000Z",
            "value": 30.477
          },
          {
            "time": "2026-08-24T10:00:00.000Z",
            "value": 30.531
          },
          {
            "time": "2026-08-25T10:00:00.000Z",
            "value": 30.566
          },
          {
            "time": "2026-08-26T10:00:00.000Z",
            "value": 30.582
          },
          {
            "time": "2026-08-27T10:00:00.000Z",
            "value": 30.578
          },
          {
            "time": "2026-08-28T10:00:00.000Z",
            "value": 30.557
          },
          {
            "time": "2026-08-29T10:00:00.000Z",
            "value": 30.521
          },
          {
            "time": "2026-08-30T10:00:00.000Z",
            "value": 30.477
          },
          {
            "time": "2026-08-31T10:00:00.000Z",
            "value": 30.431
          }
        ],
        "historyStatus": "latest-plus-change",
        "sourceLabel": "TrendForce NAND Flash Contract Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/flash/pcc_oem_ssd_contract",
        "sourceAsOf": "2026-08-31T10:00:00.000Z",
        "checkedAt": "2026-10-06T00:30:15.516Z"
      }
    ],
    "chartSeries": [
      {
        "id": "hbm-proxy",
        "label": "HBM 供應商代理指數",
        "chain": "HBM",
        "kind": "市場代理",
        "color": "#2357b6",
        "points": [
          {
            "time": "2026-07-08T20:00:00.000Z",
            "value": 91.48
          },
          {
            "time": "2026-07-09T20:00:00.000Z",
            "value": 95.17
          },
          {
            "time": "2026-07-10T20:00:00.000Z",
            "value": 95.19
          },
          {
            "time": "2026-07-13T20:00:00.000Z",
            "value": 86
          },
          {
            "time": "2026-07-14T20:00:00.000Z",
            "value": 89.27
          },
          {
            "time": "2026-07-15T20:00:00.000Z",
            "value": 89.63
          },
          {
            "time": "2026-07-16T20:00:00.000Z",
            "value": 81.72
          },
          {
            "time": "2026-07-17T20:00:00.000Z",
            "value": 85.36
          },
          {
            "time": "2026-07-20T20:00:00.000Z",
            "value": 80.52
          },
          {
            "time": "2026-07-21T20:00:00.000Z",
            "value": 87.11
          },
          {
            "time": "2026-07-22T20:00:00.000Z",
            "value": 86.88
          },
          {
            "time": "2026-07-23T20:00:00.000Z",
            "value": 89.95
          },
          {
            "time": "2026-07-24T20:00:00.000Z",
            "value": 83.15
          },
          {
            "time": "2026-07-27T20:00:00.000Z",
            "value": 83.3
          },
          {
            "time": "2026-07-28T20:00:00.000Z",
            "value": 73.66
          },
          {
            "time": "2026-07-29T20:00:00.000Z",
            "value": 67.85
          },
          {
            "time": "2026-07-30T20:00:00.000Z",
            "value": 72.11
          },
          {
            "time": "2026-07-31T20:00:00.000Z",
            "value": 80.55
          },
          {
            "time": "2026-08-03T20:00:00.000Z",
            "value": 76.56
          },
          {
            "time": "2026-08-04T20:00:00.000Z",
            "value": 79.18
          },
          {
            "time": "2026-08-05T20:00:00.000Z",
            "value": 80.54
          },
          {
            "time": "2026-08-06T20:00:00.000Z",
            "value": 75.21
          },
          {
            "time": "2026-08-07T20:00:00.000Z",
            "value": 73.63
          },
          {
            "time": "2026-08-10T20:00:00.000Z",
            "value": 73.07
          },
          {
            "time": "2026-08-11T20:00:00.000Z",
            "value": 73.98
          },
          {
            "time": "2026-08-12T20:00:00.000Z",
            "value": 77.94
          },
          {
            "time": "2026-08-13T20:00:00.000Z",
            "value": 82
          },
          {
            "time": "2026-08-14T20:00:00.000Z",
            "value": 84.33
          },
          {
            "time": "2026-08-17T20:00:00.000Z",
            "value": 100.38
          },
          {
            "time": "2026-08-18T20:00:00.000Z",
            "value": 83
          },
          {
            "time": "2026-08-19T20:00:00.000Z",
            "value": 78.35
          },
          {
            "time": "2026-08-20T20:00:00.000Z",
            "value": 84.25
          },
          {
            "time": "2026-08-21T20:00:00.000Z",
            "value": 85.14
          },
          {
            "time": "2026-08-24T20:00:00.000Z",
            "value": 80.39
          },
          {
            "time": "2026-08-25T20:00:00.000Z",
            "value": 81.5
          },
          {
            "time": "2026-08-26T20:00:00.000Z",
            "value": 82.43
          },
          {
            "time": "2026-08-27T20:00:00.000Z",
            "value": 83.19
          },
          {
            "time": "2026-08-28T20:00:00.000Z",
            "value": 81.24
          },
          {
            "time": "2026-08-31T20:00:00.000Z",
            "value": 82.46
          },
          {
            "time": "2026-09-01T20:00:00.000Z",
            "value": 82.01
          },
          {
            "time": "2026-09-02T20:00:00.000Z",
            "value": 80.76
          },
          {
            "time": "2026-09-03T20:00:00.000Z",
            "value": 80.39
          },
          {
            "time": "2026-09-04T20:00:00.000Z",
            "value": 83.91
          },
          {
            "time": "2026-09-07T20:00:00.000Z",
            "value": 79.14
          },
          {
            "time": "2026-09-08T20:00:00.000Z",
            "value": 86.8
          },
          {
            "time": "2026-09-09T20:00:00.000Z",
            "value": 88.8
          },
          {
            "time": "2026-09-10T20:00:00.000Z",
            "value": 86.71
          },
          {
            "time": "2026-09-11T20:00:00.000Z",
            "value": 85.15
          },
          {
            "time": "2026-09-14T20:00:00.000Z",
            "value": 80.6
          },
          {
            "time": "2026-09-15T20:00:00.000Z",
            "value": 80.32
          },
          {
            "time": "2026-09-16T20:00:00.000Z",
            "value": 81.8
          },
          {
            "time": "2026-09-17T20:00:00.000Z",
            "value": 83.29
          },
          {
            "time": "2026-09-18T20:00:00.000Z",
            "value": 87.19
          },
          {
            "time": "2026-09-21T20:00:00.000Z",
            "value": 89.21
          },
          {
            "time": "2026-09-22T20:00:00.000Z",
            "value": 90.9
          },
          {
            "time": "2026-09-23T20:00:00.000Z",
            "value": 91.19
          },
          {
            "time": "2026-09-24T20:00:00.000Z",
            "value": 102.17
          },
          {
            "time": "2026-09-25T20:00:00.000Z",
            "value": 102.57
          },
          {
            "time": "2026-09-28T20:00:00.000Z",
            "value": 87.76
          },
          {
            "time": "2026-09-29T20:00:00.000Z",
            "value": 88.23
          },
          {
            "time": "2026-09-30T20:00:00.000Z",
            "value": 88.17
          },
          {
            "time": "2026-10-01T20:00:00.000Z",
            "value": 90.76
          },
          {
            "time": "2026-10-02T20:00:00.000Z",
            "value": 89.33
          },
          {
            "time": "2026-10-06T20:00:00.000Z",
            "value": 80.74
          }
        ],
        "sourceLabel": "Yahoo Finance supplier basket",
        "sourceUrl": "https://finance.yahoo.com/",
        "historyStatus": "real-market-proxy"
      },
      {
        "id": "dram-contract-index",
        "label": "DRAM / DDR5 合約報價指數",
        "chain": "DRAM",
        "kind": "合約與現貨",
        "color": "#107c5c",
        "points": [
          {
            "time": "2026-09-06T10:10:00.000Z",
            "value": 100,
            "rawValue": 40.699
          },
          {
            "time": "2026-09-07T10:10:00.000Z",
            "value": 100.24,
            "rawValue": 40.796
          },
          {
            "time": "2026-09-08T10:10:00.000Z",
            "value": 100.45,
            "rawValue": 40.884
          },
          {
            "time": "2026-09-09T10:10:00.000Z",
            "value": 100.63,
            "rawValue": 40.955
          },
          {
            "time": "2026-09-10T10:10:00.000Z",
            "value": 100.75,
            "rawValue": 41.004
          },
          {
            "time": "2026-09-11T10:10:00.000Z",
            "value": 100.8,
            "rawValue": 41.026
          },
          {
            "time": "2026-09-12T10:10:00.000Z",
            "value": 100.79,
            "rawValue": 41.02
          },
          {
            "time": "2026-09-13T10:10:00.000Z",
            "value": 100.72,
            "rawValue": 40.991
          },
          {
            "time": "2026-09-14T10:10:00.000Z",
            "value": 100.59,
            "rawValue": 40.941
          },
          {
            "time": "2026-09-15T10:10:00.000Z",
            "value": 100.44,
            "rawValue": 40.879
          },
          {
            "time": "2026-09-16T10:10:00.000Z",
            "value": 100.28,
            "rawValue": 40.813
          },
          {
            "time": "2026-09-17T10:10:00.000Z",
            "value": 100.13,
            "rawValue": 40.753
          },
          {
            "time": "2026-09-18T10:10:00.000Z",
            "value": 100.02,
            "rawValue": 40.706
          },
          {
            "time": "2026-09-19T10:10:00.000Z",
            "value": 99.95,
            "rawValue": 40.679
          },
          {
            "time": "2026-09-20T10:10:00.000Z",
            "value": 99.95,
            "rawValue": 40.678
          },
          {
            "time": "2026-09-21T10:10:00.000Z",
            "value": 100.01,
            "rawValue": 40.704
          },
          {
            "time": "2026-09-22T10:10:00.000Z",
            "value": 100.14,
            "rawValue": 40.756
          },
          {
            "time": "2026-09-23T10:10:00.000Z",
            "value": 100.32,
            "rawValue": 40.831
          },
          {
            "time": "2026-09-24T10:10:00.000Z",
            "value": 100.54,
            "rawValue": 40.92
          },
          {
            "time": "2026-09-25T10:10:00.000Z",
            "value": 100.78,
            "rawValue": 41.018
          },
          {
            "time": "2026-09-26T10:10:00.000Z",
            "value": 101.02,
            "rawValue": 41.114
          },
          {
            "time": "2026-09-27T10:10:00.000Z",
            "value": 101.23,
            "rawValue": 41.2
          },
          {
            "time": "2026-09-28T10:10:00.000Z",
            "value": 101.4,
            "rawValue": 41.268
          },
          {
            "time": "2026-09-29T10:10:00.000Z",
            "value": 101.51,
            "rawValue": 41.313
          },
          {
            "time": "2026-09-30T10:10:00.000Z",
            "value": 101.55,
            "rawValue": 41.331
          },
          {
            "time": "2026-10-01T10:10:00.000Z",
            "value": 101.53,
            "rawValue": 41.322
          },
          {
            "time": "2026-10-02T10:10:00.000Z",
            "value": 101.45,
            "rawValue": 41.288
          },
          {
            "time": "2026-10-03T10:10:00.000Z",
            "value": 101.32,
            "rawValue": 41.237
          },
          {
            "time": "2026-10-04T10:10:00.000Z",
            "value": 101.16,
            "rawValue": 41.173
          },
          {
            "time": "2026-10-05T10:10:00.000Z",
            "value": 101,
            "rawValue": 41.108
          }
        ],
        "sourceLabel": "TrendForce DRAM Spot Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "historyStatus": "latest-plus-change"
      },
      {
        "id": "nand-contract-index",
        "label": "NAND 合約報價指數",
        "chain": "NAND",
        "kind": "合約價",
        "color": "#a86812",
        "points": [
          {
            "time": "2026-08-02T10:00:00.000Z",
            "value": 100,
            "rawValue": 30.048
          },
          {
            "time": "2026-08-03T10:00:00.000Z",
            "value": 100.25,
            "rawValue": 30.123
          },
          {
            "time": "2026-08-04T10:00:00.000Z",
            "value": 100.48,
            "rawValue": 30.191
          },
          {
            "time": "2026-08-05T10:00:00.000Z",
            "value": 100.66,
            "rawValue": 30.246
          },
          {
            "time": "2026-08-06T10:00:00.000Z",
            "value": 100.79,
            "rawValue": 30.285
          },
          {
            "time": "2026-08-07T10:00:00.000Z",
            "value": 100.85,
            "rawValue": 30.304
          },
          {
            "time": "2026-08-08T10:00:00.000Z",
            "value": 100.85,
            "rawValue": 30.303
          },
          {
            "time": "2026-08-09T10:00:00.000Z",
            "value": 100.79,
            "rawValue": 30.284
          },
          {
            "time": "2026-08-10T10:00:00.000Z",
            "value": 100.67,
            "rawValue": 30.25
          },
          {
            "time": "2026-08-11T10:00:00.000Z",
            "value": 100.53,
            "rawValue": 30.207
          },
          {
            "time": "2026-08-12T10:00:00.000Z",
            "value": 100.38,
            "rawValue": 30.161
          },
          {
            "time": "2026-08-13T10:00:00.000Z",
            "value": 100.24,
            "rawValue": 30.119
          },
          {
            "time": "2026-08-14T10:00:00.000Z",
            "value": 100.13,
            "rawValue": 30.086
          },
          {
            "time": "2026-08-15T10:00:00.000Z",
            "value": 100.07,
            "rawValue": 30.07
          },
          {
            "time": "2026-08-16T10:00:00.000Z",
            "value": 100.08,
            "rawValue": 30.072
          },
          {
            "time": "2026-08-17T10:00:00.000Z",
            "value": 100.15,
            "rawValue": 30.094
          },
          {
            "time": "2026-08-18T10:00:00.000Z",
            "value": 100.29,
            "rawValue": 30.135
          },
          {
            "time": "2026-08-19T10:00:00.000Z",
            "value": 100.48,
            "rawValue": 30.193
          },
          {
            "time": "2026-08-20T10:00:00.000Z",
            "value": 100.71,
            "rawValue": 30.262
          },
          {
            "time": "2026-08-21T10:00:00.000Z",
            "value": 100.96,
            "rawValue": 30.337
          },
          {
            "time": "2026-08-22T10:00:00.000Z",
            "value": 101.21,
            "rawValue": 30.411
          },
          {
            "time": "2026-08-23T10:00:00.000Z",
            "value": 101.43,
            "rawValue": 30.477
          },
          {
            "time": "2026-08-24T10:00:00.000Z",
            "value": 101.61,
            "rawValue": 30.531
          },
          {
            "time": "2026-08-25T10:00:00.000Z",
            "value": 101.72,
            "rawValue": 30.566
          },
          {
            "time": "2026-08-26T10:00:00.000Z",
            "value": 101.78,
            "rawValue": 30.582
          },
          {
            "time": "2026-08-27T10:00:00.000Z",
            "value": 101.76,
            "rawValue": 30.578
          },
          {
            "time": "2026-08-28T10:00:00.000Z",
            "value": 101.69,
            "rawValue": 30.557
          },
          {
            "time": "2026-08-29T10:00:00.000Z",
            "value": 101.57,
            "rawValue": 30.521
          },
          {
            "time": "2026-08-30T10:00:00.000Z",
            "value": 101.43,
            "rawValue": 30.477
          },
          {
            "time": "2026-08-31T10:00:00.000Z",
            "value": 101.27,
            "rawValue": 30.431
          }
        ],
        "sourceLabel": "TrendForce NAND Flash Contract Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/flash/pcc_oem_ssd_contract",
        "historyStatus": "latest-plus-change"
      }
    ],
    "cycleAlerts": [
      {
        "id": "cycle-stable",
        "title": "尚未出現價格/股價崩盤背離",
        "body": "目前公開價格與供應商代理沒有同時觸發轉弱條件；仍需持續看 TrendForce 更新、HBM 供應商指引與代理股價斜率。",
        "score": 34,
        "severity": "low",
        "tone": "up",
        "metric": "價 0.86% / 股 2.02%",
        "meaning": "沒有頂部確認警訊。",
        "sourceLabel": "TrendForce + Yahoo Finance",
        "sourceUrl": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "asOf": "2026-10-06T20:00:00.000Z"
      }
    ],
    "sources": [
      {
        "id": "trendforce-hbm-bulletin",
        "label": "TrendForce HBM Market Bulletin",
        "url": "https://www.trendforce.com/research/download/RP260513PF3",
        "status": "pass",
        "checkedAt": "2026-10-06T00:30:15.516Z",
        "sourceAsOf": "2026-05-12T16:00:00.000Z",
        "note": "Monthly HBM bulletin; public page shows highlights, full PDF requires purchase or membership"
      },
      {
        "id": "trendforce-dram-spot",
        "label": "TrendForce DRAM Spot Price",
        "url": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "status": "pass",
        "checkedAt": "2026-10-06T00:30:15.516Z",
        "sourceAsOf": "2026-10-05T10:10:00.000Z",
        "note": "TrendForce public price table"
      },
      {
        "id": "trendforce-dram-contract",
        "label": "TrendForce DRAM Contract Price",
        "url": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "status": "pass",
        "checkedAt": "2026-10-06T00:30:15.516Z",
        "sourceAsOf": "2026-08-31T06:00:00.000Z",
        "note": "TrendForce public price table"
      },
      {
        "id": "trendforce-nand-contract",
        "label": "TrendForce NAND Flash Contract Price",
        "url": "https://www.trendforce.com.tw/price/flash/pcc_oem_ssd_contract",
        "status": "pass",
        "checkedAt": "2026-10-06T00:30:15.516Z",
        "sourceAsOf": "2026-08-31T10:00:00.000Z",
        "note": "TrendForce public price table"
      },
      {
        "id": "trendforce-memory-wall",
        "label": "TrendForce Memory Wall Insight",
        "url": "https://www.trendforce.com.tw/insights/memory-wall",
        "status": "pass",
        "checkedAt": "2026-10-06T00:30:15.516Z",
        "sourceAsOf": "2026-01-15T16:00:00.000Z",
        "note": "HBM / DDR5 / AI inference chain thesis"
      },
      {
        "id": "trendforce-2q26-price-forecast",
        "label": "TrendForce 2Q26 Memory Price Forecast",
        "url": "https://www.trendforce.com/presscenter/news/20260331-12995.html",
        "status": "pass",
        "checkedAt": "2026-10-06T00:30:15.516Z",
        "sourceAsOf": "2026-03-30T16:00:00.000Z",
        "note": "DRAM 58-63% QoQ; NAND 70-75% QoQ forecast context"
      }
    ],
    "caveats": [
      "TrendForce 公開頁提供最新價、漲跌幅與部分走勢入口；完整歷史圖與報告細項需要登入、會員或付費權限。",
      "資料不足，無法確認有可公開自動抓取的 DDR / NAND / HBM 標準交易所期貨；本頁的期貨欄位以市場代理指數標示。",
      "HBM 沒有公開逐日合約價表，需用 TrendForce bulletin、供應商股價代理、AI GPU/ASIC 出貨與封裝產能交叉確認。"
    ]
  }
};
