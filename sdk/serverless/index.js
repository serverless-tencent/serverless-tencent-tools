const util = require('util')
const assert = require('assert')
const { sls, common } = require('../../library')
const ClientProfile = common.ClientProfile
const HttpProfile = common.HttpProfile
const Credential = common.Credential
const SlsClient = sls.v20200205.Client
const SlsModels = sls.v20200205.Models
const HttpConnection = common.HttpConnection
const { BindRole } = require('../cam')
const TencentCloudSDKHttpException = require('../../library/common/exception/tencent_cloud_sdk_exception')

class Serverless {
  constructor({ appid, secret_id, secret_key, options }) {
    this.appid = appid
    this.secretKey = secret_key
    this.secretId = secret_id
    this.options = options
    assert(options, 'Options should not is empty')
    this._slsClient = Serverless.createClient(secret_id, secret_key, options)
  }

  static getCredential(secret_id, secret_key, options) {
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

  static createClient(secret_id, secret_key, options) {
    const info = Serverless.getCredential(secret_id, secret_key, options)
    const scfCli = new SlsClient(info.cred, info.region, info.clientProfile)
    scfCli.sdkVersion = 'ServerlessFramework'
    return scfCli
  }

  static async getComponentAndVersions(name) {
    assert(name, 'The request is missing a required parameter name')
    const compVersion = {
      ComponentName: name
    }
    return Serverless.doRequest('GetComponentAndVersions', compVersion)
  }

  async _call(api, params) {
    const handler = util.promisify(this._slsClient[api].bind(this._slsClient))
    return await handler(params)
  }

  static async doRequest(action, params) {
    const proxyOrigin =
      'https://service-m98cluso-1253970226.gz.apigw.tencentcs.com/release/listcompversion'

    const optional = {
      timeout: 30 * 1000
    }

    params.Action = action

    return new Promise((resolve, reject) => {
      HttpConnection.doRequest(
        'GET',
        proxyOrigin,
        params,
        (error, response, data) => {
          if (error) {
            reject(new TencentCloudSDKHttpException(error.message))
          } else if (response.statusCode !== 200) {
            const tcError = new TencentCloudSDKHttpException(response.statusMessage)
            tcError.httpCode = response.statusCode
            reject(tcError)
          } else {
            data = JSON.parse(data)
            if (data.Response && data.Response.Error) {
              const tcError = new TencentCloudSDKHttpException(
                data.Response.Error.Message,
                data.Response.RequestId
              )
              tcError.code = data.Response.Error.Code
              reject(tcError)
            } else {
              resolve(data.Response)
            }
          }
        },
        optional
      )
    })
  }

  static async getComponentVersion(name, version) {
    assert(name, 'The request is missing a required parameter name')
    assert(version, 'The request is missing a required parameter version')
    const componentVersion = {
      ComponentName: name,
      ComponentVersion: version
    }

    return Serverless.doRequest('GetComponentVersion', componentVersion)
  }

  async prePublishComponent(body = {}) {
    if (!body.component || !body.component.componentName || !body.component.version) {
      throw new Error('componentName and version are required.')
    }
    const pubComponent = {
      ComponentName: body.component.componentName,
      ComponentVersion: body.component.version,
      Body: body
    }

    const req = new SlsModels.PrePublishComponentRequest()
    req.from_json_string(JSON.stringify(pubComponent))
    return await this._call('PrePublishComponent', req)
  }

  async postPublishComponent(body = {}) {
    if (!body.componentName || !body.componentVersion) {
      throw new Error('componentName and componentVersion are required.')
    }
    const pubComponent = {
      ComponentName: body.componentName,
      ComponentVersion: body.componentVersion,
      Body: body
    }
    const req = new SlsModels.PostPublishComponentRequest()
    req.from_json_string(JSON.stringify(pubComponent))
    return await this._call('PostPublishComponent', req)
  }

  async getInstance(body) {
    const ins = {
      Body: body
    }
    const req = new SlsModels.GetInstanceRequest()
    req.from_json_string(JSON.stringify(ins))
    return await this._call('GetInstance', req)
  }

  async saveInstance(body) {
    const ins = {
      Body: body
    }
    const req = new SlsModels.SaveInstanceRequest()
    req.from_json_string(JSON.stringify(ins))
    return await this._call('SaveInstance', req)
  }

  async listInstances(body) {
    const ins = {
      Body: body
    }
    const req = new SlsModels.ListInstancesRequest()
    req.from_json_string(JSON.stringify(ins))
    return await this._call('ListInstances', req)
  }

  async getUploadUrls(body) {
    const uploadUrl = {
      Body: body
    }
    const req = new SlsModels.GetUploadUrlsRequest()
    req.from_json_string(JSON.stringify(uploadUrl))
    return await this._call('GetUploadUrls', req)
  }

  async runComponent(body) {
    const comp = {
      Body: body
    }
    const req = new SlsModels.RunComponentRequest()
    req.from_json_string(JSON.stringify(comp))
    return await this._call('RunComponent', req)
  }

  async runFinishComponent(body) {
    const comp = {
      Body: body
    }
    const req = new SlsModels.RunFinishComponentRequest()
    req.from_json_string(JSON.stringify(comp))
    return await this._call('RunFinishComponent', req)
  }

  // async unpublishComponentVersion(name, version) {
  //     const componentVersion = {
  //         Name: name,
  //         ComponentVersion: version
  //     }
  //     const req = new SlsModels.UnpublishComponentVersionRequest();
  //     req.from_json_string(JSON.stringify(componentVersion));
  //     return await this._call('UnpublishComponentVersion', req);
  // }

  // async publishComponentVersion({name, componentVersion, org, author, description, keywords, license}) {

  //     const camRole = new BindRole.BindRole({
  //         SecretId: this.secret_id,
  //         SecretKey: this.secret_key,
  //         token: this.options.token
  //     });

  //     camRole.bindSLSQcsRole();

  //     const pubComVersionRequest = {
  //         Name: name,
  //         ComponentVersion: componentVersion,
  //         Org: org,
  //         Author: author,
  //         Description: description,
  //         Keywords: keywords,
  //         License: license
  //     }

  //     const req = new SlsModels.PublishComponentVersionRequest()
  //     req.from_json_string(JSON.stringify(pubComVersionRequest));
  //     return await this._call('PublishComponentVersion', req);
  // }

  // async fetchComponentMetadata(name, version) {
  //     const componentVersion = {
  //         Name: name,
  //         ComponentVersion: version
  //     }
  //     const req = new SlsModels.FetchComponentMetadataRequest();
  //     req.from_json_string(JSON.stringify(componentVersion));
  //     return await this._call('FetchComponentMetadata', req);
  // }
}

module.exports = Serverless
