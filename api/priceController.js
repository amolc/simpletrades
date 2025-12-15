const TradingView = require('@alandlguo/tradingview-api')
const db = require('../models')
const tvWsAdapter = require('./tvWsAdapterController')

function createTvClient() {
  const token = process.env.TV_SESSION || process.env.TW_SESSION || ''
  const signature = process.env.TV_SIGNATURE || process.env.TW_SIGNATURE || ''
  const opts = { server: 'data' }
  if (token) opts.token = token
  if (signature) opts.signature = signature
  return new TradingView.Client(opts)
}

function normalizeKey(k){
  return String(k||'').toUpperCase().replace(/\s+/g,'').trim()
}

function normalizeSymbolFor(ex, sym){
  const exu = String(ex||'').toUpperCase().trim()
  let s = String(sym||'').toUpperCase().trim()
  const m = s.match(/^([A-Z]+)(\d{2})(\d{2})(\d{2})([CP])(\d{2,6})$/)
  if (exu === 'NSE' && m) {
    const u = m[1], yy = m[2], mm = m[3], dd = m[4], cp = m[5], strike = m[6]
    const dt = new Date(`20${yy}-${mm}-${dd}`)
    const mon = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][dt.getMonth()]
    const dd2 = String(dt.getDate()).padStart(2,'0')
    const yy2 = String(dt.getFullYear()).slice(2)
    const suf = cp === 'P' ? 'PE' : 'CE'
    s = `${u}${dd2}${mon}${yy2}${strike}${suf}`
  }
  return s
}

async function deleteWatchlistMatching(exchange, symbol){
  try {
    const rows = await db.Watchlist.findAll()
    const target = normalizeKey(`${String(exchange||'').toUpperCase().trim()}:${normalizeSymbolFor(exchange, symbol)}`)
    const ids = []
    for (const r of rows) {
      const ex = (r.exchange || 'NSE')
      const ns = normalizeSymbolFor(ex, r.stockName)
      const key = normalizeKey(`${String(ex).toUpperCase().trim()}:${ns}`)
      if (key === target) ids.push(r.id)
    }
    if (ids.length) {
      await db.Watchlist.destroy({ where: { id: ids } })
      try { console.log('Deleted watchlist items on no_such_symbol', { count: ids.length, exchange, symbol }) } catch(e){}
    }
  } catch(e) { try { console.warn('Delete watchlist failed:', e.message) } catch(_){} }
}

const nseOptionsService = require('./nseOptionsService');

async function getQuote(req, res) {
  try {
    let symbol = (req.query.symbol || '').toUpperCase().trim()
    const exchange = (req.query.exchange || 'NSE').toUpperCase().trim()
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'symbol required' })
    }

    const debugMode = (typeof req.query.debug !== 'undefined')
    console.log(`[Price API] Fetching price for ${exchange}:${symbol}`)
    if (debugMode) console.log('WebSocket Price API called:', { symbol, exchange })

    // Check cache first
    const cacheMap = (req.app && req.app.locals) ? req.app.locals.priceCache : null
    const readCache = (key) => {
      if (!cacheMap) return null
      const c = cacheMap.get(key)
      if (!c) return null
      if (c.lp === undefined) return null
      return c
    }
    
    const seriesKey = `${exchange}:${symbol}`
    let cached = readCache(seriesKey)
    if (!cached && exchange === 'BINANCE' && /USD$/.test(symbol)) {
      const usdtKey = `${exchange}:${symbol.replace(/USD$/, 'USDT')}`
      cached = readCache(usdtKey)
    }
    
    if (cached) {
      console.log(`[Price API] Cache hit for ${seriesKey}: ${cached.lp}`)
      const base = { success: true, symbol, exchange, price: Number(cached.lp), source: `cache:${seriesKey}` }
      if (debugMode) base.debug = { message: 'cache-hit' }
      return res.json(base)
    }

    console.log(`[Price API] No cache found for ${seriesKey}, attempting real-time fetch`)

    // Try to get real price via WebSocket first (blocking for accuracy)
    try {
      const wsInitialized = await tvWsAdapter.initializeConnection()
      if (wsInitialized) {
        console.log(`[Price API] WebSocket connection initialized, fetching real-time price`)
        
        return new Promise((resolve) => {
          let priceFound = false
          
          tvWsAdapter.startWebSocketFeed([{ symbol, exchange }], (data) => {
            if (data && data.lastPrice !== null && data.lastPrice !== undefined && !priceFound) {
              priceFound = true
              console.log(`[Price API] Real-time price received: ${data.lastPrice}`)
              
              // Update cache for next time
              if (cacheMap) {
                cacheMap.set(seriesKey, { lp: data.lastPrice, timestamp: Date.now() })
                console.log(`[Price API] Updated cache for ${seriesKey}`)
              }
              
              const result = { 
                success: true, 
                symbol, 
                exchange, 
                price: data.lastPrice,
                source: 'real-time',
                timestamp: Date.now()
              }
              if (debugMode) result.debug = { message: 'real-time-price' }
              
              resolve(res.json(result))
            }
          })
          
          // Timeout after 5 seconds if no price received
          setTimeout(() => {
            if (!priceFound) {
              console.log(`[Price API] Timeout waiting for real-time price`)
              const result = { 
                success: false, 
                error: 'Price not available - timeout waiting for real-time data',
                symbol, 
                exchange 
              }
              if (debugMode) result.debug = { message: 'real-time-timeout' }
              resolve(res.status(404).json(result))
            }
          }, 5000)
        })
      }
    } catch (wsError) {
      console.log(`[Price API] WebSocket error: ${wsError.message}`)
    }

    // If WebSocket fails or not available, return proper error
    console.log(`[Price API] Price not available for ${exchange}:${symbol}`)
    const errorResult = { 
      success: false, 
      error: `Price not available for ${exchange}:${symbol}`,
      symbol, 
      exchange 
    }
    if (debugMode) errorResult.debug = { message: 'price-not-available' }
    
    return res.status(404).json(errorResult)

  } catch (error) {
    console.error(`[Price API] Internal error: ${error.message}`)
    const base = { success: false, error: error.message }
    if (['1','true','yes','on'].includes(String((req.query||{}).debug||'').toLowerCase())) base.debug = { message: 'internal error' }
    res.status(500).json(base)
  }
}

module.exports = { priceController: { getQuote } }
async function loginTradingView(req, res){
  try{
    const username = String((req.body && req.body.username) || '').trim()
    const password = String((req.body && req.body.password) || '').trim()
    if (!username || !password) return res.status(400).json({ success:false, error:'username and password required' })
    const data = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&remember=on`
    const opts = { hostname: 'www.tradingview.com', path: '/accounts/signin/', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data), 'Origin': 'https://www.tradingview.com', 'Referer': 'https://www.tradingview.com/', 'User-Agent': 'Mozilla/5.0' } }
    const https = require('https')
    const cookies = await new Promise((resolve, reject) => {
      const req2 = https.request(opts, (resp) => {
        console.log('TradingView login response status:', resp.statusCode)
        console.log('TradingView login response headers:', JSON.stringify(resp.headers, null, 2))
        
        let responseBody = ''
        resp.on('data', (chunk) => {
          responseBody += chunk
        })
        
        resp.on('end', () => {
          console.log('TradingView login response body:', responseBody)
        })
        
        const setc = resp.headers['set-cookie'] || []
        resolve(Array.isArray(setc) ? setc : [])
      })
      req2.on('error', (err) => {
        console.error('TradingView login request error:', err)
        reject(err)
      })
      req2.write(data)
      req2.end()
    })
    const pick = (name) => {
      const row = cookies.find(c => c && c.startsWith(`${name}=`))
      return row ? row.split(';')[0].split('=').slice(1).join('=') : ''
    }
    console.log('Raw cookies received:', cookies)
    const tvToken = pick('tv_session') || pick('sessionid')
    const tvSig = pick('tv_signature') || ''
    console.log('Extracted tvToken:', tvToken)
    console.log('Extracted tvSig:', tvSig)
    if (!tvToken) {
      console.error('No valid session token found in cookies')
      return res.status(401).json({ success:false, error:'login_failed' })
    }
    process.env.TV_SESSION = tvToken
    process.env.TV_SIGNATURE = tvSig
    try{
      const app = req.app
      if (app && app.locals && app.locals.tv){
        const TradingView = require('@alandlguo/tradingview-api')
        const tvOpts = { server: 'data', token: tvToken }
        if (tvSig) tvOpts.signature = tvSig
        app.locals.tv.client = new TradingView.Client(tvOpts)
        app.locals.tv.quote = new app.locals.tv.client.Session.Quote({ customFields: ['lp','ask','bid','ch','chp'] })
      }
    } catch(e){}
    res.json({ success:true, token: tvToken, signature: tvSig ? tvSig : null })
  }catch(e){ res.status(500).json({ success:false, error: e && e.message }) }
}
module.exports.priceController.loginTradingView = loginTradingView

async function setTradingViewSession(req, res){
  try{
    const token = String((req.body && req.body.token) || '').trim()
    const signature = String((req.body && req.body.signature) || '').trim()
    if (!token) return res.status(400).json({ success:false, error:'token required' })
    process.env.TV_SESSION = token
    if (signature) process.env.TV_SIGNATURE = signature
    try{
      const app = req.app
      if (app && app.locals){
        const TradingView = require('@alandlguo/tradingview-api')
        const tvOpts = { server: 'data', token }
        if (signature) tvOpts.signature = signature
        app.locals.tv.client = new TradingView.Client(tvOpts)
        app.locals.tv.quote = new app.locals.tv.client.Session.Quote({ customFields: ['lp','ask','bid','ch','chp'] })
      }
    } catch(e){
      console.error('Error creating TradingView client with token:', e.message)
      console.error('Token:', token)
      console.error('Signature:', signature)
    }
    res.json({ success:true, token, signature: signature || null })
  }catch(e){ res.status(500).json({ success:false, error: e && e.message }) }
}
module.exports.priceController.setTradingViewSession = setTradingViewSession

function applyTvSession(app, token, signature){
  try{
    process.env.TV_SESSION = token
    if (signature) process.env.TV_SIGNATURE = signature
    if (app && app.locals){
      const TradingView = require('@alandlguo/tradingview-api')
      const tvOpts = { server: 'data', token }
      if (signature) tvOpts.signature = signature
      app.locals.tv.client = new TradingView.Client(tvOpts)
      app.locals.tv.quote = new app.locals.tv.client.Session.Quote({ customFields: ['lp','ask','bid','ch','chp'] })
    }
    return true
  }catch(e){ return false }
}

async function autoLoginFromEnv(app){
  try{
    const token = String(process.env.TV_SESSION || process.env.TW_SESSION || '').trim()
    const signature = String(process.env.TV_SIGNATURE || process.env.TW_SIGNATURE || '').trim()
    if (token) return applyTvSession(app, token, signature)
    const username = String(process.env.TV_USERNAME || process.env.TW_USERNAME || '').trim()
    const password = String(process.env.TV_PASSWORD || process.env.TW_PASSWORD || '').trim()
    if (!username || !password) return false
    const data = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&remember=on`
    const opts = { hostname: 'www.tradingview.com', path: '/accounts/signin/', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data), 'Origin': 'https://www.tradingview.com', 'Referer': 'https://www.tradingview.com/', 'User-Agent': 'Mozilla/5.0' } }
    const https = require('https')
    const cookies = await new Promise((resolve, reject) => {
      const req2 = https.request(opts, (resp) => {
        const setc = resp.headers['set-cookie'] || []
        resolve(Array.isArray(setc) ? setc : [])
      })
      req2.on('error', reject)
      req2.write(data)
      req2.end()
    })
    const pick = (name) => {
      const row = cookies.find(c => c && c.startsWith(`${name}=`))
      return row ? row.split(';')[0].split('=').slice(1).join('=') : ''
    }
    const tvToken = pick('tv_session') || pick('sessionid')
    const tvSig = pick('tv_signature') || ''
    if (!tvToken) return false
    return applyTvSession(app, tvToken, tvSig)
  }catch(e){ return false }
}
module.exports.priceController.applyTvSession = applyTvSession
module.exports.priceController.autoLoginFromEnv = autoLoginFromEnv

async function seleniumLoginTradingView(req, res){
  try{
    const username = String((req.body && req.body.username) || '').trim()
    const password = String((req.body && req.body.password) || '').trim()
    const { loginToTradingView } = require('../tradingview-selenium-login.js')
    const session = await loginToTradingView({ username, password })
    const token = String(session && (session.tv_session || session.sessionid) || '').trim()
    const signature = String(session && session.tv_signature || '').trim()
    if (!token) return res.status(401).json({ success:false, error:'login_failed' })
    applyTvSession(req.app, token, signature)
    res.json({ success:true, token, signature: signature || null })
  }catch(e){ res.status(500).json({ success:false, error: e && e.message }) }
}
module.exports.priceController.seleniumLoginTradingView = seleniumLoginTradingView
