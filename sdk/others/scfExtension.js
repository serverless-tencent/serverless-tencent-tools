'use strict'
const util = require('util')
const assert = require('assert')
const fs = require('fs')
const { scf, common } = require('../../library')
const HttpConnection = common.HttpConnection
const ScfClient = scf.v20180416.Client
const ScfModels = scf.v20180416.Models
const Sign = require('../../library/common/sign')
const Credential = common.Credential
const HttpProfile = common.HttpProfile
const ClientProfile = common.ClientProfile
const TencentCloudSDKHttpException = require('../../library/common/exception/tencent_cloud_sdk_exception')


class ScfEx {
  constructor({ appid, secret_id, secret_key, options }) {
    this.appid = appid
    this.secretKey = secret_key
    this.secretId = secret_id
    this.options = options
    assert(options, 'Options should not is empty')
    this._scfClient = ScfEx.createClient(secret_id, secret_key, options)
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
    const info = ScfEx.getCredential(secret_id, secret_key, options)
    const scfCli = new ScfClient(info.cred, info.region, info.clientProfile)
    scfCli.sdkVersion = 'ServerlessFramework'
    return scfCli
  }

  async publishLayerVersion({layerName, compatibleRuntimes, zipFilePath, description, licenseInfo}) {
    const req = {}

    assert(layerName, 'The request is missing a required parameter layerName')
    assert(compatibleRuntimes, 'The request is missing a required parameter compatibleRuntimes')
    assert(zipFilePath, 'The request is missing a required parameter zipFilePath')

    try {
      fs.existsSync(zipFilePath)
    } catch(err) {
      assert(false, err)
    }
    const stat = fs.statSync(zipFilePath)
    assert(stat.size <= (10 * 1024 * 1024), 'The request is layer file size limit exceed, max size 10MB')
    
    req.Content = {
      ZipFile: fs.readFileSync(zipFilePath).toString('base64')
    };
    req.LayerName = layerName;
    if (description)
        req.Description = description;
    req.CompatibleRuntimes = compatibleRuntimes;
    if (licenseInfo)
      req.LicenseInfo = licenseInfo

    const newDate = new Date();
    const sign = Sign.signv3(
      {secretKey: this.secretKey, secretId: this.secretId},
      this._scfClient.getEndpoint(),
      newDate, JSON.stringify(req))

    const headers = {
      'X-TC-Action': 'PublishLayerVersion',
      'X-TC-RequestClient': 'ServerlessFramework',
      'X-TC-Timestamp': Math.ceil(newDate.getTime() / 1000),
      'X-TC-Version': '2018-04-16',
      'X-TC-Region': this.options.region,
      'Host': this._scfClient.getEndpoint(),
      'Authorization': sign
    }
    
    const optional = {
      timeout: 30 * 1000,
      headers: headers
    }

    return new Promise((resolve, reject) => {
      HttpConnection.doRequest(
        'POST',
        'https://' + this._scfClient.getEndpoint() + '/',
        req,
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
}

module.exports = ScfEx