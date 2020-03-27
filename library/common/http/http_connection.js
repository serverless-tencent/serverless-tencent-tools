// const request = require('request');
const QueryString = require('querystring')
const https = require('https')
const http = require('http')
const url = require('url')

/**
 * @inner
 */
class HttpConnection {
  static doRequest(method, reqUrl, data, callback, opt = {}) {
    // let req = {
    //     method: method,
    //     url: reqUrl,
    // }
    // data.Signature = 'fk';
    // if (method === "GET") {
    //     req.url += "?" + QueryString.stringify(data);
    // } else {
    //     req.form = data;
    // }
    // request(req, function (error, response, body) {
    /**
     * `.request` 的请求回调
     * @callback requestCallback
     * @param {Error} error 请求错误
     * @param {Object} response 请求响应
     * @param {String} body API 请求结果
     */
    //     callback(error, response, body);
    // })

    // node http[s] raw module send request
    let httpClient
    const httpBody = JSON.stringify(data)
    opt = opt || {}

    opt.method = method
    if (method === 'GET') {
      reqUrl += '?' + QueryString.stringify(data)
    } else {
      opt['headers'] = opt['headers'] || {}
      opt['headers']['Content-Type'] = 'application/json'
      opt['headers']['Content-Length'] = Buffer.byteLength(httpBody)
    }

    const urlObj = url.parse(reqUrl)
    switch (urlObj.protocol.toLocaleLowerCase()) {
      case 'https:':
        httpClient = https
        break
      case 'http:':
      default:
        httpClient = http
        break
    }

    opt.hostname = urlObj.hostname;
    opt.path = urlObj.path;
    opt.protocol = urlObj.protocol;

    const clientObject = httpClient.request(opt, function(res) {
      let body = ''
      res.on('data', function(chunk) {
        body += chunk
      })
      res.on('end', () => {
        callback(null, res, body)
      })
    })

    clientObject.on('error', function(e) {
      callback(e, null, null)
    })

    clientObject.write(httpBody)

    clientObject.end()
  }
}
module.exports = HttpConnection
