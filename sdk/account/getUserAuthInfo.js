const request = require('request')
const os = require('os')

class GetUserAuthInfo {
  async isAuth(ownerUin, inputs = {}) {
    var url = 'http://service-ocnymoks-1258344699.gz.apigw.tencentcs.com/release/getUserAuthInfo'
    var requestData = {
      uin: ownerUin,
      os_platform: os.platform(),
      os_release: os.release(),
      os_type: os.type(),
      client: inputs.client,
      remark: inputs.remark,
      pid: process.pid,
      project: inputs.project
    }

    return new Promise(function(resolve, rejecte) {
      request(
        {
          url: url,
          method: 'POST',
          json: true,
          headers: {
            'content-type': 'application/json'
          },
          body: requestData
        },
        function(error, response, body) {
          if (!error && response.statusCode == 200) {
            resolve(body)
          }
          rejecte('Get user auth info error')
        }
      )
    })
  }
}

module.exports = {
  GetUserAuthInfo
}
