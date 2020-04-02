const { Capi } = require('@tencent-sdk/capi');

const ApiRequest = function (auth, func, Region, debugOptions) {
    const { SecretId, SecretKey } = auth
    const Token = auth.Token || auth.token
    const body = {
        FunctionName: func.functionName || func.FunctionName,
        Namespace: func.nameSpace || func.Namespace || 'default',
        Qualifier: func.Qualifier || func.qualifier || '$LATEST'
    }
    if (!SecretId || !SecretKey) {
        throw Error('The SecretId or SecretKey does not exist.');
    }
    if (!body.FunctionName) {
        throw Error('The FunctionName does not exist.');
    }

    this.client = new Capi({
        Region,
        SecretId,
        SecretKey,
        Token,
        ServiceType: 'scf',
        baseHost: 'tencentcloudapi.com'
    });
    this.commonParams = {
        Version: '2018-04-16',
        ...body
    }
    this.debugOptions = debugOptions
}

ApiRequest.prototype.request = async function (action, params) {
    const result = await this.client.request(
        {
            Action: action,
            ...this.commonParams,
            ...params,
        },
        this.debugOptions,
        true
    );
    if (result.Response && result.Response.Error) {
        throw Error(result.Response.Error.Message)
    }
    return result
}

ApiRequest.prototype.startDebugging = async function (params) {
    return this.request('StartDebugging', params);
}

ApiRequest.prototype.stopDebugging = async function (params) {
    return this.request('StopDebugging', params);
}

ApiRequest.prototype.getDebuggingInfo = async function (params) {
    const getDebuggingInfoPm = () => {
        return new Promise((resolve, reject) => {
            let debuggingInfo
            let count = 0
            let timer = setInterval(async () => {
                try {
                    count++
                    if (count > 20) {
                        clearInterval(timer)
                        resolve({
                            "Response":
                            {
                                "Error":
                                {
                                    "Code": "Timeout",
                                    "Message": "Get debugging info timeout."
                                }
                            }
                        })
                    }
                    debuggingInfo = await this.request('GetDebuggingInfo', params) || {}
                    const { Response = {} } = debuggingInfo
                    if (Response.Status === 'Active') {
                        resolve(Response.DebuggingInfo)
                        clearInterval(timer)
                    }
                } catch (e) {
                    clearInterval(timer)
                    reject(e)
                }
            }, 2000);
        })
    }
    return getDebuggingInfoPm()
}

ApiRequest.prototype.getFunction = async function (params) {
    const getInfoPm = () => {
        return new Promise((resolve, reject) => {
            let info
            let count = 0
            let timer = setInterval(async () => {
                try {
                    count++
                    if (count > 20) {
                        clearInterval(timer)
                        resolve()
                    }
                    info = await this.request('GetFunction', params) || {}
                    const { Response = {} } = info
                    if (Response.Status === 'Active') {
                        resolve()
                        clearInterval(timer)
                    }
                } catch (e) {
                    clearInterval(timer)
                    reject(e)
                }
            }, 2000);
        })
    }
    return getInfoPm()
}

module.exports = ApiRequest