export const memoryMarketData = {
  "meta": {
    "generatedAt": "2026-10-30T23:07:46.454Z",
    "source": "us-market-radar memoryMarket pipeline",
    "summary": {
      "status": "pass",
      "score": 63.6,
      "label": "記憶體循環偏多",
      "headline": "HBM 是 AI 主線，DRAM / NAND 是供給排擠與資料中心擴張的放大器。",
      "interpretation": "優先看 HBM 供應商、封裝產能與 HBM4 進度；DDR5 與 NAND 價格代表 AI demand 擴散到通用伺服器與儲存鏈。",
      "cycleRiskScore": 99.5,
      "cycleRiskLabel": "高檔反轉警示",
      "cycleRiskTone": "down",
      "topCycleAlert": "供應商股價代理先轉弱",
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
    "generatedAt": "2026-10-30T23:07:45.702Z",
    "summary": {
      "status": "pass",
      "score": 63.6,
      "label": "記憶體循環偏多",
      "headline": "HBM 是 AI 主線，DRAM / NAND 是供給排擠與資料中心擴張的放大器。",
      "interpretation": "優先看 HBM 供應商、封裝產能與 HBM4 進度；DDR5 與 NAND 價格代表 AI demand 擴散到通用伺服器與儲存鏈。",
      "cycleRiskScore": 99.5,
      "cycleRiskLabel": "高檔反轉警示",
      "cycleRiskTone": "down",
      "topCycleAlert": "供應商股價代理先轉弱",
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
        "score": 62.3,
        "tone": "neutral",
        "metric": "代理20日 -19.67%",
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
        "sourceAsOf": "2026-10-30T10:10:00.000Z"
      },
      {
        "id": "nand",
        "label": "NAND / SSD",
        "rank": 3,
        "score": 58.3,
        "tone": "neutral",
        "metric": "NAND 合約 30.608 USD",
        "detail": "AI 資料中心帶動 enterprise SSD 與高效儲存，消費端承受成本壓力。",
        "components": [
          "Enterprise SSD",
          "QLC/TLC",
          "eMMC/UFS",
          "Wafer"
        ],
        "sourceLabel": "TrendForce NAND Flash Contract Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/flash/pcc_oem_ssd_contract",
        "sourceAsOf": "2026-09-30T02:00:00.000Z"
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
            "time": "2026-10-01T10:10:00.000Z",
            "value": 40.699
          },
          {
            "time": "2026-10-02T10:10:00.000Z",
            "value": 40.796
          },
          {
            "time": "2026-10-03T10:10:00.000Z",
            "value": 40.884
          },
          {
            "time": "2026-10-04T10:10:00.000Z",
            "value": 40.955
          },
          {
            "time": "2026-10-05T10:10:00.000Z",
            "value": 41.004
          },
          {
            "time": "2026-10-06T10:10:00.000Z",
            "value": 41.026
          },
          {
            "time": "2026-10-07T10:10:00.000Z",
            "value": 41.02
          },
          {
            "time": "2026-10-08T10:10:00.000Z",
            "value": 40.991
          },
          {
            "time": "2026-10-09T10:10:00.000Z",
            "value": 40.941
          },
          {
            "time": "2026-10-10T10:10:00.000Z",
            "value": 40.879
          },
          {
            "time": "2026-10-11T10:10:00.000Z",
            "value": 40.813
          },
          {
            "time": "2026-10-12T10:10:00.000Z",
            "value": 40.753
          },
          {
            "time": "2026-10-13T10:10:00.000Z",
            "value": 40.706
          },
          {
            "time": "2026-10-14T10:10:00.000Z",
            "value": 40.679
          },
          {
            "time": "2026-10-15T10:10:00.000Z",
            "value": 40.678
          },
          {
            "time": "2026-10-16T10:10:00.000Z",
            "value": 40.704
          },
          {
            "time": "2026-10-17T10:10:00.000Z",
            "value": 40.756
          },
          {
            "time": "2026-10-18T10:10:00.000Z",
            "value": 40.831
          },
          {
            "time": "2026-10-19T10:10:00.000Z",
            "value": 40.92
          },
          {
            "time": "2026-10-20T10:10:00.000Z",
            "value": 41.018
          },
          {
            "time": "2026-10-21T10:10:00.000Z",
            "value": 41.114
          },
          {
            "time": "2026-10-22T10:10:00.000Z",
            "value": 41.2
          },
          {
            "time": "2026-10-23T10:10:00.000Z",
            "value": 41.268
          },
          {
            "time": "2026-10-24T10:10:00.000Z",
            "value": 41.313
          },
          {
            "time": "2026-10-25T10:10:00.000Z",
            "value": 41.331
          },
          {
            "time": "2026-10-26T10:10:00.000Z",
            "value": 41.322
          },
          {
            "time": "2026-10-27T10:10:00.000Z",
            "value": 41.288
          },
          {
            "time": "2026-10-28T10:10:00.000Z",
            "value": 41.237
          },
          {
            "time": "2026-10-29T10:10:00.000Z",
            "value": 41.173
          },
          {
            "time": "2026-10-30T10:10:00.000Z",
            "value": 41.108
          }
        ],
        "historyStatus": "latest-plus-change",
        "sourceLabel": "TrendForce DRAM Spot Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "sourceAsOf": "2026-10-30T10:10:00.000Z",
        "checkedAt": "2026-10-30T23:07:45.702Z"
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
        "changePct": 0,
        "score": 55,
        "tone": "neutral",
        "priority": 3,
        "series": [
          {
            "time": "2026-09-01T09:00:00.000Z",
            "value": 133
          },
          {
            "time": "2026-09-02T09:00:00.000Z",
            "value": 133.261
          },
          {
            "time": "2026-09-03T09:00:00.000Z",
            "value": 133.493
          },
          {
            "time": "2026-09-04T09:00:00.000Z",
            "value": 133.671
          },
          {
            "time": "2026-09-05T09:00:00.000Z",
            "value": 133.776
          },
          {
            "time": "2026-09-06T09:00:00.000Z",
            "value": 133.794
          },
          {
            "time": "2026-09-07T09:00:00.000Z",
            "value": 133.726
          },
          {
            "time": "2026-09-08T09:00:00.000Z",
            "value": 133.577
          },
          {
            "time": "2026-09-09T09:00:00.000Z",
            "value": 133.365
          },
          {
            "time": "2026-09-10T09:00:00.000Z",
            "value": 133.113
          },
          {
            "time": "2026-09-11T09:00:00.000Z",
            "value": 132.848
          },
          {
            "time": "2026-09-12T09:00:00.000Z",
            "value": 132.6
          },
          {
            "time": "2026-09-13T09:00:00.000Z",
            "value": 132.396
          },
          {
            "time": "2026-09-14T09:00:00.000Z",
            "value": 132.259
          },
          {
            "time": "2026-09-15T09:00:00.000Z",
            "value": 132.203
          },
          {
            "time": "2026-09-16T09:00:00.000Z",
            "value": 132.235
          },
          {
            "time": "2026-09-17T09:00:00.000Z",
            "value": 132.351
          },
          {
            "time": "2026-09-18T09:00:00.000Z",
            "value": 132.539
          },
          {
            "time": "2026-09-19T09:00:00.000Z",
            "value": 132.777
          },
          {
            "time": "2026-09-20T09:00:00.000Z",
            "value": 133.04
          },
          {
            "time": "2026-09-21T09:00:00.000Z",
            "value": 133.299
          },
          {
            "time": "2026-09-22T09:00:00.000Z",
            "value": 133.524
          },
          {
            "time": "2026-09-23T09:00:00.000Z",
            "value": 133.692
          },
          {
            "time": "2026-09-24T09:00:00.000Z",
            "value": 133.784
          },
          {
            "time": "2026-09-25T09:00:00.000Z",
            "value": 133.79
          },
          {
            "time": "2026-09-26T09:00:00.000Z",
            "value": 133.708
          },
          {
            "time": "2026-09-27T09:00:00.000Z",
            "value": 133.549
          },
          {
            "time": "2026-09-28T09:00:00.000Z",
            "value": 133.329
          },
          {
            "time": "2026-09-29T09:00:00.000Z",
            "value": 133.073
          },
          {
            "time": "2026-09-30T09:00:00.000Z",
            "value": 132.809
          }
        ],
        "historyStatus": "latest-plus-change",
        "sourceLabel": "TrendForce DRAM Contract Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "sourceAsOf": "2026-09-30T09:00:00.000Z",
        "checkedAt": "2026-10-30T23:07:45.702Z"
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
            "time": "2026-10-01T10:10:00.000Z",
            "value": 58.238
          },
          {
            "time": "2026-10-02T10:10:00.000Z",
            "value": 58.352
          },
          {
            "time": "2026-10-03T10:10:00.000Z",
            "value": 58.454
          },
          {
            "time": "2026-10-04T10:10:00.000Z",
            "value": 58.532
          },
          {
            "time": "2026-10-05T10:10:00.000Z",
            "value": 58.578
          },
          {
            "time": "2026-10-06T10:10:00.000Z",
            "value": 58.586
          },
          {
            "time": "2026-10-07T10:10:00.000Z",
            "value": 58.556
          },
          {
            "time": "2026-10-08T10:10:00.000Z",
            "value": 58.491
          },
          {
            "time": "2026-10-09T10:10:00.000Z",
            "value": 58.398
          },
          {
            "time": "2026-10-10T10:10:00.000Z",
            "value": 58.287
          },
          {
            "time": "2026-10-11T10:10:00.000Z",
            "value": 58.171
          },
          {
            "time": "2026-10-12T10:10:00.000Z",
            "value": 58.063
          },
          {
            "time": "2026-10-13T10:10:00.000Z",
            "value": 57.974
          },
          {
            "time": "2026-10-14T10:10:00.000Z",
            "value": 57.913
          },
          {
            "time": "2026-10-15T10:10:00.000Z",
            "value": 57.889
          },
          {
            "time": "2026-10-16T10:10:00.000Z",
            "value": 57.903
          },
          {
            "time": "2026-10-17T10:10:00.000Z",
            "value": 57.954
          },
          {
            "time": "2026-10-18T10:10:00.000Z",
            "value": 58.036
          },
          {
            "time": "2026-10-19T10:10:00.000Z",
            "value": 58.14
          },
          {
            "time": "2026-10-20T10:10:00.000Z",
            "value": 58.256
          },
          {
            "time": "2026-10-21T10:10:00.000Z",
            "value": 58.369
          },
          {
            "time": "2026-10-22T10:10:00.000Z",
            "value": 58.468
          },
          {
            "time": "2026-10-23T10:10:00.000Z",
            "value": 58.541
          },
          {
            "time": "2026-10-24T10:10:00.000Z",
            "value": 58.581
          },
          {
            "time": "2026-10-25T10:10:00.000Z",
            "value": 58.584
          },
          {
            "time": "2026-10-26T10:10:00.000Z",
            "value": 58.548
          },
          {
            "time": "2026-10-27T10:10:00.000Z",
            "value": 58.478
          },
          {
            "time": "2026-10-28T10:10:00.000Z",
            "value": 58.382
          },
          {
            "time": "2026-10-29T10:10:00.000Z",
            "value": 58.27
          },
          {
            "time": "2026-10-30T10:10:00.000Z",
            "value": 58.154
          }
        ],
        "historyStatus": "latest-plus-change",
        "sourceLabel": "TrendForce DRAM Spot Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "sourceAsOf": "2026-10-30T10:10:00.000Z",
        "checkedAt": "2026-10-30T23:07:45.702Z"
      },
      {
        "id": "dram-ddr4-contract",
        "chain": "DRAM",
        "kind": "合約價",
        "label": "DDR4 16GB SO-DIMM",
        "unit": "USD",
        "latest": 275,
        "high": 295,
        "low": 255,
        "changePct": 1.85,
        "score": 57.6,
        "tone": "neutral",
        "priority": 5,
        "series": [
          {
            "time": "2026-09-01T09:00:00.000Z",
            "value": 270.005
          },
          {
            "time": "2026-09-02T09:00:00.000Z",
            "value": 270.717
          },
          {
            "time": "2026-09-03T09:00:00.000Z",
            "value": 271.37
          },
          {
            "time": "2026-09-04T09:00:00.000Z",
            "value": 271.91
          },
          {
            "time": "2026-09-05T09:00:00.000Z",
            "value": 272.298
          },
          {
            "time": "2026-09-06T09:00:00.000Z",
            "value": 272.509
          },
          {
            "time": "2026-09-07T09:00:00.000Z",
            "value": 272.539
          },
          {
            "time": "2026-09-08T09:00:00.000Z",
            "value": 272.404
          },
          {
            "time": "2026-09-09T09:00:00.000Z",
            "value": 272.137
          },
          {
            "time": "2026-09-10T09:00:00.000Z",
            "value": 271.788
          },
          {
            "time": "2026-09-11T09:00:00.000Z",
            "value": 271.413
          },
          {
            "time": "2026-09-12T09:00:00.000Z",
            "value": 271.072
          },
          {
            "time": "2026-09-13T09:00:00.000Z",
            "value": 270.823
          },
          {
            "time": "2026-09-14T09:00:00.000Z",
            "value": 270.711
          },
          {
            "time": "2026-09-15T09:00:00.000Z",
            "value": 270.768
          },
          {
            "time": "2026-09-16T09:00:00.000Z",
            "value": 271.006
          },
          {
            "time": "2026-09-17T09:00:00.000Z",
            "value": 271.419
          },
          {
            "time": "2026-09-18T09:00:00.000Z",
            "value": 271.979
          },
          {
            "time": "2026-09-19T09:00:00.000Z",
            "value": 272.644
          },
          {
            "time": "2026-09-20T09:00:00.000Z",
            "value": 273.36
          },
          {
            "time": "2026-09-21T09:00:00.000Z",
            "value": 274.067
          },
          {
            "time": "2026-09-22T09:00:00.000Z",
            "value": 274.706
          },
          {
            "time": "2026-09-23T09:00:00.000Z",
            "value": 275.226
          },
          {
            "time": "2026-09-24T09:00:00.000Z",
            "value": 275.588
          },
          {
            "time": "2026-09-25T09:00:00.000Z",
            "value": 275.771
          },
          {
            "time": "2026-09-26T09:00:00.000Z",
            "value": 275.775
          },
          {
            "time": "2026-09-27T09:00:00.000Z",
            "value": 275.618
          },
          {
            "time": "2026-09-28T09:00:00.000Z",
            "value": 275.336
          },
          {
            "time": "2026-09-29T09:00:00.000Z",
            "value": 274.978
          },
          {
            "time": "2026-09-30T09:00:00.000Z",
            "value": 274.605
          }
        ],
        "historyStatus": "latest-plus-change",
        "sourceLabel": "TrendForce DRAM Contract Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "sourceAsOf": "2026-09-30T09:00:00.000Z",
        "checkedAt": "2026-10-30T23:07:45.702Z"
      },
      {
        "id": "nand-contract",
        "chain": "NAND",
        "kind": "合約價",
        "label": "NAND 128Gb 16Gx8 MLC",
        "unit": "USD",
        "latest": 30.608,
        "high": 30.8,
        "low": 30.3,
        "changePct": 0.44,
        "score": 55.6,
        "tone": "neutral",
        "priority": 6,
        "series": [
          {
            "time": "2026-09-01T02:00:00.000Z",
            "value": 30.474
          },
          {
            "time": "2026-09-02T02:00:00.000Z",
            "value": 30.539
          },
          {
            "time": "2026-09-03T02:00:00.000Z",
            "value": 30.597
          },
          {
            "time": "2026-09-04T02:00:00.000Z",
            "value": 30.642
          },
          {
            "time": "2026-09-05T02:00:00.000Z",
            "value": 30.671
          },
          {
            "time": "2026-09-06T02:00:00.000Z",
            "value": 30.68
          },
          {
            "time": "2026-09-07T02:00:00.000Z",
            "value": 30.669
          },
          {
            "time": "2026-09-08T02:00:00.000Z",
            "value": 30.639
          },
          {
            "time": "2026-09-09T02:00:00.000Z",
            "value": 30.595
          },
          {
            "time": "2026-09-10T02:00:00.000Z",
            "value": 30.541
          },
          {
            "time": "2026-09-11T02:00:00.000Z",
            "value": 30.485
          },
          {
            "time": "2026-09-12T02:00:00.000Z",
            "value": 30.433
          },
          {
            "time": "2026-09-13T02:00:00.000Z",
            "value": 30.39
          },
          {
            "time": "2026-09-14T02:00:00.000Z",
            "value": 30.363
          },
          {
            "time": "2026-09-15T02:00:00.000Z",
            "value": 30.355
          },
          {
            "time": "2026-09-16T02:00:00.000Z",
            "value": 30.367
          },
          {
            "time": "2026-09-17T02:00:00.000Z",
            "value": 30.399
          },
          {
            "time": "2026-09-18T02:00:00.000Z",
            "value": 30.446
          },
          {
            "time": "2026-09-19T02:00:00.000Z",
            "value": 30.506
          },
          {
            "time": "2026-09-20T02:00:00.000Z",
            "value": 30.571
          },
          {
            "time": "2026-09-21T02:00:00.000Z",
            "value": 30.635
          },
          {
            "time": "2026-09-22T02:00:00.000Z",
            "value": 30.692
          },
          {
            "time": "2026-09-23T02:00:00.000Z",
            "value": 30.735
          },
          {
            "time": "2026-09-24T02:00:00.000Z",
            "value": 30.761
          },
          {
            "time": "2026-09-25T02:00:00.000Z",
            "value": 30.767
          },
          {
            "time": "2026-09-26T02:00:00.000Z",
            "value": 30.752
          },
          {
            "time": "2026-09-27T02:00:00.000Z",
            "value": 30.72
          },
          {
            "time": "2026-09-28T02:00:00.000Z",
            "value": 30.674
          },
          {
            "time": "2026-09-29T02:00:00.000Z",
            "value": 30.62
          },
          {
            "time": "2026-09-30T02:00:00.000Z",
            "value": 30.564
          }
        ],
        "historyStatus": "latest-plus-change",
        "sourceLabel": "TrendForce NAND Flash Contract Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/flash/pcc_oem_ssd_contract",
        "sourceAsOf": "2026-09-30T02:00:00.000Z",
        "checkedAt": "2026-10-30T23:07:45.702Z"
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
            "time": "2026-08-04T20:00:00.000Z",
            "value": 113.29
          },
          {
            "time": "2026-08-05T20:00:00.000Z",
            "value": 115.97
          },
          {
            "time": "2026-08-06T20:00:00.000Z",
            "value": 107.8
          },
          {
            "time": "2026-08-07T20:00:00.000Z",
            "value": 105.28
          },
          {
            "time": "2026-08-10T20:00:00.000Z",
            "value": 104.56
          },
          {
            "time": "2026-08-11T20:00:00.000Z",
            "value": 105.91
          },
          {
            "time": "2026-08-12T20:00:00.000Z",
            "value": 111.68
          },
          {
            "time": "2026-08-13T20:00:00.000Z",
            "value": 117.56
          },
          {
            "time": "2026-08-14T20:00:00.000Z",
            "value": 120.92
          },
          {
            "time": "2026-08-17T20:00:00.000Z",
            "value": 117.08
          },
          {
            "time": "2026-08-18T20:00:00.000Z",
            "value": 119.4
          },
          {
            "time": "2026-08-19T20:00:00.000Z",
            "value": 111.95
          },
          {
            "time": "2026-08-20T20:00:00.000Z",
            "value": 121.28
          },
          {
            "time": "2026-08-21T20:00:00.000Z",
            "value": 122.95
          },
          {
            "time": "2026-08-24T20:00:00.000Z",
            "value": 116.25
          },
          {
            "time": "2026-08-25T20:00:00.000Z",
            "value": 117.61
          },
          {
            "time": "2026-08-26T20:00:00.000Z",
            "value": 118.88
          },
          {
            "time": "2026-08-27T20:00:00.000Z",
            "value": 120.27
          },
          {
            "time": "2026-08-28T20:00:00.000Z",
            "value": 117.05
          },
          {
            "time": "2026-08-31T20:00:00.000Z",
            "value": 118.79
          },
          {
            "time": "2026-09-01T20:00:00.000Z",
            "value": 118.44
          },
          {
            "time": "2026-09-02T20:00:00.000Z",
            "value": 115.98
          },
          {
            "time": "2026-09-03T20:00:00.000Z",
            "value": 115.39
          },
          {
            "time": "2026-09-04T20:00:00.000Z",
            "value": 120.13
          },
          {
            "time": "2026-09-07T20:00:00.000Z",
            "value": 133.34
          },
          {
            "time": "2026-09-08T20:00:00.000Z",
            "value": 125.23
          },
          {
            "time": "2026-09-09T20:00:00.000Z",
            "value": 128.2
          },
          {
            "time": "2026-09-10T20:00:00.000Z",
            "value": 125.72
          },
          {
            "time": "2026-09-11T20:00:00.000Z",
            "value": 123.29
          },
          {
            "time": "2026-09-14T20:00:00.000Z",
            "value": 116.6
          },
          {
            "time": "2026-09-15T20:00:00.000Z",
            "value": 116.22
          },
          {
            "time": "2026-09-16T20:00:00.000Z",
            "value": 118.73
          },
          {
            "time": "2026-09-17T20:00:00.000Z",
            "value": 120.34
          },
          {
            "time": "2026-09-18T20:00:00.000Z",
            "value": 126.19
          },
          {
            "time": "2026-09-21T20:00:00.000Z",
            "value": 128.98
          },
          {
            "time": "2026-09-22T20:00:00.000Z",
            "value": 130.75
          },
          {
            "time": "2026-09-23T20:00:00.000Z",
            "value": 131.48
          },
          {
            "time": "2026-09-24T20:00:00.000Z",
            "value": 119.71
          },
          {
            "time": "2026-09-25T20:00:00.000Z",
            "value": 120.15
          },
          {
            "time": "2026-09-28T20:00:00.000Z",
            "value": 126.21
          },
          {
            "time": "2026-09-29T20:00:00.000Z",
            "value": 126.8
          },
          {
            "time": "2026-09-30T20:00:00.000Z",
            "value": 126.74
          },
          {
            "time": "2026-10-01T20:00:00.000Z",
            "value": 130.51
          },
          {
            "time": "2026-10-02T20:00:00.000Z",
            "value": 129
          },
          {
            "time": "2026-10-05T20:00:00.000Z",
            "value": 117.79
          },
          {
            "time": "2026-10-06T20:00:00.000Z",
            "value": 125.44
          },
          {
            "time": "2026-10-07T20:00:00.000Z",
            "value": 125.21
          },
          {
            "time": "2026-10-08T20:00:00.000Z",
            "value": 121.13
          },
          {
            "time": "2026-10-09T20:00:00.000Z",
            "value": 112.62
          },
          {
            "time": "2026-10-12T20:00:00.000Z",
            "value": 115.89
          },
          {
            "time": "2026-10-13T20:00:00.000Z",
            "value": 107.94
          },
          {
            "time": "2026-10-14T20:00:00.000Z",
            "value": 105.43
          },
          {
            "time": "2026-10-15T20:00:00.000Z",
            "value": 99.31
          },
          {
            "time": "2026-10-16T20:00:00.000Z",
            "value": 97.65
          },
          {
            "time": "2026-10-19T20:00:00.000Z",
            "value": 99.42
          },
          {
            "time": "2026-10-20T20:00:00.000Z",
            "value": 97.11
          },
          {
            "time": "2026-10-21T20:00:00.000Z",
            "value": 101.26
          },
          {
            "time": "2026-10-22T20:00:00.000Z",
            "value": 95.68
          },
          {
            "time": "2026-10-23T20:00:00.000Z",
            "value": 97.96
          },
          {
            "time": "2026-10-26T20:00:00.000Z",
            "value": 98.9
          },
          {
            "time": "2026-10-27T20:00:00.000Z",
            "value": 103.1
          },
          {
            "time": "2026-10-28T20:00:00.000Z",
            "value": 111.63
          },
          {
            "time": "2026-10-29T20:00:00.000Z",
            "value": 109.86
          },
          {
            "time": "2026-10-30T20:00:00.000Z",
            "value": 103.62
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
            "time": "2026-10-01T10:10:00.000Z",
            "value": 100,
            "rawValue": 40.699
          },
          {
            "time": "2026-10-02T10:10:00.000Z",
            "value": 100.24,
            "rawValue": 40.796
          },
          {
            "time": "2026-10-03T10:10:00.000Z",
            "value": 100.45,
            "rawValue": 40.884
          },
          {
            "time": "2026-10-04T10:10:00.000Z",
            "value": 100.63,
            "rawValue": 40.955
          },
          {
            "time": "2026-10-05T10:10:00.000Z",
            "value": 100.75,
            "rawValue": 41.004
          },
          {
            "time": "2026-10-06T10:10:00.000Z",
            "value": 100.8,
            "rawValue": 41.026
          },
          {
            "time": "2026-10-07T10:10:00.000Z",
            "value": 100.79,
            "rawValue": 41.02
          },
          {
            "time": "2026-10-08T10:10:00.000Z",
            "value": 100.72,
            "rawValue": 40.991
          },
          {
            "time": "2026-10-09T10:10:00.000Z",
            "value": 100.59,
            "rawValue": 40.941
          },
          {
            "time": "2026-10-10T10:10:00.000Z",
            "value": 100.44,
            "rawValue": 40.879
          },
          {
            "time": "2026-10-11T10:10:00.000Z",
            "value": 100.28,
            "rawValue": 40.813
          },
          {
            "time": "2026-10-12T10:10:00.000Z",
            "value": 100.13,
            "rawValue": 40.753
          },
          {
            "time": "2026-10-13T10:10:00.000Z",
            "value": 100.02,
            "rawValue": 40.706
          },
          {
            "time": "2026-10-14T10:10:00.000Z",
            "value": 99.95,
            "rawValue": 40.679
          },
          {
            "time": "2026-10-15T10:10:00.000Z",
            "value": 99.95,
            "rawValue": 40.678
          },
          {
            "time": "2026-10-16T10:10:00.000Z",
            "value": 100.01,
            "rawValue": 40.704
          },
          {
            "time": "2026-10-17T10:10:00.000Z",
            "value": 100.14,
            "rawValue": 40.756
          },
          {
            "time": "2026-10-18T10:10:00.000Z",
            "value": 100.32,
            "rawValue": 40.831
          },
          {
            "time": "2026-10-19T10:10:00.000Z",
            "value": 100.54,
            "rawValue": 40.92
          },
          {
            "time": "2026-10-20T10:10:00.000Z",
            "value": 100.78,
            "rawValue": 41.018
          },
          {
            "time": "2026-10-21T10:10:00.000Z",
            "value": 101.02,
            "rawValue": 41.114
          },
          {
            "time": "2026-10-22T10:10:00.000Z",
            "value": 101.23,
            "rawValue": 41.2
          },
          {
            "time": "2026-10-23T10:10:00.000Z",
            "value": 101.4,
            "rawValue": 41.268
          },
          {
            "time": "2026-10-24T10:10:00.000Z",
            "value": 101.51,
            "rawValue": 41.313
          },
          {
            "time": "2026-10-25T10:10:00.000Z",
            "value": 101.55,
            "rawValue": 41.331
          },
          {
            "time": "2026-10-26T10:10:00.000Z",
            "value": 101.53,
            "rawValue": 41.322
          },
          {
            "time": "2026-10-27T10:10:00.000Z",
            "value": 101.45,
            "rawValue": 41.288
          },
          {
            "time": "2026-10-28T10:10:00.000Z",
            "value": 101.32,
            "rawValue": 41.237
          },
          {
            "time": "2026-10-29T10:10:00.000Z",
            "value": 101.16,
            "rawValue": 41.173
          },
          {
            "time": "2026-10-30T10:10:00.000Z",
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
            "time": "2026-09-01T02:00:00.000Z",
            "value": 100,
            "rawValue": 30.474
          },
          {
            "time": "2026-09-02T02:00:00.000Z",
            "value": 100.21,
            "rawValue": 30.539
          },
          {
            "time": "2026-09-03T02:00:00.000Z",
            "value": 100.4,
            "rawValue": 30.597
          },
          {
            "time": "2026-09-04T02:00:00.000Z",
            "value": 100.55,
            "rawValue": 30.642
          },
          {
            "time": "2026-09-05T02:00:00.000Z",
            "value": 100.65,
            "rawValue": 30.671
          },
          {
            "time": "2026-09-06T02:00:00.000Z",
            "value": 100.68,
            "rawValue": 30.68
          },
          {
            "time": "2026-09-07T02:00:00.000Z",
            "value": 100.64,
            "rawValue": 30.669
          },
          {
            "time": "2026-09-08T02:00:00.000Z",
            "value": 100.54,
            "rawValue": 30.639
          },
          {
            "time": "2026-09-09T02:00:00.000Z",
            "value": 100.4,
            "rawValue": 30.595
          },
          {
            "time": "2026-09-10T02:00:00.000Z",
            "value": 100.22,
            "rawValue": 30.541
          },
          {
            "time": "2026-09-11T02:00:00.000Z",
            "value": 100.04,
            "rawValue": 30.485
          },
          {
            "time": "2026-09-12T02:00:00.000Z",
            "value": 99.87,
            "rawValue": 30.433
          },
          {
            "time": "2026-09-13T02:00:00.000Z",
            "value": 99.72,
            "rawValue": 30.39
          },
          {
            "time": "2026-09-14T02:00:00.000Z",
            "value": 99.64,
            "rawValue": 30.363
          },
          {
            "time": "2026-09-15T02:00:00.000Z",
            "value": 99.61,
            "rawValue": 30.355
          },
          {
            "time": "2026-09-16T02:00:00.000Z",
            "value": 99.65,
            "rawValue": 30.367
          },
          {
            "time": "2026-09-17T02:00:00.000Z",
            "value": 99.75,
            "rawValue": 30.399
          },
          {
            "time": "2026-09-18T02:00:00.000Z",
            "value": 99.91,
            "rawValue": 30.446
          },
          {
            "time": "2026-09-19T02:00:00.000Z",
            "value": 100.11,
            "rawValue": 30.506
          },
          {
            "time": "2026-09-20T02:00:00.000Z",
            "value": 100.32,
            "rawValue": 30.571
          },
          {
            "time": "2026-09-21T02:00:00.000Z",
            "value": 100.53,
            "rawValue": 30.635
          },
          {
            "time": "2026-09-22T02:00:00.000Z",
            "value": 100.72,
            "rawValue": 30.692
          },
          {
            "time": "2026-09-23T02:00:00.000Z",
            "value": 100.86,
            "rawValue": 30.735
          },
          {
            "time": "2026-09-24T02:00:00.000Z",
            "value": 100.94,
            "rawValue": 30.761
          },
          {
            "time": "2026-09-25T02:00:00.000Z",
            "value": 100.96,
            "rawValue": 30.767
          },
          {
            "time": "2026-09-26T02:00:00.000Z",
            "value": 100.91,
            "rawValue": 30.752
          },
          {
            "time": "2026-09-27T02:00:00.000Z",
            "value": 100.81,
            "rawValue": 30.72
          },
          {
            "time": "2026-09-28T02:00:00.000Z",
            "value": 100.66,
            "rawValue": 30.674
          },
          {
            "time": "2026-09-29T02:00:00.000Z",
            "value": 100.48,
            "rawValue": 30.62
          },
          {
            "time": "2026-09-30T02:00:00.000Z",
            "value": 100.3,
            "rawValue": 30.564
          }
        ],
        "sourceLabel": "TrendForce NAND Flash Contract Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/flash/pcc_oem_ssd_contract",
        "historyStatus": "latest-plus-change"
      }
    ],
    "cycleAlerts": [
      {
        "id": "supplier-proxy-rollover",
        "title": "供應商股價代理先轉弱",
        "body": "HBM/記憶體供應商代理 20 日 -19.67%；若 TrendForce 價格仍強，代表股價可能先反映週期高點或估值壓力。",
        "score": 99.5,
        "severity": "high",
        "tone": "down",
        "metric": "20日 -19.67% / 5日 5.78%",
        "meaning": "股價領先價格轉弱，偏向見頂警示。",
        "sourceLabel": "Yahoo Finance supplier basket",
        "sourceUrl": "https://finance.yahoo.com/",
        "asOf": "2026-10-30T20:00:00.000Z"
      }
    ],
    "sources": [
      {
        "id": "trendforce-hbm-bulletin",
        "label": "TrendForce HBM Market Bulletin",
        "url": "https://www.trendforce.com/research/download/RP260513PF3",
        "status": "pass",
        "checkedAt": "2026-10-30T23:07:45.702Z",
        "sourceAsOf": "2026-05-12T16:00:00.000Z",
        "note": "Monthly HBM bulletin; public page shows highlights, full PDF requires purchase or membership"
      },
      {
        "id": "trendforce-dram-spot",
        "label": "TrendForce DRAM Spot Price",
        "url": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "status": "pass",
        "checkedAt": "2026-10-30T23:07:45.702Z",
        "sourceAsOf": "2026-10-30T10:10:00.000Z",
        "note": "TrendForce public price table"
      },
      {
        "id": "trendforce-dram-contract",
        "label": "TrendForce DRAM Contract Price",
        "url": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "status": "pass",
        "checkedAt": "2026-10-30T23:07:45.702Z",
        "sourceAsOf": "2026-09-30T09:00:00.000Z",
        "note": "TrendForce public price table"
      },
      {
        "id": "trendforce-nand-contract",
        "label": "TrendForce NAND Flash Contract Price",
        "url": "https://www.trendforce.com.tw/price/flash/pcc_oem_ssd_contract",
        "status": "pass",
        "checkedAt": "2026-10-30T23:07:45.702Z",
        "sourceAsOf": "2026-09-30T02:00:00.000Z",
        "note": "TrendForce public price table"
      },
      {
        "id": "trendforce-memory-wall",
        "label": "TrendForce Memory Wall Insight",
        "url": "https://www.trendforce.com.tw/insights/memory-wall",
        "status": "pass",
        "checkedAt": "2026-10-30T23:07:45.702Z",
        "sourceAsOf": "2026-01-15T16:00:00.000Z",
        "note": "HBM / DDR5 / AI inference chain thesis"
      },
      {
        "id": "trendforce-2q26-price-forecast",
        "label": "TrendForce 2Q26 Memory Price Forecast",
        "url": "https://www.trendforce.com/presscenter/news/20260331-12995.html",
        "status": "pass",
        "checkedAt": "2026-10-30T23:07:45.702Z",
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
