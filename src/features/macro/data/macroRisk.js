export const macroRiskData = {
  "meta": {
    "generatedAt": "2026-06-11T09:54:54.248Z",
    "source": "us-market-radar macroRisk pipeline",
    "summary": {
      "score": 91.5,
      "label": "高壓力",
      "tone": "strong-down",
      "meaning": "宏觀壓力或大資金防守很強",
      "highest": "美國國債水位",
      "interpretation": "分數越高代表宏觀壓力、信用壓力或大資金防守越強；此區偏向提前示警，需搭配價格趨勢確認。"
    }
  },
  "macroRisk": {
    "generatedAt": "2026-06-11T09:54:54.248Z",
    "summary": {
      "score": 91.5,
      "label": "高壓力",
      "tone": "strong-down",
      "meaning": "宏觀壓力或大資金防守很強",
      "highest": "美國國債水位",
      "interpretation": "分數越高代表宏觀壓力、信用壓力或大資金防守越強；此區偏向提前示警，需搭配價格趨勢確認。"
    },
    "indicators": [
      {
        "id": "us-debt",
        "name": "美國國債水位",
        "category": "主權債務",
        "value": "$39.24T，約 30 交易日變化 +$262.5B",
        "score": 91.5,
        "label": "高壓力",
        "tone": "strong-down",
        "meaning": "宏觀壓力或大資金防守很強",
        "asOf": "2026-06-09",
        "checkedAt": "2026-06-11T09:54:39.817Z",
        "cadence": "每日或交易日更新",
        "sourceLabel": "U.S. Treasury FiscalData Debt to the Penny",
        "sourceUrl": "https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/debt-to-the-penny",
        "explain": "總債務水位與近期增加速度偏高時，利率、財政與市場估值壓力會升高。",
        "components": [
          {
            "label": "公眾持有債務",
            "value": "$31.60T"
          },
          {
            "label": "政府內部持有",
            "value": "$7.65T"
          }
        ]
      },
      {
        "id": "berkshire-cash",
        "name": "巴菲特現金水位",
        "category": "大資金防守",
        "value": "資料抓取失敗",
        "score": null,
        "label": "資料不足",
        "tone": "neutral",
        "meaning": "資料不足",
        "asOf": null,
        "checkedAt": "2026-06-11T09:54:54.248Z",
        "cadence": "依來源更新",
        "sourceLabel": "資料不足，無法確認",
        "sourceUrl": null,
        "explain": "Berkshire SEC submissions HTTP 403"
      },
      {
        "id": "credit-stress",
        "name": "美國信貸風險",
        "category": "信貸風險",
        "value": "資料抓取失敗",
        "score": null,
        "label": "資料不足",
        "tone": "neutral",
        "meaning": "資料不足",
        "asOf": null,
        "checkedAt": "2026-06-11T09:54:54.248Z",
        "cadence": "依來源更新",
        "sourceLabel": "資料不足，無法確認",
        "sourceUrl": null,
        "explain": "This operation was aborted"
      }
    ],
    "sourceHealth": {
      "parsed": 1,
      "total": 3
    }
  }
};
