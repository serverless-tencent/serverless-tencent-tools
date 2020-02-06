const tencentcloud = require('tencentcloud-sdk-nodejs')
const ClientProfile = require('tencentcloud-sdk-nodejs/tencentcloud/common/profile/client_profile.js')
const HttpProfile = require('tencentcloud-sdk-nodejs/tencentcloud/common/profile/http_profile.js')
const assert = require('assert')
const { Credential } = tencentcloud.common
const ScfClient = tencentcloud.scf.v20180416.Client

class ApiHandler {
  constructor({ appid, secret_id, secret_key, options, context }) {
    this.appid = appid
    this.options = options
    this.context = context
    assert(options, 'Options should not is empty')
    this._scfClient = ApiHandler.createScfClient(secret_id, secret_key, options)
  }

  static getClientInfo(secret_id, secret_key, options) {
    const cred = options.token
      ? new Credential(secret_id, secret_key, options.token)
      : new Credential(secret_id, secret_key)
    const httpProfile = new HttpProfile()
    httpProfile.reqTimeout = 30
    const clientProfile = new ClientProfile('HmacSHA256', httpProfile)
    assert(options.region, 'Region should not is empty')
    return {
      cred: cred,
      region: options.region,
      clientProfile: clientProfile
    }
  }

  static createScfClient(secret_id, secret_key, options) {
    const info = ApiHandler.getClientInfo(secret_id, secret_key, options)
    const scfCli = new ScfClient(info.cred, info.region, info.clientProfile)
    scfCli.sdkVersion = 'ServerlessFramework'
    return scfCli
  }

  get scfClient() {
    return this._scfClient
  }
}

module.exports = ApiHandler