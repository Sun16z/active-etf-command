export const macroRiskData = {
  "meta": {
    "generatedAt": "2026-05-28T19:35:49.434Z",
    "source": "us-market-radar macroRisk pipeline",
    "summary": {
      "score": 36.8,
      "label": "低壓力",
      "tone": "up",
      "meaning": "壓力尚低",
      "highest": "美國國債水位",
      "interpretation": "分數越高代表宏觀壓力、信用壓力或大資金防守越強；此區偏向提前示警，需搭配價格趨勢確認。"
    }
  },
  "macroRisk": {
    "generatedAt": "2026-05-28T19:35:49.434Z",
    "summary": {
      "score": 36.8,
      "label": "低壓力",
      "tone": "up",
      "meaning": "壓力尚低",
      "highest": "美國國債水位",
      "interpretation": "分數越高代表宏觀壓力、信用壓力或大資金防守越強；此區偏向提前示警，需搭配價格趨勢確認。"
    },
    "indicators": [
      {
        "id": "us-debt",
        "name": "美國國債水位",
        "category": "主權債務",
        "value": "$39.17T，約 30 交易日變化 +$201.2B",
        "score": 86.2,
        "label": "高壓力",
        "tone": "strong-down",
        "meaning": "宏觀壓力或大資金防守很強",
        "asOf": "2026-05-26",
        "checkedAt": "2026-05-28T19:35:49.433Z",
        "cadence": "每日或交易日更新",
        "sourceLabel": "U.S. Treasury FiscalData Debt to the Penny",
        "sourceUrl": "https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/debt-to-the-penny",
        "explain": "總債務水位與近期增加速度偏高時，利率、財政與市場估值壓力會升高。",
        "components": [
          {
            "label": "公眾持有債務",
            "value": "$31.45T"
          },
          {
            "label": "政府內部持有",
            "value": "$7.72T"
          }
        ]
      },
      {
        "id": "hy-oas",
        "name": "美國高收益信用利差",
        "category": "信貸風險",
        "value": "2.71% / 5期 -0.09 / 20期 -0.11",
        "score": 18,
        "label": "低壓力",
        "tone": "up",
        "meaning": "壓力尚低",
        "asOf": "2026-05-27",
        "checkedAt": "2026-05-28T19:35:49.198Z",
        "cadence": "每日，收盤資料",
        "sourceLabel": "FRED ICE BofA US High Yield OAS (BAMLH0A0HYM2)",
        "sourceUrl": "https://fred.stlouisfed.org/series/BAMLH0A0HYM2",
        "explain": "高收益債利差擴大代表市場要求更高違約風險補償，是股市轉弱常見前置信號之一。"
      },
      {
        "id": "nfci",
        "name": "芝加哥 Fed 金融條件",
        "category": "金融壓力",
        "value": "-0.51 / 5期 -0.03",
        "score": 15.1,
        "label": "低壓力",
        "tone": "up",
        "meaning": "壓力尚低",
        "asOf": "2026-05-22",
        "checkedAt": "2026-05-28T19:35:49.198Z",
        "cadence": "每週",
        "sourceLabel": "FRED Chicago Fed NFCI (NFCI)",
        "sourceUrl": "https://fred.stlouisfed.org/series/NFCI",
        "explain": "NFCI 高於常態代表金融條件收緊；由負值往上走代表壓力升溫。"
      },
      {
        "id": "stlfsi",
        "name": "聖路易 Fed 金融壓力",
        "category": "金融壓力",
        "value": "-0.76 / 5期 -0.01",
        "score": 7.6,
        "label": "低壓力",
        "tone": "up",
        "meaning": "壓力尚低",
        "asOf": "2026-05-22",
        "checkedAt": "2026-05-28T19:35:49.198Z",
        "cadence": "每週",
        "sourceLabel": "FRED St. Louis Fed FSI (STLFSI4)",
        "sourceUrl": "https://fred.stlouisfed.org/series/STLFSI4",
        "explain": "金融壓力指數上行代表市場資金、信用與利率壓力擴散。"
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
        "checkedAt": "2026-05-28T19:35:49.433Z",
        "cadence": "依來源更新",
        "sourceLabel": "資料不足，無法確認",
        "sourceUrl": null,
        "explain": "Berkshire SEC submissions HTTP 403"
      }
    ],
    "sourceHealth": {
      "parsed": 4,
      "total": 5
    }
  }
};
