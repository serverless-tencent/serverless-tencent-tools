const http = require('http')
const https = require('https')
const urlParse = require('url').parse
const tunnel = require('./tunnel')
const agents = require('./agents')

const ENV_const_PROXY_SEARCH_ORDER = ['https_proxy', 'HTTPS_PROXY', 'http_proxy', 'HTTP_PROXY']

const ORIGINALS = {
  http: {
    globalAgent: http.globalAgent,
    request: http.request,
    get: http.get
  },
  https: {
    globalAgent: https.globalAgent,
    request: https.request,
    get: https.get
  },
  env: {
    https_proxy: process.env.https_proxy,
    HTTPS_PROXY: process.env.HTTPS_PROXY,
    http_proxy: process.env.http_proxy,
    HTTP_PROXY: process.env.HTTP_PROXY
  }
}

function semverGte(v1, v2) {
  const arr1 = v1.slice(1).split('.')
  const arr2 = v2.slice(1).split('.')
  let result = true
  arr1.forEach((item, index) => {
    const n1 = Number(item)
    const n2 = Number(arr2[index])
    if (n1 < n2) {
      result = false
    }
  })
  return result
}

function resetGlobals() {
  // reset http
  http.globalAgent = ORIGINALS.http.globalAgent
  http.request = ORIGINALS.http.request
  http.get = ORIGINALS.http.get
  // reset https
  https.globalAgent = ORIGINALS.https.globalAgent
  https.request = ORIGINALS.https.request
  https.get = ORIGINALS.https.get

  for (const key in ORIGINALS.env) {
    if (Object.prototype.hasOwnProperty.call(ORIGINALS.env, key)) {
      const val = ORIGINALS.env[key]
      if (val !== null && val !== undefined) {
        process.env[key] = val
      }
    }
  }
}

function tryParse(url) {
  if (!url) {
    return null
  }

  const parsed = urlParse(url)

  return {
    protocol: parsed.protocol,
    host: parsed.hostname,
    port: parseInt(parsed.port, 10),
    proxyAuth: parsed.auth
  }
}

function findEnvconstProxy() {
  let result = ''
  for (let i = 0; i < ENV_const_PROXY_SEARCH_ORDER.length; i++) {
    const key = ENV_const_PROXY_SEARCH_ORDER[i]
    const val = process.env[key]
    if (val !== null && val !== undefined) {
      result = result || val
      delete process.env[key]
    }
  }

  return result
}

const globalTunnel = {}

globalTunnel.isProxying = false

globalTunnel.initialize = function() {
  if (globalTunnel.isProxying) {
    return
  }
  try {
    const envconstProxy = findEnvconstProxy()
    let conf
    if (envconstProxy) {
      // Nothing passed - parse from the env
      conf = tryParse(envconstProxy)
    }
    if (!conf) {
      return
    }

    if (!conf.host) {
      throw new Error('upstream proxy host is required')
    }
    if (!conf.port) {
      throw new Error('upstream proxy port is required')
    }

    if (conf.protocol === undefined) {
      conf.protocol = 'http:' // Default to proxy speaking http
    }
    if (!/:$/.test(conf.protocol)) {
      conf.protocol += ':'
    }

    if (!conf.connect) {
      conf.connect = 'https' // Just HTTPS by default
    }

    if (['both', 'neither', 'https'].indexOf(conf.connect) < 0) {
      throw new Error('valid connect options are "neither", "https", or "both"')
    }

    const connectHttp = conf.connect === 'both'
    const connectHttps = conf.connect !== 'neither'

    // Overriding globalAgent was added in v11.7.
    // @see https://nodejs.org/uk/blog/release/v11.7.0/
    try {
      if (semverGte(process.version, 'v11.7.0')) {
        http.globalAgent = globalTunnel._makeAgent(conf, 'http', connectHttp)
        https.globalAgent = globalTunnel._makeAgent(conf, 'https', connectHttps)
      }
    } catch (e) {}

    http.request = globalTunnel._makeHttp('request', http, 'http')
    https.request = globalTunnel._makeHttp('request', https, 'https')
    http.get = globalTunnel._makeHttp('get', http, 'http')
    https.get = globalTunnel._makeHttp('get', https, 'https')

    globalTunnel.isProxying = true
  } catch (e) {
    resetGlobals()
  }
}

const _makeAgent = function(conf, innerProtocol, useCONNECT) {
  const outerProtocol = conf.protocol
  innerProtocol += ':'

  const opts = {
    proxy: {
      host: conf.host,
      port: conf.port,
      protocol: conf.protocol,
      localAddress: conf.localAddress,
      proxyAuth: conf.proxyAuth
    },
    maxSockets: conf.sockets
  }
  opts.proxy.innerProtocol = innerProtocol

  if (useCONNECT) {
    if (outerProtocol === 'https:') {
      if (innerProtocol === 'https:') {
        return tunnel.httpsOverHttps(opts)
      }
      return tunnel.httpOverHttps(opts)
    }
    if (innerProtocol === 'https:') {
      return tunnel.httpsOverHttp(opts)
    }
    return tunnel.httpOverHttp(opts)
  }

  if (outerProtocol === 'https:') {
    return new agents.OuterHttpsAgent(opts)
  }
  return new agents.OuterHttpAgent(opts)
}

globalTunnel._makeAgent = function(conf, innerProtocol, useCONNECT) {
  const agent = _makeAgent(conf, innerProtocol, useCONNECT)
  agent.protocol = innerProtocol + ':'
  return agent
}

globalTunnel._makeHttp = function(method, httpOrHttps, protocol) {
  return function(options, callback) {
    if (typeof options === 'string') {
      options = urlParse(options)
    }
    if (
      (options.agent === null || options.agent === undefined) &&
      typeof options.createConnection !== 'function' &&
      (options.host || options.hostname)
    ) {
      options.agent = options._defaultAgent || httpOrHttps.globalAgent
    }
    if (options.protocol === 'https:' || (!options.protocol && protocol === 'https')) {
      options.port = options.port || 443
    }
    if (options.protocol === 'http:' || (!options.protocol && protocol === 'http')) {
      options.port = options.port || 80
    }

    return ORIGINALS[protocol][method].call(httpOrHttps, options, callback)
  }
}

globalTunnel.end = function() {
  resetGlobals()
  globalTunnel.isProxying = false
}

globalTunnel.initialize()

module.exports = globalTunnel
