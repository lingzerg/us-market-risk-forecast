const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 8010);
const ROOT = __dirname;
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map();

const ALLOWED_HOSTS = new Set([
  "fred.stlouisfed.org",
  "cdn.cboe.com",
  "www.cboe.com",
  "www.aaii.com",
  "production.dataviz.cnn.io",
  "www.cnn.com",
  "query1.finance.yahoo.com",
  "finance.yahoo.com"
]);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(body);
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(ROOT, requestPath));
  if (!filePath.startsWith(ROOT)) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }
    const type = MIME[path.extname(filePath)] || "application/octet-stream";
    send(res, 200, data, { "Content-Type": type, "Cache-Control": "no-cache" });
  });
}

async function proxy(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const target = requestUrl.searchParams.get("url");
  if (!target) {
    send(res, 400, "Missing url", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    send(res, 400, "Invalid url", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    send(res, 403, `Host not allowed: ${parsed.hostname}`, { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const cached = cache.get(target);
  if (cached && Date.now() - cached.time < CACHE_MS) {
    send(res, 200, cached.body, { "Content-Type": cached.type, "X-Proxy-Cache": "hit" });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const upstream = await fetch(target, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        "Accept": "text/html,application/json,text/csv,text/plain,*/*"
      }
    });
    const body = await upstream.text();
    const type = upstream.headers.get("content-type") || "text/plain; charset=utf-8";
    if (!upstream.ok) {
      send(res, upstream.status, body || upstream.statusText, { "Content-Type": type });
      return;
    }
    cache.set(target, { body, type, time: Date.now() });
    send(res, 200, body, { "Content-Type": type, "X-Proxy-Cache": "miss" });
  } catch (error) {
    send(res, 502, `Proxy fetch failed: ${error.message}`, { "Content-Type": "text/plain; charset=utf-8" });
  } finally {
    clearTimeout(timeout);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    send(res, 200, JSON.stringify({
      ok: true,
      port: PORT,
      time: new Date().toISOString()
    }), { "Content-Type": "application/json; charset=utf-8" });
    return;
  }
  if (req.url.startsWith("/proxy?")) {
    proxy(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Market risk dashboard: http://localhost:${PORT}`);
});
