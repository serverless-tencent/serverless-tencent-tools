const tls = require('tls')
const http = require('http')
const https = require('https')
const events = require('events')
const util = require('util')

function toOptions(host, port, localAddress) {
  if (typeof host === 'string') {
    return {
      host: host,
      port: port,
      localAddress: localAddress
    }
  }
  return host
}

function mergeOptions(target) {
  for (let i = 1, len = arguments.length; i < len; ++i) {
    const overrides = arguments[i]
    if (typeof overrides === 'object') {
      const keys = Object.keys(overrides)
      keys.forEach((key) => {
        if (overrides[key] !== undefined) {
          target[key] = overrides[key]
        }
      })
    }
  }
  return target
}

function TunnelingAgent(opts) {
  const self = this
  self.options = opts || {}
  self.proxyOptions = self.options.proxy || {}
  self.maxSockets = self.options.maxSockets || http.Agent.defaultMaxSockets
  self.requests = []
  self.sockets = []

  self.on('free', (socket, host, port, localAddress) => {
    const options = toOptions(host, port, localAddress)
    for (let i = 0, len = self.requests.length; i < len; ++i) {
      const pending = self.requests[i]
      if (pending.host === options.host && pending.port === options.port) {
        self.requests.splice(i, 1)
        pending.request.onSocket(socket)
        return
      }
    }
    socket.destroy()
    self.removeSocket(socket)
  })
}

util.inherits(TunnelingAgent, events.EventEmitter)

TunnelingAgent.prototype.addRequest = function addRequest(req, host, port, localAddress) {
  const self = this
  const options = mergeOptions({ request: req }, self.options, toOptions(host, port, localAddress))

  if (self.sockets.length >= this.maxSockets) {
    // We are over limit so we'll add it to the queue.
    self.requests.push(options)
    return
  }

  // If we are under maxSockets create a new one.
  self.createSocket(options, function(socket) {
    req.onSocket(socket)

    function onFree() {
      self.emit('free', socket, options)
    }

    function onCloseOrRemove() {
      self.removeSocket(socket)
      socket.removeListener('free', onFree)
      socket.removeListener('close', onCloseOrRemove)
      socket.removeListener('agentRemove', onCloseOrRemove)
    }

    socket.on('free', onFree)
    socket.on('close', onCloseOrRemove)
    socket.on('agentRemove', onCloseOrRemove)
  })
}

TunnelingAgent.prototype.createSocket = function createSocket(options, cb) {
  const self = this
  const placeholder = {}
  self.sockets.push(placeholder)

  const connectOptions = mergeOptions({}, self.proxyOptions, {
    method: 'CONNECT',
    path: options.host + ':' + options.port,
    agent: false,
    headers: {
      host: options.host + ':' + options.port
    }
  })
  if (options.localAddress) {
    connectOptions.localAddress = options.localAddress
  }
  if (connectOptions.proxyAuth) {
    connectOptions.headers = connectOptions.headers || {}
    connectOptions.headers['Proxy-Authorization'] =
      'Basic ' + new Buffer(connectOptions.proxyAuth).toString('base64')
  }

  const connectReq = self.request(connectOptions)
  connectReq.useChunkedEncodingByDefault = false // for v0.6

  function onResponse(res) {
    // Very hacky. This is necessary to avoid http-parser leaks.
    res.upgrade = true
  }

  function onConnect(res, socket, head) {
    connectReq.removeAllListeners()
    socket.removeAllListeners()

    if (res.statusCode !== 200) {
      socket.destroy()
      const error = new Error(
        'tunneling socket could not be established, ' + 'statusCode=' + res.statusCode
      )
      error.code = 'ECONNRESET'
      options.request.emit('error', error)
      self.removeSocket(placeholder)
      return
    }
    if (head.length > 0) {
      socket.destroy()
      const error = new Error('got illegal response body from proxy')
      error.code = 'ECONNRESET'
      options.request.emit('error', error)
      self.removeSocket(placeholder)
      return
    }
    self.sockets[self.sockets.indexOf(placeholder)] = socket
    return cb(socket)
  }

  function onUpgrade(res, socket, head) {
    // Hacky.
    process.nextTick(function() {
      onConnect(res, socket, head)
    })
  }

  function onError(cause) {
    connectReq.removeAllListeners()

    const error = new Error(
      'tunneling socket could not be established, ' + 'cause=' + cause.message
    )
    error.code = 'ECONNRESET'
    options.request.emit('error', error)
    self.removeSocket(placeholder)
  }

  connectReq.once('response', onResponse) // for v0.6
  connectReq.once('upgrade', onUpgrade) // for v0.6
  connectReq.once('connect', onConnect) // for v0.7 or later
  connectReq.once('error', onError)
  connectReq.end()
}

TunnelingAgent.prototype.removeSocket = function removeSocket(socket) {
  const pos = this.sockets.indexOf(socket)
  if (pos === -1) {
    return
  }
  this.sockets.splice(pos, 1)

  const pending = this.requests.shift()
  if (pending) {
    // If we have pending requests and a socket gets closed a new one
    // needs to be created to take over in the pool for the one that closed.
    this.createSocket(pending, function(soc) {
      pending.request.onSocket(soc)
    })
  }
}

function createSecureSocket(options, cb) {
  const self = this
  TunnelingAgent.prototype.createSocket.call(self, options, function(socket) {
    const hostHeader = options.request.getHeader('host')
    const tlsOptions = mergeOptions({}, self.options, {
      socket: socket,
      servername: hostHeader ? hostHeader.replace(/:.*$/, '') : options.host
    })

    // 0 is dummy port for v0.6
    const secureSocket = tls.connect(0, tlsOptions)
    self.sockets[self.sockets.indexOf(socket)] = secureSocket
    cb(secureSocket)
  })
}

function httpOverHttp(options) {
  const agent = new TunnelingAgent(options)
  agent.request = http.request
  return agent
}

function httpsOverHttp(options) {
  const agent = new TunnelingAgent(options)
  agent.request = http.request
  agent.createSocket = createSecureSocket
  agent.defaultPort = 443
  return agent
}

function httpOverHttps(options) {
  const agent = new TunnelingAgent(options)
  agent.request = https.request
  return agent
}

function httpsOverHttps(options) {
  const agent = new TunnelingAgent(options)
  agent.request = https.request
  agent.createSocket = createSecureSocket
  agent.defaultPort = 443
  return agent
}

module.exports = {
  httpOverHttp,
  httpsOverHttp,
  httpOverHttps,
  httpsOverHttps
}
