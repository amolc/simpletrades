# StockAgent Single-Service Setup

## Start

- `npm start` starts the unified service (HTTP server + automation).
- `npm run start:auto` runs continuous automation with 10s interval.
- `npm run start:auto:fast` uses a 5s interval.
- `npm run start:once` runs a single automation pass on startup.

## Configuration

- `PORT`: HTTP port (default `3000`).
- `AUTOMATE_INTERVAL_MS`: automation loop interval in ms. Set `0` for single pass.
- `STREAM_SYMBOLS`: comma-separated initial stream subscriptions.
- `STREAM_CAP`: subscription cap to avoid provider rate limits.
- `CACHE_MAX_AGE_MS`: max age for cached prices (default `15000`).
- `CACHE_SCAN_INTERVAL_MS`: cache staleness scan interval (default `15000`).
- `CACHE_ALERT_GAP_MS`: min gap between staleness alerts (default `60000`).

## Endpoints

- `GET /api/cached-prices` returns fresh cached stream prices.
- `GET /api/price` external price fetch with cache fallback.
- `GET /api/cache/metrics` cache and price metrics.
- `GET /api/stream/subscriptions` active stream keys.

## Shutdown

- The service handles `SIGTERM`/`SIGINT` and stops the automation loop.
