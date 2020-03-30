const ApiRequest = require("./lib/apiRequest")
const WshubClient = require("./lib/client")

module.exports = {
    ApiRequest,
    WshubClient,
    remoteDebug: async function (auth, func, Region = 'ap-guangzhou') {
        try {
            const request = new ApiRequest(auth, func, Region)
            await request.startDebugging()
            const { Url, Token } = await request.getDebuggingInfo()
            if (!Url || !Token) {
                throw Error('Get debugging info error: the remote Url or Token does not exist.');
            }
            const client = new WshubClient({ Url, Token })
            try {
                await client.forwardDebug()
                console.log('Debugging listening on ws://127.0.0.1:9222.')
                console.log('For help see https://nodejs.org/en/docs/inspector.')
                console.log('Please open chorme, and visit chrome://inspect, click [Open dedicated DevTools for Node] to debug your code.')
            } catch (e) {
                console.error('Debug init error. Please confirm if the local port 9222 is used');
            }
            console.log('--------------------- The realtime log ---------------------')
            await client.forwardLog()
        } catch (e) {
            console.error(e.message)
        }

    },
    stop: async function (auth, func, Region = 'ap-guangzhou') {
        try {
            const request = new ApiRequest(auth, func, Region)
            return await request.stopDebugging()
        } catch (e) {
            console.error(e.message)
        }
    }
};
