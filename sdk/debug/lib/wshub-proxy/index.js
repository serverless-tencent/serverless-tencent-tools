"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var HttpsProxyAgent = require("https-proxy-agent");
function createProxyAgent() {
    var _a = process.env, http_proxy = _a.http_proxy, HTTP_PROXY = _a.HTTP_PROXY, https_proxy = _a.https_proxy, HTTPS_PROXY = _a.HTTPS_PROXY;
    var proxy = http_proxy || HTTP_PROXY || https_proxy || HTTPS_PROXY;
    if (!proxy) {
        return false;
    }
    return new HttpsProxyAgent(proxy);
}
exports.default = createProxyAgent;
