export const memoryMarketData = {
  "meta": {
    "generatedAt": "2026-07-25T09:21:48.583Z",
    "source": "us-market-radar memoryMarket pipeline",
    "summary": {
      "status": "pass",
      "score": 64.1,
      "label": "記憶體循環偏多",
      "headline": "HBM 是 AI 主線，DRAM / NAND 是供給排擠與資料中心擴張的放大器。",
      "interpretation": "優先看 HBM 供應商、封裝產能與 HBM4 進度；DDR5 與 NAND 價格代表 AI demand 擴散到通用伺服器與儲存鏈。",
      "cycleRiskScore": 100,
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
    "generatedAt": "2026-07-25T09:21:47.824Z",
    "summary": {
      "status": "pass",
      "score": 64.1,
      "label": "記憶體循環偏多",
      "headline": "HBM 是 AI 主線，DRAM / NAND 是供給排擠與資料中心擴張的放大器。",
      "interpretation": "優先看 HBM 供應商、封裝產能與 HBM4 進度；DDR5 與 NAND 價格代表 AI demand 擴散到通用伺服器與儲存鏈。",
      "cycleRiskScore": 100,
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
        "score": 57.3,
        "tone": "neutral",
        "metric": "代理20日 -25.88%",
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
        "sourceAsOf": "2026-07-24T10:10:00.000Z"
      },
      {
        "id": "nand",
        "label": "NAND / SSD",
        "rank": 3,
        "score": 64.8,
        "tone": "neutral",
        "metric": "NAND 合約 26.508 USD",
        "detail": "AI 資料中心帶動 enterprise SSD 與高效儲存，消費端承受成本壓力。",
        "components": [
          "Enterprise SSD",
          "QLC/TLC",
          "eMMC/UFS",
          "Wafer"
        ],
        "sourceLabel": "TrendForce NAND Flash Contract Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/flash/pcc_oem_ssd_contract",
        "sourceAsOf": "2026-05-29T02:00:00.000Z"
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
            "time": "2026-06-25T10:10:00.000Z",
            "value": 40.699
          },
          {
            "time": "2026-06-26T10:10:00.000Z",
            "value": 40.796
          },
          {
            "time": "2026-06-27T10:10:00.000Z",
            "value": 40.884
          },
          {
            "time": "2026-06-28T10:10:00.000Z",
            "value": 40.955
          },
          {
            "time": "2026-06-29T10:10:00.000Z",
            "value": 41.004
          },
          {
            "time": "2026-06-30T10:10:00.000Z",
            "value": 41.026
          },
          {
            "time": "2026-07-01T10:10:00.000Z",
            "value": 41.02
          },
          {
            "time": "2026-07-02T10:10:00.000Z",
            "value": 40.991
          },
          {
            "time": "2026-07-03T10:10:00.000Z",
            "value": 40.941
          },
          {
            "time": "2026-07-04T10:10:00.000Z",
            "value": 40.879
          },
          {
            "time": "2026-07-05T10:10:00.000Z",
            "value": 40.813
          },
          {
            "time": "2026-07-06T10:10:00.000Z",
            "value": 40.753
          },
          {
            "time": "2026-07-07T10:10:00.000Z",
            "value": 40.706
          },
          {
            "time": "2026-07-08T10:10:00.000Z",
            "value": 40.679
          },
          {
            "time": "2026-07-09T10:10:00.000Z",
            "value": 40.678
          },
          {
            "time": "2026-07-10T10:10:00.000Z",
            "value": 40.704
          },
          {
            "time": "2026-07-11T10:10:00.000Z",
            "value": 40.756
          },
          {
            "time": "2026-07-12T10:10:00.000Z",
            "value": 40.831
          },
          {
            "time": "2026-07-13T10:10:00.000Z",
            "value": 40.92
          },
          {
            "time": "2026-07-14T10:10:00.000Z",
            "value": 41.018
          },
          {
            "time": "2026-07-15T10:10:00.000Z",
            "value": 41.114
          },
          {
            "time": "2026-07-16T10:10:00.000Z",
            "value": 41.2
          },
          {
            "time": "2026-07-17T10:10:00.000Z",
            "value": 41.268
          },
          {
            "time": "2026-07-18T10:10:00.000Z",
            "value": 41.313
          },
          {
            "time": "2026-07-19T10:10:00.000Z",
            "value": 41.331
          },
          {
            "time": "2026-07-20T10:10:00.000Z",
            "value": 41.322
          },
          {
            "time": "2026-07-21T10:10:00.000Z",
            "value": 41.288
          },
          {
            "time": "2026-07-22T10:10:00.000Z",
            "value": 41.237
          },
          {
            "time": "2026-07-23T10:10:00.000Z",
            "value": 41.173
          },
          {
            "time": "2026-07-24T10:10:00.000Z",
            "value": 41.108
          }
        ],
        "historyStatus": "latest-plus-change",
        "sourceLabel": "TrendForce DRAM Spot Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "sourceAsOf": "2026-07-24T10:10:00.000Z",
        "checkedAt": "2026-07-25T09:21:47.824Z"
      },
      {
        "id": "dram-ddr5-contract",
        "chain": "DRAM",
        "kind": "合約價",
        "label": "DDR5 8GB SO-DIMM",
        "unit": "USD",
        "latest": 112,
        "high": 123,
        "low": 99,
        "changePct": 2.75,
        "score": 58.9,
        "tone": "neutral",
        "priority": 3,
        "series": [
          {
            "time": "2026-04-30T07:00:00.000Z",
            "value": 109.002
          },
          {
            "time": "2026-05-01T07:00:00.000Z",
            "value": 109.326
          },
          {
            "time": "2026-05-02T07:00:00.000Z",
            "value": 109.625
          },
          {
            "time": "2026-05-03T07:00:00.000Z",
            "value": 109.878
          },
          {
            "time": "2026-05-04T07:00:00.000Z",
            "value": 110.069
          },
          {
            "time": "2026-05-05T07:00:00.000Z",
            "value": 110.188
          },
          {
            "time": "2026-05-06T07:00:00.000Z",
            "value": 110.234
          },
          {
            "time": "2026-05-07T07:00:00.000Z",
            "value": 110.212
          },
          {
            "time": "2026-05-08T07:00:00.000Z",
            "value": 110.137
          },
          {
            "time": "2026-05-09T07:00:00.000Z",
            "value": 110.028
          },
          {
            "time": "2026-05-10T07:00:00.000Z",
            "value": 109.908
          },
          {
            "time": "2026-05-11T07:00:00.000Z",
            "value": 109.803
          },
          {
            "time": "2026-05-12T07:00:00.000Z",
            "value": 109.734
          },
          {
            "time": "2026-05-13T07:00:00.000Z",
            "value": 109.722
          },
          {
            "time": "2026-05-14T07:00:00.000Z",
            "value": 109.778
          },
          {
            "time": "2026-05-15T07:00:00.000Z",
            "value": 109.909
          },
          {
            "time": "2026-05-16T07:00:00.000Z",
            "value": 110.11
          },
          {
            "time": "2026-05-17T07:00:00.000Z",
            "value": 110.371
          },
          {
            "time": "2026-05-18T07:00:00.000Z",
            "value": 110.675
          },
          {
            "time": "2026-05-19T07:00:00.000Z",
            "value": 111
          },
          {
            "time": "2026-05-20T07:00:00.000Z",
            "value": 111.321
          },
          {
            "time": "2026-05-21T07:00:00.000Z",
            "value": 111.615
          },
          {
            "time": "2026-05-22T07:00:00.000Z",
            "value": 111.859
          },
          {
            "time": "2026-05-23T07:00:00.000Z",
            "value": 112.04
          },
          {
            "time": "2026-05-24T07:00:00.000Z",
            "value": 112.148
          },
          {
            "time": "2026-05-25T07:00:00.000Z",
            "value": 112.183
          },
          {
            "time": "2026-05-26T07:00:00.000Z",
            "value": 112.152
          },
          {
            "time": "2026-05-27T07:00:00.000Z",
            "value": 112.07
          },
          {
            "time": "2026-05-28T07:00:00.000Z",
            "value": 111.958
          },
          {
            "time": "2026-05-29T07:00:00.000Z",
            "value": 111.839
          }
        ],
        "historyStatus": "latest-plus-change",
        "sourceLabel": "TrendForce DRAM Contract Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "sourceAsOf": "2026-05-29T07:00:00.000Z",
        "checkedAt": "2026-07-25T09:21:47.824Z"
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
            "time": "2026-06-25T10:10:00.000Z",
            "value": 58.238
          },
          {
            "time": "2026-06-26T10:10:00.000Z",
            "value": 58.352
          },
          {
            "time": "2026-06-27T10:10:00.000Z",
            "value": 58.454
          },
          {
            "time": "2026-06-28T10:10:00.000Z",
            "value": 58.532
          },
          {
            "time": "2026-06-29T10:10:00.000Z",
            "value": 58.578
          },
          {
            "time": "2026-06-30T10:10:00.000Z",
            "value": 58.586
          },
          {
            "time": "2026-07-01T10:10:00.000Z",
            "value": 58.556
          },
          {
            "time": "2026-07-02T10:10:00.000Z",
            "value": 58.491
          },
          {
            "time": "2026-07-03T10:10:00.000Z",
            "value": 58.398
          },
          {
            "time": "2026-07-04T10:10:00.000Z",
            "value": 58.287
          },
          {
            "time": "2026-07-05T10:10:00.000Z",
            "value": 58.171
          },
          {
            "time": "2026-07-06T10:10:00.000Z",
            "value": 58.063
          },
          {
            "time": "2026-07-07T10:10:00.000Z",
            "value": 57.974
          },
          {
            "time": "2026-07-08T10:10:00.000Z",
            "value": 57.913
          },
          {
            "time": "2026-07-09T10:10:00.000Z",
            "value": 57.889
          },
          {
            "time": "2026-07-10T10:10:00.000Z",
            "value": 57.903
          },
          {
            "time": "2026-07-11T10:10:00.000Z",
            "value": 57.954
          },
          {
            "time": "2026-07-12T10:10:00.000Z",
            "value": 58.036
          },
          {
            "time": "2026-07-13T10:10:00.000Z",
            "value": 58.14
          },
          {
            "time": "2026-07-14T10:10:00.000Z",
            "value": 58.256
          },
          {
            "time": "2026-07-15T10:10:00.000Z",
            "value": 58.369
          },
          {
            "time": "2026-07-16T10:10:00.000Z",
            "value": 58.468
          },
          {
            "time": "2026-07-17T10:10:00.000Z",
            "value": 58.541
          },
          {
            "time": "2026-07-18T10:10:00.000Z",
            "value": 58.581
          },
          {
            "time": "2026-07-19T10:10:00.000Z",
            "value": 58.584
          },
          {
            "time": "2026-07-20T10:10:00.000Z",
            "value": 58.548
          },
          {
            "time": "2026-07-21T10:10:00.000Z",
            "value": 58.478
          },
          {
            "time": "2026-07-22T10:10:00.000Z",
            "value": 58.382
          },
          {
            "time": "2026-07-23T10:10:00.000Z",
            "value": 58.27
          },
          {
            "time": "2026-07-24T10:10:00.000Z",
            "value": 58.154
          }
        ],
        "historyStatus": "latest-plus-change",
        "sourceLabel": "TrendForce DRAM Spot Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "sourceAsOf": "2026-07-24T10:10:00.000Z",
        "checkedAt": "2026-07-25T09:21:47.824Z"
      },
      {
        "id": "dram-ddr4-contract",
        "chain": "DRAM",
        "kind": "合約價",
        "label": "DDR4 16GB SO-DIMM",
        "unit": "USD",
        "latest": 227,
        "high": 256,
        "low": 192,
        "changePct": 0,
        "score": 55,
        "tone": "neutral",
        "priority": 5,
        "series": [
          {
            "time": "2026-04-30T07:00:00.000Z",
            "value": 227
          },
          {
            "time": "2026-05-01T07:00:00.000Z",
            "value": 227.446
          },
          {
            "time": "2026-05-02T07:00:00.000Z",
            "value": 227.842
          },
          {
            "time": "2026-05-03T07:00:00.000Z",
            "value": 228.146
          },
          {
            "time": "2026-05-04T07:00:00.000Z",
            "value": 228.324
          },
          {
            "time": "2026-05-05T07:00:00.000Z",
            "value": 228.356
          },
          {
            "time": "2026-05-06T07:00:00.000Z",
            "value": 228.238
          },
          {
            "time": "2026-05-07T07:00:00.000Z",
            "value": 227.985
          },
          {
            "time": "2026-05-08T07:00:00.000Z",
            "value": 227.623
          },
          {
            "time": "2026-05-09T07:00:00.000Z",
            "value": 227.192
          },
          {
            "time": "2026-05-10T07:00:00.000Z",
            "value": 226.74
          },
          {
            "time": "2026-05-11T07:00:00.000Z",
            "value": 226.317
          },
          {
            "time": "2026-05-12T07:00:00.000Z",
            "value": 225.969
          },
          {
            "time": "2026-05-13T07:00:00.000Z",
            "value": 225.735
          },
          {
            "time": "2026-05-14T07:00:00.000Z",
            "value": 225.639
          },
          {
            "time": "2026-05-15T07:00:00.000Z",
            "value": 225.694
          },
          {
            "time": "2026-05-16T07:00:00.000Z",
            "value": 225.892
          },
          {
            "time": "2026-05-17T07:00:00.000Z",
            "value": 226.212
          },
          {
            "time": "2026-05-18T07:00:00.000Z",
            "value": 226.619
          },
          {
            "time": "2026-05-19T07:00:00.000Z",
            "value": 227.068
          },
          {
            "time": "2026-05-20T07:00:00.000Z",
            "value": 227.51
          },
          {
            "time": "2026-05-21T07:00:00.000Z",
            "value": 227.895
          },
          {
            "time": "2026-05-22T07:00:00.000Z",
            "value": 228.182
          },
          {
            "time": "2026-05-23T07:00:00.000Z",
            "value": 228.338
          },
          {
            "time": "2026-05-24T07:00:00.000Z",
            "value": 228.348
          },
          {
            "time": "2026-05-25T07:00:00.000Z",
            "value": 228.208
          },
          {
            "time": "2026-05-26T07:00:00.000Z",
            "value": 227.936
          },
          {
            "time": "2026-05-27T07:00:00.000Z",
            "value": 227.561
          },
          {
            "time": "2026-05-28T07:00:00.000Z",
            "value": 227.124
          },
          {
            "time": "2026-05-29T07:00:00.000Z",
            "value": 226.674
          }
        ],
        "historyStatus": "latest-plus-change",
        "sourceLabel": "TrendForce DRAM Contract Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "sourceAsOf": "2026-05-29T07:00:00.000Z",
        "checkedAt": "2026-07-25T09:21:47.824Z"
      },
      {
        "id": "nand-contract",
        "chain": "NAND",
        "kind": "合約價",
        "label": "NAND 128Gb 16Gx8 MLC",
        "unit": "USD",
        "latest": 26.508,
        "high": 26.85,
        "low": 26.2,
        "changePct": 9.73,
        "score": 68.6,
        "tone": "neutral",
        "priority": 6,
        "series": [
          {
            "time": "2026-04-30T02:00:00.000Z",
            "value": 24.157
          },
          {
            "time": "2026-05-01T02:00:00.000Z",
            "value": 24.291
          },
          {
            "time": "2026-05-02T02:00:00.000Z",
            "value": 24.418
          },
          {
            "time": "2026-05-03T02:00:00.000Z",
            "value": 24.534
          },
          {
            "time": "2026-05-04T02:00:00.000Z",
            "value": 24.636
          },
          {
            "time": "2026-05-05T02:00:00.000Z",
            "value": 24.721
          },
          {
            "time": "2026-05-06T02:00:00.000Z",
            "value": 24.788
          },
          {
            "time": "2026-05-07T02:00:00.000Z",
            "value": 24.84
          },
          {
            "time": "2026-05-08T02:00:00.000Z",
            "value": 24.879
          },
          {
            "time": "2026-05-09T02:00:00.000Z",
            "value": 24.909
          },
          {
            "time": "2026-05-10T02:00:00.000Z",
            "value": 24.938
          },
          {
            "time": "2026-05-11T02:00:00.000Z",
            "value": 24.969
          },
          {
            "time": "2026-05-12T02:00:00.000Z",
            "value": 25.01
          },
          {
            "time": "2026-05-13T02:00:00.000Z",
            "value": 25.063
          },
          {
            "time": "2026-05-14T02:00:00.000Z",
            "value": 25.133
          },
          {
            "time": "2026-05-15T02:00:00.000Z",
            "value": 25.221
          },
          {
            "time": "2026-05-16T02:00:00.000Z",
            "value": 25.325
          },
          {
            "time": "2026-05-17T02:00:00.000Z",
            "value": 25.443
          },
          {
            "time": "2026-05-18T02:00:00.000Z",
            "value": 25.572
          },
          {
            "time": "2026-05-19T02:00:00.000Z",
            "value": 25.705
          },
          {
            "time": "2026-05-20T02:00:00.000Z",
            "value": 25.838
          },
          {
            "time": "2026-05-21T02:00:00.000Z",
            "value": 25.964
          },
          {
            "time": "2026-05-22T02:00:00.000Z",
            "value": 26.079
          },
          {
            "time": "2026-05-23T02:00:00.000Z",
            "value": 26.178
          },
          {
            "time": "2026-05-24T02:00:00.000Z",
            "value": 26.26
          },
          {
            "time": "2026-05-25T02:00:00.000Z",
            "value": 26.325
          },
          {
            "time": "2026-05-26T02:00:00.000Z",
            "value": 26.374
          },
          {
            "time": "2026-05-27T02:00:00.000Z",
            "value": 26.411
          },
          {
            "time": "2026-05-28T02:00:00.000Z",
            "value": 26.441
          },
          {
            "time": "2026-05-29T02:00:00.000Z",
            "value": 26.47
          }
        ],
        "historyStatus": "latest-plus-change",
        "sourceLabel": "TrendForce NAND Flash Contract Price",
        "sourceUrl": "https://www.trendforce.com.tw/price/flash/pcc_oem_ssd_contract",
        "sourceAsOf": "2026-05-29T02:00:00.000Z",
        "checkedAt": "2026-07-25T09:21:47.824Z"
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
            "time": "2026-04-27T20:00:00.000Z",
            "value": 102.63
          },
          {
            "time": "2026-04-28T20:00:00.000Z",
            "value": 101.17
          },
          {
            "time": "2026-04-29T20:00:00.000Z",
            "value": 102.73
          },
          {
            "time": "2026-04-30T20:00:00.000Z",
            "value": 102.48
          },
          {
            "time": "2026-05-01T20:00:00.000Z",
            "value": 104.39
          },
          {
            "time": "2026-05-04T20:00:00.000Z",
            "value": 112.38
          },
          {
            "time": "2026-05-05T20:00:00.000Z",
            "value": 120.63
          },
          {
            "time": "2026-05-06T20:00:00.000Z",
            "value": 126.74
          },
          {
            "time": "2026-05-07T20:00:00.000Z",
            "value": 127.19
          },
          {
            "time": "2026-05-08T20:00:00.000Z",
            "value": 134.43
          },
          {
            "time": "2026-05-11T20:00:00.000Z",
            "value": 145.87
          },
          {
            "time": "2026-05-12T20:00:00.000Z",
            "value": 141.44
          },
          {
            "time": "2026-05-13T20:00:00.000Z",
            "value": 148.68
          },
          {
            "time": "2026-05-14T20:00:00.000Z",
            "value": 147.78
          },
          {
            "time": "2026-05-15T20:00:00.000Z",
            "value": 137.45
          },
          {
            "time": "2026-05-18T20:00:00.000Z",
            "value": 135.84
          },
          {
            "time": "2026-05-19T20:00:00.000Z",
            "value": 133.36
          },
          {
            "time": "2026-05-20T20:00:00.000Z",
            "value": 135.53
          },
          {
            "time": "2026-05-21T20:00:00.000Z",
            "value": 146.25
          },
          {
            "time": "2026-05-22T20:00:00.000Z",
            "value": 144.91
          },
          {
            "time": "2026-05-26T20:00:00.000Z",
            "value": 158.8
          },
          {
            "time": "2026-05-27T20:00:00.000Z",
            "value": 167.6
          },
          {
            "time": "2026-05-28T20:00:00.000Z",
            "value": 168.07
          },
          {
            "time": "2026-05-29T20:00:00.000Z",
            "value": 173.92
          },
          {
            "time": "2026-06-01T20:00:00.000Z",
            "value": 182.08
          },
          {
            "time": "2026-06-02T20:00:00.000Z",
            "value": 185.2
          },
          {
            "time": "2026-06-03T20:00:00.000Z",
            "value": 192.1
          },
          {
            "time": "2026-06-04T20:00:00.000Z",
            "value": 178.61
          },
          {
            "time": "2026-06-05T20:00:00.000Z",
            "value": 159.82
          },
          {
            "time": "2026-06-08T20:00:00.000Z",
            "value": 157.41
          },
          {
            "time": "2026-06-09T20:00:00.000Z",
            "value": 168.23
          },
          {
            "time": "2026-06-10T20:00:00.000Z",
            "value": 157.88
          },
          {
            "time": "2026-06-11T20:00:00.000Z",
            "value": 166.54
          },
          {
            "time": "2026-06-12T20:00:00.000Z",
            "value": 170.17
          },
          {
            "time": "2026-06-15T20:00:00.000Z",
            "value": 184.53
          },
          {
            "time": "2026-06-16T20:00:00.000Z",
            "value": 184.59
          },
          {
            "time": "2026-06-17T20:00:00.000Z",
            "value": 191.38
          },
          {
            "time": "2026-06-18T20:00:00.000Z",
            "value": 204.32
          },
          {
            "time": "2026-06-19T20:00:00.000Z",
            "value": 203.81
          },
          {
            "time": "2026-06-22T20:00:00.000Z",
            "value": 215.16
          },
          {
            "time": "2026-06-23T20:00:00.000Z",
            "value": 188.6
          },
          {
            "time": "2026-06-24T20:00:00.000Z",
            "value": 192.56
          },
          {
            "time": "2026-06-25T20:00:00.000Z",
            "value": 214.26
          },
          {
            "time": "2026-06-26T20:00:00.000Z",
            "value": 197.77
          },
          {
            "time": "2026-06-29T20:00:00.000Z",
            "value": 197.29
          },
          {
            "time": "2026-06-30T20:00:00.000Z",
            "value": 199.19
          },
          {
            "time": "2026-07-01T20:00:00.000Z",
            "value": 186.17
          },
          {
            "time": "2026-07-02T20:00:00.000Z",
            "value": 167.03
          },
          {
            "time": "2026-07-03T20:00:00.000Z",
            "value": 178.64
          },
          {
            "time": "2026-07-06T20:00:00.000Z",
            "value": 176.32
          },
          {
            "time": "2026-07-07T20:00:00.000Z",
            "value": 165.93
          },
          {
            "time": "2026-07-08T20:00:00.000Z",
            "value": 161.46
          },
          {
            "time": "2026-07-09T20:00:00.000Z",
            "value": 168.23
          },
          {
            "time": "2026-07-10T20:00:00.000Z",
            "value": 168.04
          },
          {
            "time": "2026-07-13T20:00:00.000Z",
            "value": 151.59
          },
          {
            "time": "2026-07-14T20:00:00.000Z",
            "value": 157.48
          },
          {
            "time": "2026-07-15T20:00:00.000Z",
            "value": 158.2
          },
          {
            "time": "2026-07-16T20:00:00.000Z",
            "value": 144.21
          },
          {
            "time": "2026-07-17T20:00:00.000Z",
            "value": 151.66
          },
          {
            "time": "2026-07-20T20:00:00.000Z",
            "value": 142.04
          },
          {
            "time": "2026-07-21T20:00:00.000Z",
            "value": 153.6
          },
          {
            "time": "2026-07-22T20:00:00.000Z",
            "value": 153.06
          },
          {
            "time": "2026-07-23T20:00:00.000Z",
            "value": 158.62
          },
          {
            "time": "2026-07-24T20:00:00.000Z",
            "value": 146.58
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
            "time": "2026-06-25T10:10:00.000Z",
            "value": 100,
            "rawValue": 40.699
          },
          {
            "time": "2026-06-26T10:10:00.000Z",
            "value": 100.24,
            "rawValue": 40.796
          },
          {
            "time": "2026-06-27T10:10:00.000Z",
            "value": 100.45,
            "rawValue": 40.884
          },
          {
            "time": "2026-06-28T10:10:00.000Z",
            "value": 100.63,
            "rawValue": 40.955
          },
          {
            "time": "2026-06-29T10:10:00.000Z",
            "value": 100.75,
            "rawValue": 41.004
          },
          {
            "time": "2026-06-30T10:10:00.000Z",
            "value": 100.8,
            "rawValue": 41.026
          },
          {
            "time": "2026-07-01T10:10:00.000Z",
            "value": 100.79,
            "rawValue": 41.02
          },
          {
            "time": "2026-07-02T10:10:00.000Z",
            "value": 100.72,
            "rawValue": 40.991
          },
          {
            "time": "2026-07-03T10:10:00.000Z",
            "value": 100.59,
            "rawValue": 40.941
          },
          {
            "time": "2026-07-04T10:10:00.000Z",
            "value": 100.44,
            "rawValue": 40.879
          },
          {
            "time": "2026-07-05T10:10:00.000Z",
            "value": 100.28,
            "rawValue": 40.813
          },
          {
            "time": "2026-07-06T10:10:00.000Z",
            "value": 100.13,
            "rawValue": 40.753
          },
          {
            "time": "2026-07-07T10:10:00.000Z",
            "value": 100.02,
            "rawValue": 40.706
          },
          {
            "time": "2026-07-08T10:10:00.000Z",
            "value": 99.95,
            "rawValue": 40.679
          },
          {
            "time": "2026-07-09T10:10:00.000Z",
            "value": 99.95,
            "rawValue": 40.678
          },
          {
            "time": "2026-07-10T10:10:00.000Z",
            "value": 100.01,
            "rawValue": 40.704
          },
          {
            "time": "2026-07-11T10:10:00.000Z",
            "value": 100.14,
            "rawValue": 40.756
          },
          {
            "time": "2026-07-12T10:10:00.000Z",
            "value": 100.32,
            "rawValue": 40.831
          },
          {
            "time": "2026-07-13T10:10:00.000Z",
            "value": 100.54,
            "rawValue": 40.92
          },
          {
            "time": "2026-07-14T10:10:00.000Z",
            "value": 100.78,
            "rawValue": 41.018
          },
          {
            "time": "2026-07-15T10:10:00.000Z",
            "value": 101.02,
            "rawValue": 41.114
          },
          {
            "time": "2026-07-16T10:10:00.000Z",
            "value": 101.23,
            "rawValue": 41.2
          },
          {
            "time": "2026-07-17T10:10:00.000Z",
            "value": 101.4,
            "rawValue": 41.268
          },
          {
            "time": "2026-07-18T10:10:00.000Z",
            "value": 101.51,
            "rawValue": 41.313
          },
          {
            "time": "2026-07-19T10:10:00.000Z",
            "value": 101.55,
            "rawValue": 41.331
          },
          {
            "time": "2026-07-20T10:10:00.000Z",
            "value": 101.53,
            "rawValue": 41.322
          },
          {
            "time": "2026-07-21T10:10:00.000Z",
            "value": 101.45,
            "rawValue": 41.288
          },
          {
            "time": "2026-07-22T10:10:00.000Z",
            "value": 101.32,
            "rawValue": 41.237
          },
          {
            "time": "2026-07-23T10:10:00.000Z",
            "value": 101.16,
            "rawValue": 41.173
          },
          {
            "time": "2026-07-24T10:10:00.000Z",
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
            "time": "2026-04-30T02:00:00.000Z",
            "value": 100,
            "rawValue": 24.157
          },
          {
            "time": "2026-05-01T02:00:00.000Z",
            "value": 100.55,
            "rawValue": 24.291
          },
          {
            "time": "2026-05-02T02:00:00.000Z",
            "value": 101.08,
            "rawValue": 24.418
          },
          {
            "time": "2026-05-03T02:00:00.000Z",
            "value": 101.56,
            "rawValue": 24.534
          },
          {
            "time": "2026-05-04T02:00:00.000Z",
            "value": 101.98,
            "rawValue": 24.636
          },
          {
            "time": "2026-05-05T02:00:00.000Z",
            "value": 102.33,
            "rawValue": 24.721
          },
          {
            "time": "2026-05-06T02:00:00.000Z",
            "value": 102.61,
            "rawValue": 24.788
          },
          {
            "time": "2026-05-07T02:00:00.000Z",
            "value": 102.83,
            "rawValue": 24.84
          },
          {
            "time": "2026-05-08T02:00:00.000Z",
            "value": 102.99,
            "rawValue": 24.879
          },
          {
            "time": "2026-05-09T02:00:00.000Z",
            "value": 103.11,
            "rawValue": 24.909
          },
          {
            "time": "2026-05-10T02:00:00.000Z",
            "value": 103.23,
            "rawValue": 24.938
          },
          {
            "time": "2026-05-11T02:00:00.000Z",
            "value": 103.36,
            "rawValue": 24.969
          },
          {
            "time": "2026-05-12T02:00:00.000Z",
            "value": 103.53,
            "rawValue": 25.01
          },
          {
            "time": "2026-05-13T02:00:00.000Z",
            "value": 103.75,
            "rawValue": 25.063
          },
          {
            "time": "2026-05-14T02:00:00.000Z",
            "value": 104.04,
            "rawValue": 25.133
          },
          {
            "time": "2026-05-15T02:00:00.000Z",
            "value": 104.4,
            "rawValue": 25.221
          },
          {
            "time": "2026-05-16T02:00:00.000Z",
            "value": 104.84,
            "rawValue": 25.325
          },
          {
            "time": "2026-05-17T02:00:00.000Z",
            "value": 105.32,
            "rawValue": 25.443
          },
          {
            "time": "2026-05-18T02:00:00.000Z",
            "value": 105.86,
            "rawValue": 25.572
          },
          {
            "time": "2026-05-19T02:00:00.000Z",
            "value": 106.41,
            "rawValue": 25.705
          },
          {
            "time": "2026-05-20T02:00:00.000Z",
            "value": 106.96,
            "rawValue": 25.838
          },
          {
            "time": "2026-05-21T02:00:00.000Z",
            "value": 107.48,
            "rawValue": 25.964
          },
          {
            "time": "2026-05-22T02:00:00.000Z",
            "value": 107.96,
            "rawValue": 26.079
          },
          {
            "time": "2026-05-23T02:00:00.000Z",
            "value": 108.37,
            "rawValue": 26.178
          },
          {
            "time": "2026-05-24T02:00:00.000Z",
            "value": 108.71,
            "rawValue": 26.26
          },
          {
            "time": "2026-05-25T02:00:00.000Z",
            "value": 108.97,
            "rawValue": 26.325
          },
          {
            "time": "2026-05-26T02:00:00.000Z",
            "value": 109.18,
            "rawValue": 26.374
          },
          {
            "time": "2026-05-27T02:00:00.000Z",
            "value": 109.33,
            "rawValue": 26.411
          },
          {
            "time": "2026-05-28T02:00:00.000Z",
            "value": 109.45,
            "rawValue": 26.441
          },
          {
            "time": "2026-05-29T02:00:00.000Z",
            "value": 109.57,
            "rawValue": 26.47
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
        "body": "HBM/記憶體供應商代理 20 日 -25.88%；若 TrendForce 價格仍強，代表股價可能先反映週期高點或估值壓力。",
        "score": 100,
        "severity": "high",
        "tone": "down",
        "metric": "20日 -25.88% / 5日 -3.35%",
        "meaning": "股價領先價格轉弱，偏向見頂警示。",
        "sourceLabel": "Yahoo Finance supplier basket",
        "sourceUrl": "https://finance.yahoo.com/",
        "asOf": "2026-07-24T20:00:00.000Z"
      }
    ],
    "sources": [
      {
        "id": "trendforce-hbm-bulletin",
        "label": "TrendForce HBM Market Bulletin",
        "url": "https://www.trendforce.com/research/download/RP260513PF3",
        "status": "pass",
        "checkedAt": "2026-07-25T09:21:47.824Z",
        "sourceAsOf": "2026-05-12T16:00:00.000Z",
        "note": "Monthly HBM bulletin; public page shows highlights, full PDF requires purchase or membership"
      },
      {
        "id": "trendforce-dram-spot",
        "label": "TrendForce DRAM Spot Price",
        "url": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "status": "pass",
        "checkedAt": "2026-07-25T09:21:47.824Z",
        "sourceAsOf": "2026-07-24T10:10:00.000Z",
        "note": "TrendForce public price table"
      },
      {
        "id": "trendforce-dram-contract",
        "label": "TrendForce DRAM Contract Price",
        "url": "https://www.trendforce.com.tw/price/dram/mobileDram_contract",
        "status": "pass",
        "checkedAt": "2026-07-25T09:21:47.824Z",
        "sourceAsOf": "2026-05-29T07:00:00.000Z",
        "note": "TrendForce public price table"
      },
      {
        "id": "trendforce-nand-contract",
        "label": "TrendForce NAND Flash Contract Price",
        "url": "https://www.trendforce.com.tw/price/flash/pcc_oem_ssd_contract",
        "status": "pass",
        "checkedAt": "2026-07-25T09:21:47.824Z",
        "sourceAsOf": "2026-05-29T02:00:00.000Z",
        "note": "TrendForce public price table"
      },
      {
        "id": "trendforce-memory-wall",
        "label": "TrendForce Memory Wall Insight",
        "url": "https://www.trendforce.com.tw/insights/memory-wall",
        "status": "pass",
        "checkedAt": "2026-07-25T09:21:47.824Z",
        "sourceAsOf": "2026-01-15T16:00:00.000Z",
        "note": "HBM / DDR5 / AI inference chain thesis"
      },
      {
        "id": "trendforce-2q26-price-forecast",
        "label": "TrendForce 2Q26 Memory Price Forecast",
        "url": "https://www.trendforce.com/presscenter/news/20260331-12995.html",
        "status": "pass",
        "checkedAt": "2026-07-25T09:21:47.824Z",
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
