const tencentcloud = require('tencentcloud-sdk-nodejs')
const ScfModels = tencentcloud.scf.v20180416.Models
const ScfClient = tencentcloud.scf.v20180416.Client
const { Credential } = tencentcloud.common
const ClientProfile = require('tencentcloud-sdk-nodejs/tencentcloud/common/profile/client_profile.js')
const HttpProfile = require('tencentcloud-sdk-nodejs/tencentcloud/common/profile/http_profile.js')
const urlencode = require('urlencode')
const { GetUserInformationResponse, UserInformationClient } = require('../cam/index')

class ScfRealTimeLogs {
  static createScfClient(secret_id, secret_key, token, region) {
    const info = this.getClientInfo(secret_id, secret_key, token, region)
    const scfCli = new ScfClient(info.cred, info.region, info.clientProfile)
    scfCli.sdkVersion = 'ServerlessFramework'
    return scfCli
  }

  static getClientInfo(secret_id, secret_key, token, region) {
    const cred = token
      ? new Credential(secret_id, secret_key, token)
      : new Credential(secret_id, secret_key)
    const httpProfile = new HttpProfile()
    httpProfile.reqTimeout = 60
    const clientProfile = new ClientProfile('HmacSHA256', httpProfile)
    return {
      cred: cred,
      region: region || 'ap-guangzhou',
      clientProfile: clientProfile
    }
  }

  static getAppid(auth) {
    const secret_id = auth.SecretId
    const secret_key = auth.SecretKey
    const cred = auth.token
      ? new tencentcloud.common.Credential(secret_id, secret_key, auth.token)
      : new tencentcloud.common.Credential(secret_id, secret_key)
    const httpProfile = new HttpProfile()
    httpProfile.reqTimeout = 30
    const clientProfile = new ClientProfile('HmacSHA256', httpProfile)
    const cam = new UserInformationClient(cred, 'ap-guangzhou', clientProfile)
    const req = new GetUserInformationResponse()
    const body = {}
    req.from_json_string(JSON.stringify(body))
    const params = cam.formatRequestData('GetUserAppId', cam.mergeData(req))
    let strParam = ''
    const keys = Object.keys(params)
    keys.sort()
    for (const k in keys) {
      const tempStr = keys[k] == 'Signature' ? urlencode(params[keys[k]]) : params[keys[k]]
      strParam += '&' + keys[k] + '=' + tempStr
    }
    return strParam
  }

  static getAddr(auth, func, region = 'ap-guangzhou', timeout = 600) {
    const scf = this.createScfClient(auth.SecretId, auth.SecretKey, auth.token, region)
    const req = new ScfModels.GetFunctionLogsRequest()
    const body = {
      FunctionName: func.functionName,
      Namespace: func.nameSpace || 'default',
      Qualifier: func.qualifier || '$LATEST'
    }
    req.from_json_string(JSON.stringify(body))
    const baseUrl = 'ws://service-qwh371t8-1258344699.gz.apigw.tencentcs.com/release/websocket'
    const params = scf.formatRequestData('GetFunctionLogs', scf.mergeData(req))
    let strParam = ''
    const keys = Object.keys(params)
    keys.sort()
    for (const k in keys) {
      const tempStr = keys[k] == 'Signature' ? urlencode(params[keys[k]]) : params[keys[k]]
      strParam += '&' + keys[k] + '=' + tempStr
    }

    return (
      baseUrl +
      '?' +
      strParam.slice(1) +
      '&Timeout=' +
      timeout +
      '&AppidSignature=' +
      urlencode(this.getAppid(auth))
    )
  }
}

module.exports = ScfRealTimeLogs
