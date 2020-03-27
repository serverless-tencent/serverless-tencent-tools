const TencentCloudSDKHttpException = require('./exception/tencent_cloud_sdk_exception')
const crypto = require('crypto')
const util = require('util')
/**
 * @inner
 */
class Sign {
  static sign(secretKey, signStr, signMethod) {
    const signMethodMap = {
      HmacSHA1: 'sha1',
      HmacSHA256: 'sha256'
    }

    if (!signMethodMap.hasOwnProperty(signMethod)) {
      throw new TencentCloudSDKHttpException(
        'signMethod invalid, signMethod only support (HmacSHA1, HmacSHA256)'
      )
    }
    const hmac = crypto.createHmac(signMethodMap[signMethod], secretKey || '')
    return hmac.update(Buffer.from(signStr, 'utf8')).digest('base64')
  }

  static signv3(credential, endpoint, time, signStr) {

    const ApiTc3Request = 'tc3_request'
    const ApiSignedHeaders = 'content-type;host'

    const PrefixInteger = function(num, length) {
      return (Array(length).join('0') + num).slice(-length)
    }

    const sign = function(key, msg, hex) {
      if (hex) {
        return crypto
          .createHmac('sha256', key)
          .update(msg, 'utf8')
          .digest('hex')
      }
      return crypto.createHmac('sha256', key).update(msg, 'utf8')
    }
    const newDate = time;
    const timestamp = Math.ceil(newDate.getTime() / 1000)
    const ctype = 'application/json'
    const algorithm = 'TC3-HMAC-SHA256'
    const payload = signStr
    const canonical_headers = util.format('content-type:%s\nhost:%s\n', ctype, endpoint)
    const http_request_method = 'POST'
    const canonical_uri = '/'
    const canonical_querystring = ''
    const date = util.format(
      '%s-%s-%s',
      newDate.getFullYear(),
      PrefixInteger(newDate.getMonth() + 1, 2),
      PrefixInteger(newDate.getUTCDate(), 2)
    )

    const hashed_request_payload = crypto
      .createHash('sha256')
      .update(payload, 'utf8')
      .digest()
    const canonical_request =
      http_request_method +
      '\n' +
      canonical_uri +
      '\n' +
      canonical_querystring +
      '\n' +
      canonical_headers +
      '\n' +
      ApiSignedHeaders +
      '\n' +
      hashed_request_payload.toString('hex')
    console.log(canonical_request)
    const service = endpoint.split('.')[0]
    const credential_scope = date + '/' + service + '/' + ApiTc3Request
    const hashed_canonical_request = crypto
      .createHash('sha256')
      .update(canonical_request, 'utf8')
      .digest()
    const string_to_sign =
      algorithm +
      '\n' +
      timestamp +
      '\n' +
      credential_scope +
      '\n' +
      hashed_canonical_request.toString('hex')
    console.log(string_to_sign)
    const secret_date = sign('TC3' + credential.secretKey, date, false)
    const secret_service = sign(new Buffer.from(secret_date.digest('hex'), 'hex'), service, false)
    const secret_signing = sign(
      new Buffer.from(secret_service.digest('hex'), 'hex'),
      ApiTc3Request,
      false
    )
    const signature = sign(new Buffer.from(secret_signing.digest('hex'), 'hex'), string_to_sign, true)
    return util.format(
          '%s Credential=%s/%s, SignedHeaders=%s, Signature=%s',
          algorithm,
          credential.secretId,
          credential_scope,
          ApiSignedHeaders,
          signature
        )
  }
}
module.exports = Sign
