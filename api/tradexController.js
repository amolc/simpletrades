const https = require('https')
const io = require('socket.io-client')

function resolveServerUrl(companyName) {
  const n = String(companyName || '').trim()
  if (n === 'TradeX 3') return 'https://tradexapiserver3.theplatformapi.com'
  if (n === 'TradeX 2') return 'https://tradexapiserver2.theplatformapi.com'
  throw new Error('invalid_company_name')
}

function postJson(url, payload, headers = {}, retryCount = 0) {
  return new Promise((resolve) => {
    const u = new URL(url)
    const body = JSON.stringify(payload || {})
    const opts = {
      hostname: u.hostname,
      path: u.pathname + (u.search || ''),
      method: 'POST',
      headers: Object.assign({
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0',
        'Origin': `${u.protocol}//${u.hostname}`,
        'Referer': `${u.protocol}//${u.hostname}/`
      }, headers, { 'Content-Length': Buffer.byteLength(body) })
    }
    const req = https.request(opts, (resp) => {
      let data = ''
      resp.on('data', (chunk) => { data += chunk })
      resp.on('end', () => {
        if (resp.statusCode === 503 && retryCount < 3) {
          setTimeout(() => {
            postJson(url, payload, headers, retryCount + 1).then(resolve)
          }, 5000)
          return
        }
        let json = null
        try { json = JSON.parse(data) } catch(_) {}
        resolve({ status: resp.statusCode || 0, json, raw: data })
      })
    })
    req.on('error', () => resolve({ status: 0, json: null, raw: '' }))
    req.write(body)
    req.end()
  })
}

function getJson(url, headers = {}) {
  return new Promise((resolve) => {
    const u = new URL(url)
    const opts = {
      hostname: u.hostname,
      path: u.pathname + (u.search || ''),
      method: 'GET',
      headers: Object.assign({
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0',
        'Origin': `${u.protocol}//${u.hostname}`,
        'Referer': `${u.protocol}//${u.hostname}/`
      }, headers)
    }
    const req = https.request(opts, (resp) => {
      let data = ''
      resp.on('data', (chunk) => { data += chunk })
      resp.on('end', () => {
        let json = null
        try { json = JSON.parse(data) } catch(_) {}
        resolve({ status: resp.statusCode || 0, json, raw: data })
      })
    })
    req.on('error', () => resolve({ status: 0, json: null, raw: '' }))
    req.end()
  })
}

const db = require('../models')

async function login(req, res) {
  try {
    const companyName = String((req.body && req.body.companyName) || '').trim()
    const username = String((req.body && req.body.username) || '').trim()
    const password = String((req.body && req.body.password) || '').trim()
    if (!companyName || !username || !password) {
      return res.status(400).json({ success: false, error: 'companyName_username_password_required' })
    }
    const serverUrl = resolveServerUrl(companyName)
    const url = `${serverUrl}/api/apigateway/login/api/v1/login`
    const payload = { userName: username, password, companyName, deviceType: 'web' }
    const headers = {
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': '\"macOS\"'
    }
    const resp = await postJson(url, payload, headers)
    if (resp.status !== 200 || !resp.json || !resp.json.data) {
      return res.status(401).json({ success: false, error: 'login_failed', status: resp.status })
    }
    const data = resp.json.data
    const userId = data.id
    const accessToken = data.token || data.accessToken || ''
    if (!accessToken || !userId) {
      return res.status(401).json({ success: false, error: 'token_missing' })
    }
    try {
      if (req.app && req.app.locals) {
        req.app.locals.tradex = { userId, accessToken, companyName }
      }
      try {
        const payload = {
          provider: 'tradex',
          account: username,
          companyName,
          userId: String(userId),
          accessToken,
          status: 'active',
          lastUsedAt: new Date(),
          meta: { deviceType: 'web' }
        }
        const existing = await db.SessionData.findOne({ where: { provider: 'tradex', account: username } })
        if (existing) { await existing.update(payload) } else { await db.SessionData.create(payload) }
      } catch(e){ console.warn('SessionData save failed:', e && e.message) }
    } catch(_) {}
    res.json({ success: true, userId, accessToken })
  } catch(e) {
    res.status(500).json({ success: false, error: e && e.message })
  }
}

async function getCurrency(req, res) {
  try {
    const companyName = String((req.query && req.query.companyName) || (req.app && req.app.locals && req.app.locals.tradex && req.app.locals.tradex.companyName) || '').trim()
    let token = ''
    const auth = String(req.headers.authorization || '').trim()
    if (auth.toLowerCase().startsWith('bearer ')) token = auth.slice(7).trim()
    if (!token && req.app && req.app.locals && req.app.locals.tradex && req.app.locals.tradex.accessToken) token = req.app.locals.tradex.accessToken
    const userId = (req.app && req.app.locals && req.app.locals.tradex && req.app.locals.tradex.userId) || null
    if (!companyName || !token) {
      return res.status(400).json({ success: false, error: 'companyName_or_token_missing' })
    }
    const serverUrl = resolveServerUrl(companyName)
    const url = `${serverUrl}/api/apigateway/admin/api/v1/currency`
    const headers = { Authorization: `Bearer ${token}` }
    const resp = await getJson(url, headers)
    if (resp.status !== 200 || !resp.json) {
      return res.status(502).json({ success: false, error: 'currency_fetch_failed', status: resp.status })
    }
    res.json({ success: true, user: userId, data: resp.json })
  } catch(e) {
    res.status(500).json({ success: false, error: e && e.message })
  }
}

module.exports = { tradexController: { login, getCurrency } }

// --- Socket feed (subscribe to Tradex messageQueue) ---
function resolveWebBackUrl(companyName) {
  const n = String(companyName || '').trim()
  if (n === 'TradeX 2') return 'https://tradex2webback.theplatformapi.com'
  if (n === 'TradeX 3') return 'https://tradex3webback.theplatformapi.com'
  return 'https://tradex2webback.theplatformapi.com'
}

function startFeed(req, res) {
  try {
    const companyName = String((req.body && req.body.companyName) || (req.app && req.app.locals && req.app.locals.tradex && req.app.locals.tradex.companyName) || '').trim()
    let token = ''
    const auth = String(req.headers.authorization || '').trim()
    if (auth.toLowerCase().startsWith('bearer ')) token = auth.slice(7).trim()
    if (!token && req.app && req.app.locals && req.app.locals.tradex && req.app.locals.tradex.accessToken) token = req.app.locals.tradex.accessToken
    if (!companyName || !token) return res.status(400).json({ success:false, error:'companyName_or_token_missing' })
    const base = resolveWebBackUrl(companyName)
    if (req.app.locals.tradexSocket) {
      try { req.app.locals.tradexSocket.close() } catch(_) {}
      req.app.locals.tradexSocket = null
    }
    req.app.locals.tradexFeed = req.app.locals.tradexFeed || new Map()
    const build = (useToken) => {
      const opts = {
        transports: ['polling'], // the observed URL uses polling transport
        path: '/socket.io',
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000
      }
      if (useToken) {
        opts.auth = { Authorization: `Bearer ${token}` }
        opts.extraHeaders = { Authorization: `Bearer ${token}` }
        opts.query = { Authorization: `Bearer ${token}` }
      }
      return io(base, opts)
    }
    let socket = build(true)
    req.app.locals.tradexSocket = socket
    socket.on('connect', () => {
      try { console.log('Tradex socket connected', { base }) } catch(_) {}
    })
    socket.on('disconnect', (reason) => {
      try { console.warn('Tradex socket disconnected', reason) } catch(_) {}
    })
    socket.on('connect_error', (err) => {
      try { console.warn('Tradex socket connect_error', err && err.message) } catch(_) {}
      const msg = String(err && err.message || '')
      if (/token is not valid/i.test(msg)) {
        try { socket.close() } catch(_) {}
        socket = build(false)
        req.app.locals.tradexSocket = socket
        socket.on('connect', () => { try { console.log('Tradex socket connected (no-auth)') } catch(_) {} })
        socket.on('SUCCESS', (payload) => {
          try {
            if (payload && payload.event_name === 'messageQueue' && typeof payload.message === 'string') {
              const arr = JSON.parse(payload.message)
              const feed = req.app.locals.tradexFeed
              const now = Date.now()
              for (const row of arr) {
                const id = String(row.ID || row.id || '')
                if (!id) continue
                const m = {
                  id,
                  bid: row.Bid !== undefined ? Number(row.Bid) : null,
                  ask: row.Ask !== undefined ? Number(row.Ask) : null,
                  lastPrice: row.LastPrice !== undefined ? Number(row.LastPrice) : null,
                  tickTime: row.TickTime || null,
                  ts: now
                }
                feed.set(id, m)
              }
            }
          } catch(e) { console.warn('Tradex SUCCESS handler failed:', e && e.message) }
        })
      }
    })
    socket.on('SUCCESS', (payload) => {
      try {
        if (payload && payload.event_name === 'messageQueue' && typeof payload.message === 'string') {
          const arr = JSON.parse(payload.message)
          const feed = req.app.locals.tradexFeed
          const now = Date.now()
          for (const row of arr) {
            const id = String(row.ID || row.id || '')
            if (!id) continue
            const m = {
              id,
              bid: row.Bid !== undefined ? Number(row.Bid) : null,
              ask: row.Ask !== undefined ? Number(row.Ask) : null,
              lastPrice: row.LastPrice !== undefined ? Number(row.LastPrice) : null,
              tickTime: row.TickTime || null,
              ts: now
            }
            feed.set(id, m)
          }
        }
      } catch(e) { console.warn('Tradex SUCCESS handler failed:', e && e.message) }
    })
    res.json({ success:true })
  } catch(e){ res.status(500).json({ success:false, error: e && e.message }) }
}

function stopFeed(req, res) {
  try {
    if (req.app.locals.tradexSocket) {
      try { req.app.locals.tradexSocket.close() } catch(_) {}
      req.app.locals.tradexSocket = null
    }
    res.json({ success:true })
  } catch(e){ res.status(500).json({ success:false, error: e && e.message }) }
}

function getFeed(req, res) {
  try {
    const feed = req.app.locals.tradexFeed || new Map()
    const list = Array.from(feed.values())
    list.sort((a,b) => (b.ts||0) - (a.ts||0))
    res.json({ success:true, count: list.length, data: list })
  } catch(e){ res.status(500).json({ success:false, error: e && e.message }) }
}

module.exports.tradexController.startFeed = startFeed
module.exports.tradexController.stopFeed = stopFeed
module.exports.tradexController.getFeed = getFeed
