'use strict';
const http = require('http');
const db = require('./models');
const { closeSignal } = require('./api/signalsController');
const autoMetrics = { cacheHits: 0, cacheMisses: 0, cacheStale: 0, fallbacks: 0 };
const DEBUG = ['1','true','yes','on'].includes(String(process.env.AUTOMATE_DEBUG||'').toLowerCase());
const automationCfg = { host: 'localhost', port: 3000 };

function httpGetJson(path) {
  return new Promise((resolve, reject) => {
    try {
      const req = http.request({ hostname: automationCfg.host, port: automationCfg.port, path, method: 'GET' }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk });
        res.on('end', () => {
          try { resolve(JSON.parse(data)) } catch(e){ reject(e) }
        });
      });
      req.on('error', reject);
      req.end();
    } catch(e) { reject(e) }
  });
}

async function fetchPrice(symbol, exchange) {
  const cachedUrl = `/api/cached-prices?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange || 'NSE')}`;
  let cj = null;
  try { cj = await httpGetJson(cachedUrl) } catch(e) { cj = null }
  if (cj && cj.success && typeof cj.price === 'number') {
    autoMetrics.cacheHits++;
    return cj.price;
  }
  if (cj && !cj.success && cj.error === 'stale') autoMetrics.cacheStale++;
  else autoMetrics.cacheMisses++;
  const url = `/api/price?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange || 'NSE')}`;
  const j = await httpGetJson(url);
  if (j && j.success && typeof j.price === 'number') {
    autoMetrics.fallbacks++;
    return j.price;
  }
  throw new Error('price_unavailable');
}

function shouldClose(signal, price) {
  const side = String(signal.signalType || '').toUpperCase();
  const entry = Number(signal.entry);
  const target = Number(signal.target);
  const stop = Number(signal.stopLoss);
  if (!Number.isFinite(entry) || !Number.isFinite(target) || !Number.isFinite(stop) || !Number.isFinite(price)) return false;
  if (side === 'BUY') {
    if (price >= target) return true;
    if (price <= stop) return true;
  } else if (side === 'SELL') {
    if (price <= target) return true;
    if (price >= stop) return true;
  }
  return false;
}

async function processOnce() {
  await db.sequelize.authenticate();
  const signals = await db.Signal.findAll({ where: { status: 'IN_PROGRESS' }, order: [['createdAt','ASC']] });
  let closed = 0;
  for (const s of signals) {
    const ex = (s.exchange || 'NSE');
    let price = NaN;
    try { price = await fetchPrice(String(s.symbol).trim(), String(ex).trim()) } catch(e){ console.log('price_fetch_failed', s.id, s.symbol, ex, e.message) }
    if (DEBUG) {
      console.log('scan_signal', { id: s.id, symbol: s.symbol, exchange: ex, entry: s.entry, target: s.target, stopLoss: s.stopLoss, price });
    }
    if (!Number.isFinite(price)) continue;
    const ok = shouldClose(s, price);
    if (!ok) {
      if (DEBUG) {
        const side = String(s.signalType || '').toUpperCase();
        const reason = side === 'BUY'
          ? (price < s.target ? (price > s.stopLoss ? 'BUY_between_stop_target' : 'BUY_below_stop_should_close') : 'BUY_above_target_should_close')
          : (price > s.target ? (price < s.stopLoss ? 'SELL_between_target_stop' : 'SELL_above_stop_should_close') : 'SELL_below_target_should_close');
        console.log('skip_no_close', { id: s.id, symbol: s.symbol, price, target: s.target, stopLoss: s.stopLoss, side, reason });
      }
      continue;
    }
    try {
      const r = await closeSignal(s.id, price, 'auto-close');
      if (r) { closed++; console.log('auto_closed', { id: s.id, symbol: s.symbol, exitPrice: price, status: r.status, profitLoss: r.profitLoss }) }
    } catch(e){ console.log('close_failed', s.id, e.message) }
  }
  console.log('run_complete', { scanned: signals.length, closed, cache: autoMetrics });
}

let intervalHandle = null;
let running = false;

async function start(opts = {}) {
  automationCfg.host = opts.host || 'localhost';
  automationCfg.port = Number(opts.port || process.env.PORT || 3000);
  const intervalMs = parseInt(process.env.AUTOMATE_INTERVAL_MS || String(opts.intervalMs || '0'), 10);
  if (intervalMs > 0) {
    if (intervalHandle) return;
    console.log('automate_loop_start', { intervalMs });
    intervalHandle = setInterval(() => {
      if (running) return;
      running = true;
      processOnce().catch(e => { console.log('run_error', e && e.message) }).finally(() => { running = false });
    }, intervalMs);
  } else {
    await processOnce();
  }
}

function stop(){
  if (intervalHandle) { clearInterval(intervalHandle); intervalHandle = null }
}

if (require.main === module) {
  start().then(() => {
    const intervalMs = parseInt(process.env.AUTOMATE_INTERVAL_MS || '0', 10);
    if (!intervalHandle && intervalMs === 0) process.exit(0);
  }).catch(e => { console.error(e); process.exit(1) })
}

module.exports = { start, stop };
