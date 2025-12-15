# Price Controller

This document explains the complete logic implemented in `api/priceController.js`. It covers inputs, symbol normalization, candidate generation, data sources, caching, debugging, error handling, and the TradingView login flow.

## Overview
- Endpoint: `GET /api/price` resolves and returns a latest price for a given `symbol` and `exchange`.
- Sources:
  - TradingView V2 client (`@alandlguo/tradingview-api`) via `Session.Quote` [api/priceController.js:278]
  - TradingView adapter (`tradingview-api-adapter`) via `Quote` and `QuoteChannel` [api/priceController.js:132, 181]
- Behavior: Tries multiple series/exchange combinations (“candidates”) until a price is received or timeout occurs.
- Caching: Reads from in‑memory cache before querying external sources [api/priceController.js:92–110].
- Debug: Optional `debug=1` includes tried candidates, ticker alt feed, and data events in the response.

## Inputs
- Query parameters [api/priceController.js:53–67]
  - `symbol` (required): Ticker or option code (e.g., `INFY`, `INFY251216C1600`).
  - `exchange` (default `NSE`): Feed prefix used to build candidates.
  - `timeout`/`wait` (ms, default `3500`): Per‑candidate wait window.
  - `debug` (flag): Enables verbose candidate and event capture.

## Symbol Normalization
- TV‑style NSE options: If `exchange=='NSE'` and `symbol` matches `UNDERLYING YYMMDD C|P STRIKE`, it converts to `UNDERLYING DDMMMYY STRIKE CE|PE` and sets `feedExch='NFO'` [api/priceController.js:69–89].
- Spaced variant: Adds spaces before `STRIKE CE|PE` to try feeds that require spaces [api/priceController.js:90].
- Utility also exists to normalize keys and symbols for watchlist comparisons [api/priceController.js:15–33].

## Cache Read
- Looks up `lp` (last price) in `app.locals.priceCache` using `feedExch:symbol` [api/priceController.js:92–110].
- Special Binance case: If `USD` suffix misses, tries `USDT` [api/priceController.js:101–104].
- On hit: returns immediately with `source='cache:<seriesKey>'`.

## Candidate Generation
- Primary list (`candidates`) used by adapter `Quote` [api/priceController.js:207–232]:
  - `<symbol, feedExch>`, `feedExch:symbol`, `feedExch:spacedSymbol`.
  - If `feedExch=='BINANCE'`: also `USDT` variants.
  - Index fallback for `NIFTY/BANKNIFTY/FINNIFTY`: `INDEX`, `NSE:<symbol>` [api/priceController.js:216–221].
  - Case variations and NSE/NFO alternate prefixes including `nse_dly` [api/priceController.js:223–232].
- Secondary list (`tv2Candidates`) for TradingView V2 client [api/priceController.js:241–260]:
  - `feedExch:symbol`, `feedExch:spacedSymbol`, bare `symbol`.
  - Additional `nse_dly`, `NSE`, `NFO`, `INDEX`, `BSE` variants.
- Market search enrichment: Uses `TradingView.searchMarket` to append `id` candidates, with type hints derived from whether `symbol` looks like an option or a future [api/priceController.js:261–272].
- Alt feed discovery: Queries `TickerDetails` to detect alternative prefix (e.g., `nse_dly`) and appends candidates [api/priceController.js:113–126, 234–239].

## Quote Strategies
- TV2 client (`Session.Quote`): Tries each `tv2Candidates` entry sequentially [api/priceController.js:276–333].
  - Data hook extracts `lp/ask/bid` and responds on first `lp` [api/priceController.js:282–301].
  - Error hook examines `no_such_symbol` to trigger watchlist cleanup [api/priceController.js:303–315].
- Adapter `Quote`: Tries each `candidates` entry as `(series, exch)` [api/priceController.js:335–345].
  - Aggregates `lp` from `lp`, `trade.price`, `minute-bar.close`, `daily-bar.close`, `prev-daily-bar.close` [api/priceController.js:134–140].
  - Records `permission_denied` with `alternative` feed to expand candidates [api/priceController.js:156–163].
- Adapter `QuoteChannel`: Final fallback over combined keys such as `NSE:symbol`, `NFO:symbol`, `INDEX:symbol` [api/priceController.js:346–353, 179–205].

## Response
- On success: `{ success: true, symbol, exchange, price, source }` [api/priceController.js:165–173, 195–201, 291–300].
- On timeout: `504` with `{ success: false, error: 'timeout fetching price' }` [api/priceController.js:356–360].
- On internal error: `500` with message; includes `debug` if requested [api/priceController.js:361–365].

## Debug Mode
- Enable with `debug=1`.
- Captures:
  - `candidates`: tried series keys and exchanges [api/priceController.js:327–340].
  - `events`: per-source data points (`lp`, `ask`, `bid`, `alt`, `errmsg`, channel updates) [api/priceController.js:141–155, 187–191, 285–288].
  - `tickerAlt`: alternative prefix detected from `TickerDetails` [api/priceController.js:117–121].

## Side Effects
- Watchlist cleanup: If TV2 returns `no_such_symbol`, deletes matching watchlist rows for the input exchange/symbol to avoid repeated failures [api/priceController.js:303–315, 35–51].

## TradingView Login
- Endpoint: `POST /api/tradingview/login` [api/routes.js:73]
- Logic: Posts credentials to TradingView, extracts cookies (`tv_session`, `tv_signature`), stores in `process.env`, and refreshes `app.locals.tv.client`/`app.locals.tv.quote` so subsequent quotes use the authenticated session [api/priceController.js:370–408].
- Response: `{ success, token, signature }` or `401` on login failure.

## Configuration
- Environment variables read:
  - `TV_SESSION`, `TV_SIGNATURE` (or `TW_SESSION`, `TW_SIGNATURE`) for authenticated TV feed [api/priceController.js:7–11].
- Request options:
  - `timeout`/`wait` to tune per‑candidate wait window [api/priceController.js:66].
  - `source` (currently accepted and parsed but not used to force a specific strategy) [api/priceController.js:128–129].

## Typical Flow
1. Validate inputs and enable debug if requested.
2. Normalize NSE options to TV format, set `feedExch` (`NFO` for options from `NSE`).
3. Try cache; if hit, return immediately.
4. Query `TickerDetails` for potential alternative prefix.
5. Build candidate lists for both TV2 and adapter paths.
6. Attempt TV2 candidates; if any returns `lp`, respond.
7. Attempt adapter `Quote` candidates; if any returns `lp`, respond.
8. Attempt adapter `QuoteChannel` combined keys.
9. On miss, return 504 timeout with debug details if enabled.

## Production Notes
- For options: The controller internally converts NSE options and uses `feedExch='NFO'` while building candidates (this is separate from streaming exchange mapping). If you require `NSE` for a specific integration, adjust the `feedExch` logic at [api/priceController.js:69–89] and the candidate sets at [api/priceController.js:225–232, 250–255, 347].
- Ensure `TV_SESSION` and `TV_SIGNATURE` are set via `/api/tradingview/login` for NSE/NFO feeds to avoid `permission_denied` and `Market error` responses.
- Use `/admin/debug` to call `/api/price?debug=1` and inspect `candidates` and `events` for feed resolution issues.

## Example Requests
```sh
# Simple equity
curl 'http://localhost:3001/api/price?symbol=INFY&exchange=NSE'

# Option (raw)
curl 'http://localhost:3001/api/price?symbol=INFY251216C1600&exchange=NSE&debug=1'

# Index
curl 'http://localhost:3001/api/price?symbol=NIFTY&exchange=NSE&debug=1'
```
