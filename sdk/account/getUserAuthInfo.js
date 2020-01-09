const request = require('request')

class GetUserAuthInfo {
  async isAuth(ownerUin) {
    var url = 'http://service-ocnymoks-1258344699.gz.apigw.tencentcs.com/release/getUserAuthInfo'
    var requestData = {
      uin: ownerUin
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
