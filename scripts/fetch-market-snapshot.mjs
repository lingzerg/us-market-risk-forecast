import fs from "node:fs/promises";
import nodeFs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = path.join(ROOT, "data", "market-snapshot.json");
const INLINE_OUT_FILE = path.join(ROOT, "data", "market-snapshot.inline.js");
const SNAPSHOT_FILE_URL = "data/market-snapshot.json";
const LOCAL_ENV_FILE = path.join(ROOT, ".env.local");
function readLocalEnv(filePath) {
  try {
    const text = nodeFs.readFileSync(filePath, "utf8");
    const values = {};
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const split = line.indexOf("=");
      if (split <= 0) continue;
      const key = line.slice(0, split).trim();
      let value = line.slice(split + 1).trim();
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      values[key] = value;
    }
    return values;
  } catch {
    return {};
  }
}
const LOCAL_ENV = readLocalEnv(LOCAL_ENV_FILE);
const FRED_API_KEY = String(process.env.FRED_API_KEY || LOCAL_ENV.FRED_API_KEY || "").trim();
const FRED_API_BASE = "https://api.stlouisfed.org/fred";
const SOURCE_LINKS = {
  vixCboe: "https://www.cboe.com/tradable_products/vix/vix_historical_data/",
  vixFred: "https://fred.stlouisfed.org/series/VIXCLS",
  sp500: "https://fred.stlouisfed.org/series/SP500",
  hyOas: "https://fred.stlouisfed.org/series/BAMLH0A0HYM2",
  igOas: "https://fred.stlouisfed.org/series/BAMLC0A0CM",
  dollar: "https://fred.stlouisfed.org/series/DTWEXBGS",
  nfci: "https://fred.stlouisfed.org/series/NFCI",
  stlfsi: "https://fred.stlouisfed.org/series/STLFSI4",
  cpi: "https://fred.stlouisfed.org/series/CPIAUCSL",
  coreCpi: "https://fred.stlouisfed.org/series/CPILFESL",
  pce: "https://fred.stlouisfed.org/series/PCEPI",
  corePce: "https://fred.stlouisfed.org/series/PCEPILFE",
  payroll: "https://fred.stlouisfed.org/series/PAYEMS",
  unemployment: "https://fred.stlouisfed.org/series/UNRATE",
  cboeStats: "https://www.cboe.com/us/options/market_statistics/daily/",
  aaii: "https://www.aaii.com/sentimentsurvey",
  yahoo: "https://finance.yahoo.com/",
  cnn: "https://www.cnn.com/markets/fear-and-greed"
};

const FRED_SERIES = {
  vixFred: ["VIXCLS", "FRED VIX"],
  sp500: ["SP500", "S&P 500"],
  hyOas: ["BAMLH0A0HYM2", "HY OAS"],
  igOas: ["BAMLC0A0CM", "IG OAS"],
  dollar: ["DTWEXBGS", "广义美元"],
  nfci: ["NFCI", "NFCI"],
  stlfsi: ["STLFSI4", "STLFSI4"],
  cpi: ["CPIAUCSL", "CPI"],
  coreCpi: ["CPILFESL", "Core CPI"],
  pce: ["PCEPI", "PCE"],
  corePce: ["PCEPILFE", "Core PCE"],
  payroll: ["PAYEMS", "Nonfarm Payrolls"],
  unemployment: ["UNRATE", "Unemployment Rate"]
};

const YAHOO_SYMBOLS = ["SPY", "RSP", "HYG", "JNK", "LQD", "UUP", "XLF", "KRE"];
const OPTIONS_ACTIVITY_THRESHOLDS = {
  totalLow: 0.55,
  totalHigh: 1.05,
  equityLow: 0.45,
  equityHigh: 0.85,
  indexLow: 0.9,
  indexHigh: 1.8
};
const OPTIONS_NOTICE_TEMPLATES = [
  {
    id: "cpi",
    name: "CPI",
    seriesId: "CPIAUCSL",
    impact: "整体通胀读数，通常会直接影响利率预期和指数短线波动。",
    seriesSource: SOURCE_LINKS.cpi
  },
  {
    id: "coreCpi",
    name: "核心 CPI",
    seriesId: "CPILFESL",
    impact: "剔除食品和能源的粘性通胀，更影响中期政策预期。",
    seriesSource: SOURCE_LINKS.coreCpi
  },
  {
    id: "pce",
    name: "PCE",
    seriesId: "PCEPI",
    impact: "美联储重点参考口径之一，偏离预期时会带来利率与科技股波动。",
    seriesSource: SOURCE_LINKS.pce
  },
  {
    id: "corePce",
    name: "核心 PCE",
    seriesId: "PCEPILFE",
    impact: "FOMC 更关注的核心通胀口径，期权隐波常在发布前后抬升。",
    seriesSource: SOURCE_LINKS.corePce
  },
  {
    id: "payroll",
    name: "非农就业",
    seriesId: "PAYEMS",
    impact: "劳动市场热度的核心指标，常驱动美债收益率和指数方向切换。",
    seriesSource: SOURCE_LINKS.payroll
  },
  {
    id: "unemployment",
    name: "失业率",
    seriesId: "UNRATE",
    impact: "与非农同属就业报告，失业率意外上行会放大风险偏好变化。",
    seriesSource: SOURCE_LINKS.unemployment
  }
];
const FETCH_TIMEOUT_MS = Number.isFinite(Number(process.env.FETCH_TIMEOUT_MS))
  ? Math.max(3000, Number(process.env.FETCH_TIMEOUT_MS))
  : 20000;
const FETCH_RETRIES = Number.isFinite(Number(process.env.FETCH_RETRIES))
  ? Math.max(0, Math.floor(Number(process.env.FETCH_RETRIES)))
  : 2;
const FETCH_CONCURRENCY = Number.isFinite(Number(process.env.FETCH_CONCURRENCY))
  ? Math.max(1, Math.floor(Number(process.env.FETCH_CONCURRENCY)))
  : 5;
const MACRO_ROW_KEYS = ["cpi", "coreCpi", "pce", "corePce", "payroll", "unemployment"];
const MACRO_REFRESH_HOURS = Number.isFinite(Number(process.env.MACRO_REFRESH_HOURS))
  ? Math.max(1, Math.floor(Number(process.env.MACRO_REFRESH_HOURS)))
  : 24;

const REQUIRED_ROW_KEYS = [
  "vixCboe",
  ...Object.keys(FRED_SERIES),
  ...YAHOO_SYMBOLS.map((symbol) => `y_${symbol}`)
];
const STALE_METRIC_KEYS = ["putCall", "aaii", "cnnFearGreed", "optionsActivity", "optionsWatch"];
const OPTIONAL_SOURCE_MATCHERS = [/^CNN Fear & Greed/i, /^AAII Sentiment/i, /^Cboe Put\/Call/i, /^FRED Release /i];

const rows = {};
const metrics = {};
const sources = [];

function logSource(label, status, message, url, code = "--") {
  sources.push({ label, status, message, url, code });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
  return [408, 425, 429, 500, 502, 503, 504].includes(status);
}

function shouldRetry(error) {
  if (!error) return false;
  if (error.name === "AbortError") return true;
  if (Number.isFinite(error.status) && isRetryableStatus(error.status)) return true;
  const message = String(error.message || "");
  return /fetch failed|network|timeout|timed out|ECONNRESET|ENOTFOUND|EAI_AGAIN|socket|TLS|UND_ERR/i.test(message);
}

async function settleWithConcurrency(items, worker, limit = FETCH_CONCURRENCY) {
  const total = Array.isArray(items) ? items.length : 0;
  if (!total) return;
  const size = Math.max(1, Math.min(limit, total));
  let index = 0;
  const runners = Array.from({ length: size }, async () => {
    while (true) {
      const current = index;
      index += 1;
      if (current >= total) break;
      try {
        await worker(items[current], current);
      } catch {
        // Keep parity with Promise.allSettled.
      }
    }
  });
  await Promise.all(runners);
}

async function fetchText(url, label) {
  const started = performance.now();
  const attempts = FETCH_RETRIES + 1;
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
          "Accept": "text/html,application/json,text/csv,text/plain,*/*"
        }
      });
      const text = await res.text();
      if (!res.ok) {
        const error = new Error(`${res.status} ${res.statusText} · ${text.slice(0, 160)}`);
        error.status = res.status;
        throw error;
      }
      const retryHint = attempt > 1 ? ` · retry ${attempt - 1}` : "";
      logSource(
        label,
        "success",
        `${res.status} ${res.statusText || "OK"} · ${Math.round(performance.now() - started)}ms${retryHint}`,
        url,
        res.status
      );
      return text;
    } catch (error) {
      lastError = error;
      const retryable = shouldRetry(error);
      if (attempt < attempts && retryable) {
        await sleep(450 * attempt);
        continue;
      }
      const statusCode = Number.isFinite(error?.status) ? error.status : "FETCH_FAILED";
      const attemptHint = attempts > 1 ? ` · attempts ${attempt}/${attempts}` : "";
      logSource(label, "failed", `${error.message || "fetch failed"}${attemptHint}`, url, statusCode);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error("fetch failed");
}

function parseSimpleCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines.shift().split(",").map((h) => h.trim());
  return lines.map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, (cells[i] || "").trim()]));
  });
}

function parseFredRows(text, seriesId) {
  return parseSimpleCsv(text)
    .map((row) => ({ date: row.observation_date, value: Number(row[seriesId]) }))
    .filter((row) => row.date && Number.isFinite(row.value))
    .slice(-320);
}

function parseFredApiRows(text) {
  const payload = JSON.parse(text);
  const observations = Array.isArray(payload?.observations) ? payload.observations : [];
  return observations
    .map((row) => ({ date: row?.date, value: Number(row?.value) }))
    .filter((row) => row.date && Number.isFinite(row.value))
    .slice(-320);
}

function fredApiRequestUrl(endpoint, params = {}) {
  const search = new URLSearchParams({ ...params, file_type: "json" });
  if (FRED_API_KEY) search.set("api_key", FRED_API_KEY);
  return `${FRED_API_BASE}/${endpoint}?${search.toString()}`;
}

function fredApiUrl(seriesId) {
  return fredApiRequestUrl("series/observations", {
    series_id: seriesId,
    sort_order: "asc",
    limit: "100000"
  });
}

function parseCboeVixRows(text) {
  return parseSimpleCsv(text)
    .map((row) => {
      const [m, d, y] = (row.DATE || "").split("/");
      return {
        date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        value: Number(row.CLOSE)
      };
    })
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.value))
    .slice(-320);
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadFredSeries(options = {}) {
  const skipKeys = options.skipKeys instanceof Set ? options.skipKeys : new Set();
  const entries = Object.entries(FRED_SERIES).filter(([key]) => !skipKeys.has(key));
  await settleWithConcurrency(entries, async ([key, [seriesId, label]]) => {
    let loaded = false;
    if (FRED_API_KEY) {
      const apiUrl = fredApiUrl(seriesId);
      try {
        const text = await fetchText(apiUrl, `${label} (FRED API)`);
        const parsed = parseFredApiRows(text);
        if (!parsed.length) {
          logSource(`${label} (FRED API)`, "failed", "FRED API returned no numeric observations", apiUrl, "PARSE_FAILED");
        } else {
          rows[key] = parsed;
          loaded = true;
        }
      } catch {
        // The failed request has already been recorded by fetchText.
      }
    }
    if (loaded) return;
    try {
      const csvUrl = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`;
      const text = await fetchText(csvUrl, `${label} (FRED CSV)`);
      rows[key] = parseFredRows(text, seriesId);
    } catch {
      // The failed request has already been recorded by fetchText.
    }
  });
}

async function loadCboeVix() {
  const text = await fetchText("https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv", "Cboe VIX CSV");
  rows.vixCboe = parseCboeVixRows(text);
}

async function loadYahooSymbol(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d&events=history`;
  const text = await fetchText(url, `Yahoo ${symbol}`);
  const data = JSON.parse(text);
  const result = data.chart?.result?.[0];
  const times = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  rows[`y_${symbol}`] = times.map((time, i) => {
    const rawValue = closes[i];
    return {
      date: new Date(time * 1000).toISOString().slice(0, 10),
      value: typeof rawValue === "number" && Number.isFinite(rawValue) ? rawValue : null
    };
  }).filter((row) => row.date && Number.isFinite(row.value));
}

async function loadYahooSeries() {
  await settleWithConcurrency(YAHOO_SYMBOLS, async (symbol) => {
    await loadYahooSymbol(symbol);
  });
}

function buildOptionsActivityFromPutCall(putCall) {
  const total = Number(putCall?.total);
  const equity = Number(putCall?.equity);
  const index = Number(putCall?.index);
  if (![total, equity, index].some((value) => Number.isFinite(value))) return null;

  const alerts = [];
  const check = (label, value, low, high) => {
    if (!Number.isFinite(value)) return;
    if (value >= high) {
      alerts.push(`${label} ${value.toFixed(2)} 偏高，常见于避险/对冲需求上升。`);
      return;
    }
    if (value <= low) {
      alerts.push(`${label} ${value.toFixed(2)} 偏低，常见于投机情绪偏热。`);
    }
  };

  check("总 Put/Call", total, OPTIONS_ACTIVITY_THRESHOLDS.totalLow, OPTIONS_ACTIVITY_THRESHOLDS.totalHigh);
  check("Equity Put/Call", equity, OPTIONS_ACTIVITY_THRESHOLDS.equityLow, OPTIONS_ACTIVITY_THRESHOLDS.equityHigh);
  check("Index Put/Call", index, OPTIONS_ACTIVITY_THRESHOLDS.indexLow, OPTIONS_ACTIVITY_THRESHOLDS.indexHigh);

  return {
    mode: "aggregate",
    source: SOURCE_LINKS.cboeStats,
    values: { total, equity, index },
    thresholds: OPTIONS_ACTIVITY_THRESHOLDS,
    unusualCount: alerts.length,
    alerts
  };
}

function daysUntilDate(dateText) {
  if (!dateText) return null;
  const [y, m, d] = String(dateText).split("-").map((item) => Number(item));
  if (![y, m, d].every(Number.isFinite)) return null;
  const targetUtc = Date.UTC(y, m - 1, d);
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((targetUtc - todayUtc) / 86400000);
}

async function loadOptionsWatch() {
  const horizonDays = 14;
  const today = new Date().toISOString().slice(0, 10);
  if (!FRED_API_KEY) {
    metrics.optionsWatch = {
      generatedAt: new Date().toISOString(),
      horizonDays,
      source: "FRED release calendar",
      events: OPTIONS_NOTICE_TEMPLATES.map((template) => ({
        id: template.id,
        name: template.name,
        impact: template.impact,
        seriesId: template.seriesId,
        seriesSource: template.seriesSource,
        releaseId: null,
        releaseName: null,
        releaseSource: null,
        nextDate: null,
        daysUntil: null,
        withinTwoWeeks: false,
        note: "未配置 FRED_API_KEY，无法查询下一次发布日期。"
      }))
    };
    logSource("FRED Release Calendar", "failed", "FRED_API_KEY missing", "https://api.stlouisfed.org/fred", "API_KEY_MISSING");
    return;
  }
  const releaseMetaById = new Map();
  const releaseDateById = new Map();
  const releaseErrorById = new Map();
  const eventByTemplate = new Map();

  for (const template of OPTIONS_NOTICE_TEMPLATES) {
    const releaseUrl = fredApiRequestUrl("series/release", { series_id: template.seriesId });
    try {
      const text = await fetchText(releaseUrl, `FRED Release ${template.name}`);
      const payload = JSON.parse(text);
      const release = Array.isArray(payload?.releases) ? payload.releases[0] : null;
      const releaseId = Number(release?.id);
      if (!Number.isFinite(releaseId)) throw new Error("release id missing");
      const releaseLink = `https://fred.stlouisfed.org/release?rid=${releaseId}`;
      releaseMetaById.set(releaseId, {
        id: releaseId,
        name: release?.name || template.name,
        source: releaseLink
      });
      eventByTemplate.set(template.id, {
        ...template,
        releaseId
      });
    } catch (error) {
      eventByTemplate.set(template.id, {
        ...template,
        releaseId: null,
        note: `发布日历获取失败：${error.message || "unknown"}`
      });
    }
  }

  const releaseIds = [...releaseMetaById.keys()];
  for (const releaseId of releaseIds) {
    const releaseMeta = releaseMetaById.get(releaseId);
    const datesUrl = fredApiRequestUrl("release/dates", {
      release_id: String(releaseId),
      sort_order: "asc",
      include_release_dates_with_no_data: "true",
      limit: "4000"
    });
    try {
      const text = await fetchText(datesUrl, `FRED Release Dates ${releaseMeta?.name || releaseId}`);
      const payload = JSON.parse(text);
      const releaseDates = Array.isArray(payload?.release_dates) ? payload.release_dates : [];
      const next = releaseDates.find((item) => typeof item?.date === "string" && item.date >= today);
      releaseDateById.set(releaseId, next?.date || null);
    } catch (error) {
      releaseErrorById.set(releaseId, `发布日期获取失败：${error.message || "unknown"}`);
      releaseDateById.set(releaseId, null);
    }
  }

  const events = OPTIONS_NOTICE_TEMPLATES.map((template) => {
    const raw = eventByTemplate.get(template.id) || template;
    const releaseMeta = Number.isFinite(raw.releaseId) ? releaseMetaById.get(raw.releaseId) : null;
    const nextDate = Number.isFinite(raw.releaseId) ? releaseDateById.get(raw.releaseId) || null : null;
    const daysUntil = daysUntilDate(nextDate);
    const withinTwoWeeks = Number.isFinite(daysUntil) ? daysUntil >= 0 && daysUntil <= horizonDays : false;
    const errorNote = Number.isFinite(raw.releaseId) ? releaseErrorById.get(raw.releaseId) : null;
    return {
      id: raw.id,
      name: raw.name,
      impact: raw.impact,
      seriesId: raw.seriesId,
      seriesSource: raw.seriesSource,
      releaseId: Number.isFinite(raw.releaseId) ? raw.releaseId : null,
      releaseName: releaseMeta?.name || null,
      releaseSource: releaseMeta?.source || null,
      nextDate,
      daysUntil,
      withinTwoWeeks,
      note: raw.note || errorNote || null
    };
  });

  metrics.optionsWatch = {
    generatedAt: new Date().toISOString(),
    horizonDays,
    source: "FRED release calendar",
    events
  };
}

async function loadCboePutCall() {
  const html = await fetchText(SOURCE_LINKS.cboeStats, "Cboe Put/Call");
  const text = stripTags(html);
  const pick = (label) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = text.match(new RegExp(`${escaped}\\s+([0-9]+(?:\\.[0-9]+)?)`, "i"));
    return match ? Number(match[1]) : null;
  };
  metrics.putCall = {
    total: pick("TOTAL PUT/CALL RATIO"),
    equity: pick("EQUITY PUT/CALL RATIO"),
    index: pick("INDEX PUT/CALL RATIO"),
    source: SOURCE_LINKS.cboeStats
  };
}

async function loadAaii() {
  const html = await fetchText(SOURCE_LINKS.aaii, "AAII Sentiment");
  const text = stripTags(html);
  const section = text.match(/Week Ending Sentiment Votes Bullish Neutral Bearish ([\s\S]*?) Historical View/i)?.[1] || text;
  const latestMatch = section.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+([0-9.]+)%\s+([0-9.]+)%\s+([0-9.]+)%/);
  const avgMatch = text.match(/Historical Averages\s+([0-9.]+)%\s+([0-9.]+)%\s+([0-9.]+)%/);
  if (!latestMatch) throw new Error("AAII latest sentiment not found");
  metrics.aaii = {
    date: latestMatch[1],
    bullish: Number(latestMatch[2]),
    neutral: Number(latestMatch[3]),
    bearish: Number(latestMatch[4]),
    avgBullish: avgMatch ? Number(avgMatch[1]) : 37.5,
    avgNeutral: avgMatch ? Number(avgMatch[2]) : 31.5,
    avgBearish: avgMatch ? Number(avgMatch[3]) : 31.0,
    source: SOURCE_LINKS.aaii
  };
}

async function loadCnnFearGreed() {
  const endpoints = [
    "https://production.dataviz.cnn.io/index/fearandgreed/graphdata",
    SOURCE_LINKS.cnn
  ];
  let lastError;
  for (const url of endpoints) {
    try {
      const text = await fetchText(url, "CNN Fear & Greed");
      if (/teapot|bot/i.test(text)) throw new Error("CNN rejected automated request");
      const json = text.trim().startsWith("{") ? JSON.parse(text) : null;
      const value = json?.fear_and_greed?.score || json?.score;
      if (Number.isFinite(Number(value))) {
        metrics.cnnFearGreed = { value: Number(value), source: url };
        return;
      }
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("CNN Fear & Greed not found");
}

async function readPreviousSnapshot() {
  try {
    const text = await fs.readFile(OUT_FILE, "utf8");
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function isSnapshotFresh(snapshot, maxAgeHours = MACRO_REFRESH_HOURS) {
  const generatedAt = snapshot?.generatedAt;
  const generatedTs = Date.parse(String(generatedAt || ""));
  if (!Number.isFinite(generatedTs)) return false;
  return (Date.now() - generatedTs) <= maxAgeHours * 60 * 60 * 1000;
}

function preloadMacroRowsFromSnapshot(previousSnapshot) {
  const skipKeys = new Set();
  if (!isSnapshotFresh(previousSnapshot)) return skipKeys;
  const previousRows = previousSnapshot?.rows && typeof previousSnapshot.rows === "object"
    ? previousSnapshot.rows
    : {};
  for (const key of MACRO_ROW_KEYS) {
    const cachedRows = previousRows[key];
    if (!Array.isArray(cachedRows) || !cachedRows.length) continue;
    rows[key] = cachedRows;
    skipKeys.add(key);
    const [, label] = FRED_SERIES[key] || [key, key];
    const url = SOURCE_LINKS[key] || SNAPSHOT_FILE_URL;
    logSource(`${label} (Snapshot Cache)`, "success", `reuse cached macro rows from snapshot (${previousSnapshot.generatedAt})`, url, "SNAPSHOT_CACHE");
  }
  return skipKeys;
}

function applyFallbackFromPrevious(previousSnapshot) {
  if (!previousSnapshot || typeof previousSnapshot !== "object") return;
  const previousRows = previousSnapshot.rows && typeof previousSnapshot.rows === "object" ? previousSnapshot.rows : {};
  const previousMetrics = previousSnapshot.metrics && typeof previousSnapshot.metrics === "object" ? previousSnapshot.metrics : {};

  for (const key of REQUIRED_ROW_KEYS) {
    const hasFresh = Array.isArray(rows[key]) && rows[key].length > 0;
    const fallbackRows = previousRows[key];
    if (!hasFresh && Array.isArray(fallbackRows) && fallbackRows.length) {
      rows[key] = fallbackRows;
      logSource(`Fallback ${key}`, "success", "using previous snapshot rows", SNAPSHOT_FILE_URL, "FALLBACK");
    }
  }

  for (const key of STALE_METRIC_KEYS) {
    if (metrics[key]) continue;
    if (previousMetrics[key]) {
      metrics[key] = previousMetrics[key];
      logSource(`Fallback ${key}`, "success", "using previous snapshot metric", SNAPSHOT_FILE_URL, "FALLBACK");
    }
  }
}

function validateRows() {
  const minimumKeys = ["vixCboe", "y_SPY", "y_HYG", "y_JNK", "y_XLF", "y_KRE"];
  const hardMissing = minimumKeys.filter((key) => !Array.isArray(rows[key]) || !rows[key].length);
  if (hardMissing.length) {
    throw new Error(`Snapshot missing minimum rows: ${hardMissing.join(", ")}`);
  }
  const softMissing = REQUIRED_ROW_KEYS.filter((key) => !Array.isArray(rows[key]) || !rows[key].length);
  if (softMissing.length) {
    console.warn(`Snapshot warning: missing rows ${softMissing.join(", ")}`);
  }
}

function buildSourceHealth() {
  const done = sources.filter((item) => item.status === "success" || item.status === "failed");
  const summary = {
    core: { total: 0, success: 0, failed: 0, ratio: null },
    optional: { total: 0, success: 0, failed: 0, ratio: null }
  };
  for (const item of done) {
    const bucket = OPTIONAL_SOURCE_MATCHERS.some((matcher) => matcher.test(item.label)) ? "optional" : "core";
    summary[bucket].total += 1;
    if (item.status === "success") summary[bucket].success += 1;
    if (item.status === "failed") summary[bucket].failed += 1;
  }
  for (const bucket of ["core", "optional"]) {
    const total = summary[bucket].total;
    summary[bucket].ratio = total ? summary[bucket].success / total : null;
  }
  return summary;
}

const previousSnapshot = await readPreviousSnapshot();
const macroSkipKeys = preloadMacroRowsFromSnapshot(previousSnapshot);
await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });

await Promise.allSettled([
  loadCboeVix(),
  loadFredSeries({ skipKeys: macroSkipKeys }),
  loadYahooSeries(),
  loadCboePutCall(),
  loadOptionsWatch(),
  loadAaii(),
  loadCnnFearGreed()
]);

applyFallbackFromPrevious(previousSnapshot);
const builtOptionsActivity = buildOptionsActivityFromPutCall(metrics.putCall);
if (builtOptionsActivity) metrics.optionsActivity = builtOptionsActivity;
validateRows();

const snapshot = {
  generatedAt: new Date().toISOString(),
  health: buildSourceHealth(),
  metadata: {
    fredApiEnabled: Boolean(FRED_API_KEY)
  },
  rows,
  metrics,
  sources
};

await fs.writeFile(OUT_FILE, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
await fs.writeFile(INLINE_OUT_FILE, `globalThis.__MARKET_SNAPSHOT__ = ${JSON.stringify(snapshot)};\n`, "utf8");
console.log(`Wrote ${OUT_FILE}`);
console.log(`Wrote ${INLINE_OUT_FILE}`);
