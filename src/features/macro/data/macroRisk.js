export const macroRiskData = {
  "meta": {
    "generatedAt": "2026-06-14T01:46:51.108Z",
    "source": "us-market-radar macroRisk pipeline",
    "summary": {
      "score": null,
      "label": "資料不足",
      "tone": "neutral",
      "meaning": "資料不足",
      "highest": "NA",
      "interpretation": "分數越高代表宏觀壓力、信用壓力或大資金防守越強；此區偏向提前示警，需搭配價格趨勢確認。"
    }
  },
  "macroRisk": {
    "generatedAt": "2026-06-14T01:46:51.108Z",
    "summary": {
      "score": null,
      "label": "資料不足",
      "tone": "neutral",
      "meaning": "資料不足",
      "highest": "NA",
      "interpretation": "分數越高代表宏觀壓力、信用壓力或大資金防守越強；此區偏向提前示警，需搭配價格趨勢確認。"
    },
    "indicators": [
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
        "checkedAt": "2026-06-14T01:46:51.108Z",
        "cadence": "依來源更新",
        "sourceLabel": "資料不足，無法確認",
        "sourceUrl": null,
        "explain": "Berkshire SEC submissions HTTP 403"
      },
      {
        "id": "us-debt",
        "name": "美國國債水位",
        "category": "主權債務",
        "value": "資料抓取失敗",
        "score": null,
        "label": "資料不足",
        "tone": "neutral",
        "meaning": "資料不足",
        "asOf": null,
        "checkedAt": "2026-06-14T01:46:51.108Z",
        "cadence": "依來源更新",
        "sourceLabel": "資料不足，無法確認",
        "sourceUrl": null,
        "explain": "fetch failed"
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
        "checkedAt": "2026-06-14T01:46:51.108Z",
        "cadence": "依來源更新",
        "sourceLabel": "資料不足，無法確認",
        "sourceUrl": null,
        "explain": "This operation was aborted"
      }
    ],
    "sourceHealth": {
      "parsed": 0,
      "total": 3
    }
  }
};
