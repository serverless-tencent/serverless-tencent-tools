/* jshint node:true */

var util = require('util')
var http = require('http')
var HttpAgent = http.Agent
var https = require('https')
var HttpsAgent = https.Agent

function mixinProxying(agent, proxyOpts) {
  agent.proxy = proxyOpts

  var orig = {
    createConnection: agent.createConnection,
    addRequest: agent.addRequest
  }

  // Make the tcp or tls connection go to the proxy, ignoring the
  // destination host:port arguments.
  agent.createConnection = function(port, host, options) {
    return orig.createConnection.call(this, this.proxy.port, this.proxy.host, options)
  }

  agent.addRequest = function(req, options) {
    req.path = this.proxy.innerProtocol + '//' + options.host + ':' + options.port + req.path
    return orig.addRequest.call(this, req, options)
  }
}

function OuterHttpAgent(opts) {
  HttpAgent.call(this, opts)
  if (opts && opts.proxy) {
    mixinProxying(this, opts.proxy)
  }
}
util.inherits(OuterHttpAgent, HttpAgent)
exports.OuterHttpAgent = OuterHttpAgent

/**
 * Proxy some traffic over HTTPS.
 */
function OuterHttpsAgent(opts) {
  HttpsAgent.call(this, opts)
  if (opts && opts.proxy) {
    mixinProxying(this, opts.proxy)
  }
}
util.inherits(OuterHttpsAgent, HttpsAgent)
exports.OuterHttpsAgent = OuterHttpsAgent
