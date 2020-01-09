const util = require('util')
const request = require('request')
const os = require('os')
const uuidv4 = require('uuid/v4')
const QRCode = require('qrcode')
const apiBaseUrl = 'http://scfdev.tencentserverless.com'
const apiShortUrl = apiBaseUrl + '/login/url'
const refreshTokenUrl = apiBaseUrl + '/login/info'

class Login {
  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  async getShortUrl(uuid) {
    return new Promise((done) => {
      const shortUrl = util.format('%s?os=%s&uuid=%s', apiShortUrl, os.type(), uuid)
      request(shortUrl, (error, response, body) => {
        if (error) {
          done(false)
          return
        }

        if (response.statusCode != 200) {
          done(false)
          return
        }
        try {
          done(JSON.parse(body))
        } catch (e) {
          done(false)
          return
        }
      })
    })
  }

  async checkStatus(uuid, url) {
    return new Promise((done) => {
      const tokenUrl = util.format('%s%s', apiBaseUrl, url)
      request(tokenUrl, (error, response, body) => {
        if (error) {
          done(false)
          return
        }

        if (response.statusCode != 200) {
          done(false)
          return
        }
        try {
          done(JSON.parse(body))
        } catch (e) {
          done(false)
          return
        }
      })
    })
  }

  async flush(uuid, expired, signature, appid) {
    return await new Promise((done) => {
      const flushUrl = `${refreshTokenUrl}?uuid=${uuid}&os=${os.type()}&expired=${expired}&signature=${signature}&appid=${appid}`
      request(flushUrl, (error, response, body) => {
        if (error) {
          done(false)
          return
        }
        if (response.statusCode != 200) {
          done(false)
          return
        }
        try {
          done(JSON.parse(body))
        } catch (e) {
          done(false)
          return
        }
      })
    })
  }

  async login() {
    try {
      const uuid = uuidv4()
      const apiUrl = await this.getShortUrl(uuid)

      QRCode.toString(apiUrl.short_url, { type: 'terminal' }, function(err, url) {
        console.log(url)
      })

      console.log('Please scan QR code login from wechat. ')
      console.log('Wait login...')
      // wait 3s start check login status
      await this.sleep(3000)

      let loginFlag = false
      let timeout = 600
      let loginData
      while (timeout > 0) {
        loginData = await this.checkStatus(uuid, apiUrl.login_status_url)
        if (loginData != false) {
          loginFlag = true
          break
        }
        timeout--
        await this.sleep(1000)
      }
      if (loginFlag == false && timeout == 0) {
        console.log('Login timeout. Please login again! ')
        process.exit(0)
      }
      const configure = {
        secret_id: loginData.secret_id,
        secret_key: loginData.secret_key,
        token: loginData.token,
        appid: loginData.appid,
        signature: loginData.signature,
        expired: loginData.expired,
        uuid: uuid
      }
      console.log('Login successful for TencentCloud. ')
      return configure
    } catch (e) {
      console.log(e.message)
    }
    process.exit(0)
  }

  async loginUrl() {
    try {
      const uuid = uuidv4()
      const apiUrl = await this.getShortUrl(uuid)
      return {
        login_status_url: apiUrl.login_status_url,
        uuid: uuid,
        url: apiUrl.long_url,
        short_url: apiUrl.short_url
      }
    } catch (e) {
      console.log(e.message)
    }
  }
}

module.exports = Login
