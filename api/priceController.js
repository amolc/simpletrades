const { TvApiAdapter } = require('tradingview-api-adapter')
const TradingView = require('@alandlguo/tradingview-api')

const adapter = new TvApiAdapter()
function createTvClient() {
  const token = process.env.TV_SESSION || process.env.TW_SESSION || ''
  const signature = process.env.TV_SIGNATURE || process.env.TW_SIGNATURE || ''
  const opts = { server: 'data' }
  if (token) opts.token = token
  if (signature) opts.signature = signature
  return new TradingView.Client(opts)
}

async function getQuote(req, res) {
  try {
    let symbol = (req.query.symbol || '').toUpperCase().trim()
    const exchange = (req.query.exchange || 'NSE').toUpperCase().trim()
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'symbol required' })
    }

    let responded = false
    const debugMode = (typeof req.query.debug !== 'undefined')
    const metrics = (req.app && req.app.locals) ? req.app.locals.metrics : null
    if (metrics) metrics.priceRequests = (metrics.priceRequests || 0) + 1
    try { console.log('API /price', { symbol, exchange, debugMode, query: req.query }) } catch(e){}
    const waitDefault = Number(req.query.timeout || req.query.wait || 3500)
    const debug = { candidates: [], tickerAlt: null, events: [] }

    const optMatch = symbol.match(/^([A-Z]+)(\d{2})(\d{2})(\d{2})([CP])(\d{2,6})$/)
    let feedExch = exchange
    let spacedSymbol = ''
    if (optMatch && exchange === 'NSE') {
      const u = optMatch[1]
      const yy = optMatch[2]
      const mm = optMatch[3]
      const dd = optMatch[4]
      const cp = optMatch[5]
      const strike = optMatch[6]
      const dt = new Date(`20${yy}-${mm}-${dd}`)
      const mmm = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][dt.getMonth()]
      const dd2 = String(dt.getDate()).padStart(2,'0')
      const yy2 = String(dt.getFullYear()).slice(-2)
      const suf = cp === 'P' ? 'PE' : 'CE'
      const tvSymbol = `${u}${dd2}${mmm}${yy2}${strike}${suf}`
      symbol = tvSymbol
      spacedSymbol = tvSymbol.replace(/(\d+)(CE|PE)$/,' $1 $2')
      feedExch = 'NFO'
    }
    if (!spacedSymbol) spacedSymbol = symbol.replace(/(\d+)(CE|PE)$/,' $1 $2')
    const seriesKey = `${feedExch}:${symbol}`
    const cacheMap = (req.app && req.app.locals) ? req.app.locals.priceCache : null
    const readCache = (key) => {
      if (!cacheMap) return null
      const c = cacheMap.get(key)
      if (!c) return null
      if (c.lp === undefined) return null
      return c
    }
    let cached = readCache(seriesKey)
    if (!cached && feedExch === 'BINANCE' && /USD$/.test(symbol)) {
      const usdtKey = `${feedExch}:${symbol.replace(/USD$/, 'USDT')}`
      cached = readCache(usdtKey)
    }
    if (cached) {
      responded = true
      const base = { success: true, symbol, exchange, price: Number(cached.lp), source: `cache:${seriesKey}` }
      if (debugMode) base.debug = debug
      if (metrics) metrics.priceCacheServed = (metrics.priceCacheServed || 0) + 1
      return res.json(base)
    }

    const resolveFeedPrefix = (sym, exch) => new Promise((resolve) => {
      try {
        const info = adapter.TickerDetails(sym, exch)
        info.ready((tm) => {
          const alt = tm && (tm.alternative || (tm.perms && tm.perms.rt && tm.perms.rt.prefix))
          if (debugMode) {
            debug.tickerAlt = alt || null
            try { console.log('TV TickerDetails', { symbol: sym, exchange: exch, alt }) } catch(e){}
          }
          resolve(alt || null)
        })
        setTimeout(() => resolve(null), 1200)
      } catch(e) { resolve(null) }
    })

    const source = String(req.query.source || '').toLowerCase()

    const tryQuote = (series, exch, waitMs = 3000) => new Promise((resolve) => {
      try {
        const s = adapter.Quote(series, exch, ['lp','trade','minute-bar','daily-bar','prev-daily-bar','ch','chp'])
        s.listen((data) => {
          const lp = data && (
            data.lp ??
            (data.trade && data.trade.price) ??
            (data['minute-bar'] && data['minute-bar'].close) ??
            (data['daily-bar'] && data['daily-bar'].close) ??
            (data['prev-daily-bar'] && data['prev-daily-bar'].close)
          )
          if (debugMode) {
            const ev = {
              series,
              exch,
              s: data && data.s,
              errmsg: data && data.errmsg,
              alt: data && data.v && data.v.alternative,
              lp,
              trade: data && data.trade && data.trade.price,
              minute: data && data['minute-bar'] && data['minute-bar'].close,
              daily: data && data['daily-bar'] && data['daily-bar'].close
            }
            debug.events.push(ev)
            try { console.log('TV Quote event', ev) } catch(e){}
          }
          if (data && data.s === 'permission_denied' && data.v && data.v.alternative) {
            const alt = data.v.alternative
            const exists = candidates.some(([ss, ee]) => ss === symbol && ee === alt)
            if (!exists) {
              candidates.push([symbol, alt])
              candidates.push([`${alt}:${symbol}`, undefined])
            }
          }
          if (!responded && lp !== undefined) {
            responded = true
            const priceNum = Number(lp)
            const base = { success: true, symbol, exchange, price: priceNum, source: `${exch||''}:${series}` }
            if (debugMode) base.debug = debug
            res.json(base)
            if (metrics) metrics.priceExternalServed = (metrics.priceExternalServed || 0) + 1
            if (s.close) try { s.close() } catch (e) {}
            resolve(true)
          }
        })
        setTimeout(() => { if (s.close) try { s.close() } catch (e) {}; resolve(false) }, waitMs)
      } catch (e) { resolve(false) }
    })

    const tryChannel = (seriesKey, waitMs = 3000) => new Promise((resolve) => {
      try {
        const ch = adapter.QuoteChannel([seriesKey], ['lp','ask','bid'])
        ch.listen((obj) => {
          const ex = Object.keys(obj)[0]
          const symMap = obj[ex] || {}
          const sy = Object.keys(symMap)[0]
          const lp = sy ? symMap[sy]?.lp : undefined
          if (debugMode) {
            const ev = { seriesKey, ex, sy, lp }
            debug.events.push(ev)
            try { console.log('TV Channel event', ev) } catch(e){}
          }
          if (!responded && lp !== undefined) {
            responded = true
            const priceNum = Number(lp)
            const base = { success: true, symbol, exchange, price: priceNum, source: seriesKey }
            if (debugMode) base.debug = debug
            res.json(base)
            if (metrics) metrics.priceExternalServed = (metrics.priceExternalServed || 0) + 1
            if (ch.close) try { ch.close() } catch (e) {}
            resolve(true)
          }
        })
        setTimeout(() => { if (ch.close) try { ch.close() } catch (e) {}; resolve(false) }, waitMs)
      } catch (e) { resolve(false) }
    })

    const candidates = []
    candidates.push([symbol, feedExch])
    candidates.push([`${feedExch}:${symbol}`, undefined])
    candidates.push([`${feedExch}:${spacedSymbol}`, undefined])
    if (feedExch === 'BINANCE' && /USD$/.test(symbol)) {
      const usdt = symbol.replace(/USD$/, 'USDT')
      candidates.push([usdt, feedExch])
      candidates.push([`${feedExch}:${usdt}`, undefined])
    }
    // Index fallbacks
    if (['NIFTY','BANKNIFTY','FINNIFTY'].includes(symbol)) {
      candidates.push([symbol, 'INDEX'])
      candidates.push([`NSE:${symbol}`, undefined])
      candidates.push([`NSE:${symbol}`, ''])
    }
    // Case variations
    candidates.push([symbol, feedExch.toUpperCase()])
    candidates.push([symbol, feedExch.charAt(0).toUpperCase()+feedExch.slice(1).toLowerCase()])
    if (feedExch === 'NSE' || feedExch === 'NFO') {
      candidates.push([symbol, 'nse_dly'])
      candidates.push([symbol, 'NSE_DLY'])
      candidates.push([`nse_dly:${symbol}`, undefined])
      candidates.push([`NSE_DLY:${symbol}`, undefined])
      candidates.push([`NSE:${symbol}`, undefined])
      candidates.push([`NFO:${symbol}`, undefined])
    }

    // Try to discover alt feed from TickerDetails (e.g., nse_dly)
    const alt = await resolveFeedPrefix(symbol, feedExch)
    if (alt) {
      candidates.push([symbol, alt])
      candidates.push([`${alt}:${symbol}`, undefined])
    }

    const tv2Candidates = []
    tv2Candidates.push(`${feedExch}:${symbol}`)
    tv2Candidates.push(`${feedExch}:${spacedSymbol}`)
    tv2Candidates.push(symbol)
    if (feedExch === 'BINANCE' && /USD$/.test(symbol)) {
      const usdt = symbol.replace(/USD$/, 'USDT')
      tv2Candidates.push(`${feedExch}:${usdt}`)
      tv2Candidates.push(usdt)
    }
    if (feedExch === 'NSE' || feedExch === 'NFO') {
      tv2Candidates.push(`nse_dly:${symbol}`)
      tv2Candidates.push(`NSE_DLY:${symbol}`)
      tv2Candidates.push(`NSE:${symbol}`)
      tv2Candidates.push(`NFO:${symbol}`)
    }
    if (['NIFTY','BANKNIFTY','FINNIFTY'].includes(symbol)) {
      tv2Candidates.push(`INDEX:${symbol}`)
    }
    tv2Candidates.push(`BSE:${symbol}`)

    try {
      const ids = []
      const types = optMatch ? ['', 'option', 'derivative', 'futures'] : ['stock']
      for (let ti = 0; ti < types.length; ti++) {
        // eslint-disable-next-line no-await-in-loop
        const sr = await TradingView.searchMarket(symbol, types[ti], feedExch, 'IN', '', 'IN', 0)
        if (sr && sr.symbols && Array.isArray(sr.symbols)) {
          sr.symbols.slice(0, 5).forEach((s) => { if (s && s.id) ids.push(s.id) })
        }
      }
      ids.forEach(id => tv2Candidates.push(id))
      if (sr && sr.symbols && Array.isArray(sr.symbols)) {
        sr.symbols.slice(0, 5).forEach((s) => {
          if (s && s.id) tv2Candidates.push(s.id)
        })
        if (debugMode) {
          try { console.log('TV2 searchMarket', { count: sr.symbols.length, picks: sr.symbols.slice(0,5).map(x=>x.id) }) } catch(e){}
        }
      }
    } catch(e) {
      if (debugMode) { try { console.log('TV2 searchMarket error', String(e&&e.message||e)) } catch(_e){} }
    }

    const tryTv2 = (seriesKey, waitMs = 3000) => new Promise((resolve) => {
      try {
        const client = createTvClient()
        const quote = new client.Session.Quote({ customFields: ['lp','ask','bid','ch','chp'] })
        const market = new quote.Market(seriesKey, 'regular')
        const timer = setTimeout(() => { try { market.close() } catch(e){}; try { quote.delete() } catch(e){}; resolve(false) }, waitMs)
        market.onData((data) => {
          const lp = data && data.lp
          if (debugMode) {
            const ev = { seriesKey, lp, ask: data && data.ask, bid: data && data.bid }
            debug.events.push(ev)
            try { console.log('TV2 Quote data', ev) } catch(e){}
          }
          if (!responded && lp !== undefined) {
            responded = true
            clearTimeout(timer)
            const priceNum = Number(lp)
            const base = { success: true, symbol, exchange, price: priceNum, source: seriesKey }
            if (debugMode) base.debug = debug
            res.json(base)
            if (metrics) metrics.priceExternalServed = (metrics.priceExternalServed || 0) + 1
            try { market.close() } catch(e){}
            try { quote.delete() } catch(e){}
            try { client.end() } catch(e){}
            resolve(true)
          }
        })
        market.onError((...err) => {
          if (debugMode) {
            const ev = { seriesKey, error: String(err && err[0] && err[0]) }
            debug.events.push(ev)
            try { console.log('TV2 Quote error', ev) } catch(e){}
          }
        })
        client.onError((er) => {
          if (debugMode) {
            try { console.log('TV2 Client error', String(er && er.message || er)) } catch(e){}
          }
        })
      } catch(e) { resolve(false) }
    })

    for (let i = 0; i < tv2Candidates.length && !responded; i++) {
      const ser = tv2Candidates[i]
      if (debugMode) {
        debug.candidates.push({ series: ser })
        try { console.log('TV2 Try candidate', { series: ser }) } catch(e){}
      }
      // eslint-disable-next-line no-await-in-loop
      const ok = await tryTv2(ser, waitDefault)
      if (ok) break
    }

    if (!responded && source === 'legacy') {
      for (let i = 0; i < candidates.length && !responded; i++) {
        const [ser, exch] = candidates[i]
        if (debugMode) {
          debug.candidates.push({ series: ser, exch })
          try { console.log('TV Try candidate', { series: ser, exch }) } catch(e){}
        }
        // eslint-disable-next-line no-await-in-loop
        const ok = await tryQuote(ser, exch, waitDefault)
        if (ok) break
      }
      if (!responded) {
        const combined = [`${feedExch}:${symbol}`, `${feedExch}:${spacedSymbol}`, `NSE:${symbol}`, `NFO:${symbol}`, `NFO:${spacedSymbol}`, `INDEX:${symbol}`]
        for (let i = 0; i < combined.length && !responded; i++) {
          // eslint-disable-next-line no-await-in-loop
          const ok = await tryChannel(combined[i], waitDefault)
          if (ok) break
        }
      }
    }

    if (!responded) {
      const base = { success: false, error: 'timeout fetching price' }
      if (debugMode) base.debug = debug
      res.status(504).json(base)
    }
  } catch (error) {
    const base = { success: false, error: error.message }
    if (['1','true','yes','on'].includes(String((req.query||{}).debug||'').toLowerCase())) base.debug = { message: 'internal error' }
    res.status(500).json(base)
  }
}

module.exports = { priceController: { getQuote } }
