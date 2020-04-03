const ApiRequest = require('./lib/apiRequest')
const WshubClient = require('./lib/client')

const RemoteDebug = function(auth, func, Region = 'ap-guangzhou') {
  this.auth = auth
  this.func = func
  this.Region = Region
  this.request = new ApiRequest(auth, func, Region)
}

RemoteDebug.prototype.remoteDebug = async function() {
  try {
    await this.request.ensureFunctionState()
    await this.request.startDebugging()
    await this.request.ensureDebuggingState()
    const {
      DebuggingInfo: { Url, Token }
    } = await this.request.getDebuggingInfo()
    if (!Url || !Token) {
      throw Error('Get debugging info error: the remote Url or Token does not exist.')
    }
    this.client = new WshubClient({ Url, Token })
    try {
      await this.client.forwardDebug()
      console.log('Debugging listening on ws://127.0.0.1:9222.')
      console.log('For help see https://nodejs.org/en/docs/inspector.')
      console.log(
        'Please open chorme, and visit chrome://inspect, click [Open dedicated DevTools for Node] to debug your code.'
      )
    } catch (e) {
      console.error('Debug init error. Please confirm if the local port 9222 is used')
    }
    console.log('--------------------- The realtime log ---------------------')
    await this.client.forwardLog()
  } catch (e) {
    console.error(e.message)
  }
}

RemoteDebug.prototype.stop = async function() {
  try {
    if (this.client) {
      this.client.close()
    }
    const { Status } = await this.request.getDebuggingInfo()
    if (Status === 'Active') {
      await this.request.ensureFunctionState()
      await this.request.stopDebugging()
    }
  } catch (e) {
    console.error(e.message)
  }
}

module.exports = RemoteDebug
