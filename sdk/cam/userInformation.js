const util = require('util')
const AbstractModel = require('tencentcloud-sdk-nodejs/tencentcloud/common/abstract_model')
const AbstractClient = require('tencentcloud-sdk-nodejs/tencentcloud/common/abstract_client')
const tencentcloud = require('tencentcloud-sdk-nodejs')
const ClientProfile = require('tencentcloud-sdk-nodejs/tencentcloud/common/profile/client_profile.js')
const HttpProfile = require('tencentcloud-sdk-nodejs/tencentcloud/common/profile/http_profile.js')

class GetUserInformationResponse extends AbstractModel {
  constructor() {
    super()

    this.RequestId = null
  }

  deserialize(params) {
    if (!params) {
      return
    }
    this.OwnerUin = 'OwnerUin' in params ? params.OwnerUin : null
    this.Uin = 'Uin' in params ? params.Uin : null
    this.AppId = 'AppId' in params ? params.AppId : null
    this.RequestId = 'RequestId' in params ? params.RequestId : null
  }
}

class UserInformationClient extends AbstractClient {
  constructor(credential, region, profile) {
    super('cam.tencentcloudapi.com', '2019-01-16', credential, region, profile)
  }

  GetUserAppId(req, cb) {
    const resp = new GetUserInformationResponse()
    this.request('GetUserAppId', req, resp, cb)
  }
}

class GetUserInformation {
  async getUserInformation(credentials) {
    const secret_id = credentials.SecretId
    const secret_key = credentials.SecretKey
    const cred = credentials.token
      ? new tencentcloud.common.Credential(secret_id, secret_key, credentials.token)
      : new tencentcloud.common.Credential(secret_id, secret_key)
    const httpProfile = new HttpProfile()
    httpProfile.reqTimeout = 30
    const clientProfile = new ClientProfile('HmacSHA256', httpProfile)
    const cam = new UserInformationClient(cred, 'ap-guangzhou', clientProfile)
    const req = new GetUserInformationResponse()
    const body = {}
    req.from_json_string(JSON.stringify(body))
    const handler = util.promisify(cam.GetUserAppId.bind(cam))
    try {
      return handler(req)
    } catch (e) {
      throw 'Get Appid failed! '
    }
  }
}

module.exports = {
  GetUserInformationResponse,
  UserInformationClient,
  GetUserInformation
}
