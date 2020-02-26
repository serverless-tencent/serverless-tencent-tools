var canPromise = require('./can-promise')
var Index = require('./core/qrcode')
var TerminalRenderer = require('./renderer/terminal')

function checkParams(text, opts, cb) {
  if (typeof text === 'undefined') {
    throw new Error('String required as first argument')
  }

  if (typeof cb === 'undefined') {
    cb = opts
    opts = {}
  }

  if (typeof cb !== 'function') {
    if (!canPromise()) {
      throw new Error('Callback required as last argument')
    } else {
      opts = cb || {}
      cb = null
    }
  }

  return {
    opts: opts,
    cb: cb
  }
}

function getStringRendererFromType(type) {
  switch (type) {
    case 'terminal':
      return TerminalRenderer
  }
}

function render(renderFunc, text, params) {
  if (!params.cb) {
    return new Promise(function(resolve, reject) {
      try {
        var data = Index.create(text, params.opts)
        return renderFunc(data, params.opts, function(err, data) {
          return err ? reject(err) : resolve(data)
        })
      } catch (e) {
        reject(e)
      }
    })
  }

  try {
    var data = Index.create(text, params.opts)
    return renderFunc(data, params.opts, params.cb)
  } catch (e) {
    params.cb(e)
  }
}

exports.toString = function toString(text, opts, cb) {
  var params = checkParams(text, opts, cb)
  var renderer = getStringRendererFromType(params.opts.type)
  return render(renderer.render, text, params)
}
