import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = path.join(ROOT, "data", "market-snapshot.json");
const SOURCE_LINKS = {
  vixCboe: "https://www.cboe.com/tradable_products/vix/vix_historical_data/",
  vixFred: "https://fred.stlouisfed.org/series/VIXCLS",
  sp500: "https://fred.stlouisfed.org/series/SP500",
  hyOas: "https://fred.stlouisfed.org/series/BAMLH0A0HYM2",
  igOas: "https://fred.stlouisfed.org/series/BAMLC0A0CM",
  dollar: "https://fred.stlouisfed.org/series/DTWEXBGS",
  nfci: "https://fred.stlouisfed.org/series/NFCI",
  stlfsi: "https://fred.stlouisfed.org/series/STLFSI4",
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
  stlfsi: ["STLFSI4", "STLFSI4"]
};

const YAHOO_SYMBOLS = ["SPY", "RSP", "HYG", "JNK", "LQD", "UUP", "XLF", "KRE"];
const rows = {};
const metrics = {};
const sources = [];

function logSource(label, status, message, url, code = "--") {
  sources.push({ label, status, message, url, code });
}

async function fetchText(url, label) {
  const started = performance.now();
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        "Accept": "text/html,application/json,text/csv,text/plain,*/*"
      }
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText} · ${text.slice(0, 160)}`);
    }
    logSource(label, "success", `${res.status} ${res.statusText || "OK"} · ${Math.round(performance.now() - started)}ms`, url, res.status);
    return text;
  } catch (error) {
    logSource(label, "failed", error.message, url, "FETCH_FAILED");
    throw error;
  }
}

function parseSimpleCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
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

function parseCboeVixRows(text) {
  return parseSimpleCsv(text)
    .map((row) => {
      const [m, d, y] = row.DATE.split("/");
      return {
        date: `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
        value: Number(row.CLOSE)
      };
    })
    .filter((row) => row.date && Number.isFinite(row.value))
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

async function loadFredSeries() {
  await Promise.all(Object.entries(FRED_SERIES).map(async ([key, [seriesId, label]]) => {
    const text = await fetchText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`, label);
    rows[key] = parseFredRows(text, seriesId);
  }));
}

async function loadCboeVix() {
  const text = await fetchText("https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv", "Cboe VIX CSV");
  rows.vixCboe = parseCboeVixRows(text);
}

async function loadYahooSymbol(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`;
  const text = await fetchText(url, `Yahoo ${symbol}`);
  const data = JSON.parse(text);
  const result = data.chart?.result?.[0];
  const times = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  rows[`y_${symbol}`] = times.map((time, i) => ({
    date: new Date(time * 1000).toISOString().slice(0, 10),
    value: Number(closes[i])
  })).filter((row) => row.date && Number.isFinite(row.value));
}

async function loadYahooSeries() {
  await Promise.all(YAHOO_SYMBOLS.map((symbol) => loadYahooSymbol(symbol)));
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

await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
await Promise.allSettled([
  loadCboeVix(),
  loadFredSeries(),
  loadYahooSeries(),
  loadCboePutCall(),
  loadAaii(),
  loadCnnFearGreed()
]);

const snapshot = {
  generatedAt: new Date().toISOString(),
  rows,
  metrics,
  sources
};

await fs.writeFile(OUT_FILE, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`Wrote ${OUT_FILE}`);
