// Static quarterly revenue snapshot. Amounts are in millions of each reporting currency.
// Sources and calculation bases are included for inspection; not part of the daily macro refresh.
globalThis.__SEMICONDUCTOR_REVENUE__ = {
  "asOf": "2026-10-14",
  "companies": [
    {
      "id": "asml",
      "name": "ASML 阿斯麦",
      "currency": "EUR",
      "unit": "亿欧元",
      "divisor": 100,
      "startYear": 2023,
      "startQuarter": 3,
      "fiscal": false,
      "note": "US GAAP 合并净销售额。最近八季为 2024 Q4—2026 Q3。",
      "revenues": [
        6673,
        7237,
        5290,
        6243,
        7467,
        9263,
        7742,
        7692,
        7516,
        9718,
        8767,
        9326,
        11662
      ],
      "ends": [
        "2023-09",
        "2023-12",
        "2024-03",
        "2024-06",
        "2024-09",
        "2024-12",
        "2025-03",
        "2025-06",
        "2025-09",
        "2025-12",
        "2026-03",
        "2026-06",
        "2026-09"
      ],
      "sourceRefs": [
        0,
        1,
        1,
        2,
        3,
        3,
        4,
        4,
        5,
        6,
        6,
        7,
        8
      ],
      "sources": [
        [
          "ASML 2023 Q3 官方公告",
          "https://investor.asml.com/news-releases/news-release-details/asml-reports-eu6.7-billion-net-sales-and-eu1.9-billion-net-income-q3-2023"
        ],
        [
          "ASML 2024 Q1 官方公告",
          "https://www.asml.com/news/press-releases/2024/q1-2024-financial-results"
        ],
        [
          "ASML 2024 Q2 官方公告",
          "https://investor.asml.com/news-releases/news-release-details/asml-reports-eu6.2-billion-total-net-sales-and-eu1.6-billion-net-income-q2-2024"
        ],
        [
          "ASML 2024 Q4 官方公告",
          "https://www.asml.com/news/press-releases/2025/q4-2024-financial-results"
        ],
        [
          "ASML 2025 Q2 官方公告",
          "https://investor.asml.com/news-releases/news-release-details/q2-2025-financial-results"
        ],
        [
          "ASML 2025 Q3 官方公告",
          "https://investor.asml.com/news-releases/news-release-details/q3-2025-financial-results"
        ],
        [
          "ASML 2026 Q1 官方公告",
          "https://investor.asml.com/news-releases/news-release-details/q1-2026-financial-results"
        ],
        [
          "ASML 2026 Q2 官方公告",
          "https://www.investor.asml.com/news-releases/news-release-details/q2-2026-financial-results"
        ],
        [
          "ASML 2026 Q3 公司新闻稿（GlobeNewswire）",
          "https://www.globenewswire.com/news-release/2026/10/14/3380319/0/en/asml-reports-11-7-billion-total-net-sales-and-5-0-billion-net-income-in-q3-2026.html"
        ]
      ]
    },
    {
      "id": "tsmc",
      "name": "TSMC 台积电",
      "currency": "TWD",
      "unit": "十亿新台币",
      "divisor": 1000,
      "startYear": 2023,
      "startQuarter": 2,
      "fiscal": false,
      "note": "IFRS 集团合并营收，以新台币计算增长率。采用最近八个正式季度财报，截止 2026 Q2；2026 Q3 月度营收汇总未混入本序列。",
      "revenues": [
        480841,
        546733,
        625529,
        592644,
        673510,
        759692,
        868461,
        839254,
        933792,
        989918,
        1046090,
        1134103,
        1270380
      ],
      "ends": [
        "2023-06",
        "2023-09",
        "2023-12",
        "2024-03",
        "2024-06",
        "2024-09",
        "2024-12",
        "2025-03",
        "2025-06",
        "2025-09",
        "2025-12",
        "2026-03",
        "2026-06"
      ],
      "sources": [
        [
          "Stock Analysis 季度财务表（历史序列）",
          "https://stockanalysis.com/stocks/tsm/financials/?p=quarterly"
        ],
        [
          "台积电 2026 Q2 官方报告（核对本季、上季及去年同期）",
          "https://investor.tsmc.com/schinese/encrypt/files/encrypt_file/reports/2026-07/6f49632674bd2d0fd48cb65aaf89ec6ab510b559/2Q26%20ManagementReport.pdf"
        ]
      ]
    },
    {
      "id": "nvidia",
      "name": "NVIDIA 英伟达",
      "currency": "USD",
      "unit": "亿美元",
      "divisor": 100,
      "startYear": 2024,
      "startQuarter": 2,
      "fiscal": true,
      "note": "US GAAP 合并营收；FY 为公司财年。FY2027 Q2 截止于 2026-07-26，并非自然年 2027 年。",
      "revenues": [
        13507,
        18120,
        22103,
        26044,
        30040,
        35082,
        39331,
        44062,
        46743,
        57006,
        68127,
        81615,
        96221
      ],
      "ends": [
        "2023-07",
        "2023-10",
        "2024-01",
        "2024-04",
        "2024-07",
        "2024-10",
        "2025-01",
        "2025-04",
        "2025-07",
        "2025-10",
        "2026-01",
        "2026-04",
        "2026-07"
      ],
      "sources": [
        [
          "Stock Analysis 季度财务表（历史序列）",
          "https://stockanalysis.com/stocks/nvda/financials/?p=quarterly"
        ],
        [
          "NVIDIA FY2027 Q2 官方公告（核对本季、上季及去年同期）",
          "https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-second-quarter-fiscal-2027"
        ],
        [
          "NVIDIA FY2026 Q4 官方公告（核对前三个历史季度）",
          "https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-fourth-quarter-and-fiscal-2026"
        ]
      ]
    },
    {
      "id": "micron",
      "name": "Micron 美光",
      "currency": "USD",
      "unit": "亿美元",
      "divisor": 100,
      "startYear": 2023,
      "startQuarter": 4,
      "fiscal": true,
      "note": "US GAAP 合并营收；FY 为公司财年。FY2026 Q4 截止于 2026-09-03，部分季度长短会受 52/53 周财年影响。",
      "revenues": [
        4010,
        4726,
        5824,
        6811,
        7750,
        8709,
        8053,
        9301,
        11315,
        13643,
        23860,
        41456,
        54229
      ],
      "ends": [
        "2023-08",
        "2023-11",
        "2024-02",
        "2024-05",
        "2024-08",
        "2024-11",
        "2025-02",
        "2025-05",
        "2025-08",
        "2025-11",
        "2026-02",
        "2026-05",
        "2026-09"
      ],
      "sources": [
        [
          "Stock Analysis 季度财务表（历史序列）",
          "https://stockanalysis.com/stocks/mu/financials/?p=quarterly"
        ],
        [
          "Micron FY2026 Q4 官方公告（核对本季、上季及去年同期）",
          "https://investors.micron.com/news/press-release/2026/Micron-Technology-Inc--Reports-Record-Fiscal-Fourth-Quarter-and-Full-Year-2026-Results/default.aspx"
        ],
        [
          "Micron 官方历季报告（2026 全年季度值）",
          "https://investors.micron.com/financials/quarterly-results/default.aspx?facet=app"
        ],
        [
          "Micron FY2025 Q2 官方公告（核对历史季度）",
          "https://investors.micron.com/news/press-release/2025/Micron-Technology-Inc--Reports-Results-for-the-Second-Quarter-of-Fiscal-2025-03-20-2025/default.aspx"
        ]
      ]
    },
    {
      "id": "hynix",
      "name": "SK hynix 海力士",
      "currency": "KRW",
      "unit": "万亿韩元",
      "divisor": 1000000,
      "startYear": 2023,
      "startQuarter": 2,
      "fiscal": false,
      "note": "K-IFRS 集团合并营收，包含 Solidigm；最近八个正式财报季度截止 2026 Q2。",
      "revenues": [
        7305932,
        9066171,
        11305505,
        12429598,
        16423258,
        17573069,
        19767035,
        17639141,
        22231952,
        24448929,
        32826653,
        52576287,
        79318746
      ],
      "ends": [
        "2023-06",
        "2023-09",
        "2023-12",
        "2024-03",
        "2024-06",
        "2024-09",
        "2024-12",
        "2025-03",
        "2025-06",
        "2025-09",
        "2025-12",
        "2026-03",
        "2026-06"
      ],
      "sources": [
        [
          "Stock Analysis 季度财务表（历史序列，百万韩元）",
          "https://stockanalysis.com/quote/krx/000660/financials/?p=quarterly"
        ],
        [
          "SK hynix 2026 Q2 官方公告（核对最近季度）",
          "https://news.skhynix.com/en/q2-2026-business-results/"
        ]
      ]
    },
    {
      "id": "samsung",
      "name": "Samsung 三星电子",
      "currency": "KRW",
      "unit": "万亿韩元",
      "divisor": 1000000,
      "startYear": 2023,
      "startQuarter": 2,
      "fiscal": false,
      "note": "三星电子集团合并营收，包含半导体、手机、家电等，并非单独的存储或 DS 部门营收。采用正式财报截至 2026 Q2；不混入 Q3 初步业绩指引。",
      "revenues": [
        60005533,
        67404652,
        67775494,
        71915601,
        74068302,
        79098731,
        75785302,
        79140503,
        74566317,
        86061747,
        93805938,
        133873444,
        171499470
      ],
      "ends": [
        "2023-06",
        "2023-09",
        "2023-12",
        "2024-03",
        "2024-06",
        "2024-09",
        "2024-12",
        "2025-03",
        "2025-06",
        "2025-09",
        "2025-12",
        "2026-03",
        "2026-06"
      ],
      "sources": [
        [
          "Stock Analysis 季度财务表（历史序列，百万韩元）",
          "https://stockanalysis.com/quote/krx/005930/financials/?p=quarterly"
        ],
        [
          "三星 2026 Q2 官方公告（核对最近季度）",
          "https://news.samsung.com/global/samsung-electronics-announces-second-quarter-2026-results"
        ]
      ]
    }
  ]
};
