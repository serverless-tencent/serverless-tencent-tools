# 腾讯云工具集 For Serverless Framework

## 开发背景
目前腾讯云有很多部分不能彻底满足Serverless Framework，所以针对Serverless Framework做了很多基础能力的建设。建设的这些成果，都会统一增加到该SDK中。

## 已支持能力

- [实时日志功能](#实时日志功能)
- [获取用户信息](#获取用户信息)
- [一键登录功能](#一键登录功能)
- [检测用户实名](#检测用户实名)
- [判断中国用户](#判断中国用户)


## 基本功能

### 实时日志功能
基本使用方法(getAddr)：
```javascript
const tencentCloudTools = require('../../serverless-tencent-tools')
const scfRealTimeLogs = tencentCloudTools.Logs.ScfRealTimeLogs
const region = 'ap-aaaaa'
const auth = {
  SecretId: '****',
  SecretKey: '*****'
}
const func = {
  functionName: 'course'
}
console.log(scfRealTimeLogs.getAddr(auth, func, region))

```
输出结果：
```
ws://service-qwh371t8-1258344699.gz.apigw.tencentcs.com/release/websocket?Action=GetFunctionLogs&FunctionName=course&Namespace=default&Nonce=32932&Qualifier=$LATEST&Region=ap-guangzhou&RequestClient=ServerlessFramework&SecretId=AKID1ynRAoVcoqrDUbwR9RbcS7mKrOl1q0kK&Signature=crrcT%2B6y%2FYIZecEKyd8GgWQ0BM%2B%2FOdH3E4ZbjDddFHo%3D&SignatureMethod=HmacSHA256&Timestamp=1576723081&Version=2018-04-16&Timeout=600&AppidSignature=%26Action%3DGetUserAppId%26Nonce%3D44632%26Region%3Dap-guangzhou%26RequestClient%3DSDK_NODEJS_3.0.104%26SecretId%3DAKID1ynRAoVcoqrDUbwR9RbcS7mKrOl1q0kK%26Signature%3DO6xzhZZYm7j%252F9XROAcRAUpBFgNyXSj0dYer2JK8yfB8%253D%26SignatureMethod%3DHmacSHA256%26Timestamp%3D1576723081%26Version%3D2019-01-16
```
输入参数：

| 参数 | 必须 | 默认 | 描述 | 
| --- | --- | --- | ---|
| region | 否 | ap-guangzhou | 地域 |
| auth | 是 | - | 鉴权信息 |
| func | 是 | - | 函数信息 |
| timeout | 否 | 600s | 超时时间（超过600s停止日志获取） |

auth参数描述：

| 参数 | 必须 | 默认 | 描述 | 
| --- | --- | --- | ---|
| SecretId | 是 | - | 用户密钥Id |
| SecretKey | 是 | - | 用户密钥Key |
| token | 否 | - | 临时密钥需要传递此参数 |

func参数描述：

| 参数 | 必须 | 默认 | 描述 | 
| --- | --- | --- | ---|
| functionName | 是 | - | 地域 |
| nameSpace | 否 | default | 命名空间 |
| qualifier | 否 | $LATEST | 版本 |

输出参数：

出参只有一个websocket地址，只需要对此地址发起websocket请求即可获得到实时日志。

### 获取用户信息
通过此接口，可以获得到用户的基本信息，包括Appid，Uin和主账号Uin

基本使用方法(getUserInformation)：
```javascript
const { GetUserInformation } = require('../sdk/cam/index')

class UserInformation {
  async getUserInformation() {
    const userInformation = new GetUserInformation()
    const auth = {
      SecretId: '****',
      SecretKey: '****'
    }
    console.log(await userInformation.getUserInformation(auth))
  }
}

const getUserInformation = new UserInformation()
getUserInformation.getUserInformation()


```
输出结果：
```
GetUserInformationResponse {
  RequestId: 'd10abbd5-300a-4436-ab6b-9f3db0fcf011',
  OwnerUin: '100005358439',
  Uin: '100005358439',
  AppId: 1256773370
}
```
输入参数：

| 参数 | 必须 | 默认 | 描述 | 
| --- | --- | --- | ---|
| SecretId | 是 | - | 用户密钥Id |
| SecretKey | 是 | - | 用户密钥Key |
| token | 否 | - | 临时密钥需要传递此参数 |

输出参数：

| 参数 | 描述 | 
| --- | --- | 
| RequestId |  请求Id |
| OwnerUin | OwnerUin |
| Uin | 用户Uin |
| AppId | 用户的AppId |

### 一键登录功能

通过该功能可以通过扫码获取临时密钥，并进行相关操作。

基本使用方法（login）:
```javascript
const Login = require('../sdk/login')

class doLogin {
  async login() {
    const login = new Login()
    const tencent_credentials = await login.login()
    console.log(tencent_credentials)
  }
}

const tencentLogin = new doLogin()
tencentLogin.login()

```
输出结果：
```      
 这里会展示一个二维码                  
Please scan QR code login from wechat. 
Wait login...
Login successful for TencentCloud. 
{
  secret_id: '*********',
  secret_key: '*********',
  token: '*********',
  appid: 1253970226,
  signature: '*********',
  expired: 1576744591,
  uuid: '*********'
}
```

输出参数：

| 参数 | 描述 | 
| --- | --- | 
| secret_id |  临时SecretId |
| secret_key | 临时SecretKey |
| token | token, 临时密钥使用云API时，需要此参数参与签名 |
| appid | 用户的AppId |
| signature | 签名，用于更新临时密钥，一次有效 |
| expired | 服务端密钥生成时间戳 |
| uuid | uuid，用于更新临时密钥，一次有效 |

上述方法获得到密钥对有效期为2小时，2小时之后会自动过期，此时可以从新扫码登录，也可以刷新密钥对：

基本使用方法(flush)：
```javascript
const Login = require('../sdk/login')

class doLogin {
  async flush() {
    const login = new Login()
    const uuid = '*********'
    const expired = 1576744591
    const signature = '*********'
    const appid = 1253970226
    const tencent_credentials = await login.flush(uuid, expired, signature, appid)
    console.log(tencent_credentials)
  }
}

const tencentLogin = new doLogin()
tencentLogin.flush()

```
输出结果：
```
{
  appid: '1253970226',
  expired: 1576745081,
  secret_id: '***********',
  secret_key: '*********',
  signature: '*********',
  success: true,
  token: '********'
}

```

输入参数：

| 参数 | 必须 | 默认 | 描述 | 
| --- | --- | --- | ---|
| uuid | 是 | - | uuid, 使用一键登录时可获得到此参数 |
| expired | 是 | - | 服务端时间戳, 使用一键登录时可获得到此参数 |
| signature | 是 | - | 签名, 使用一键登录时可获得到此参数，一次有效 |
| appid | 是 | - | 用户的AppId |

输出参数：

| 参数 | 描述 | 
| --- | --- | 
| secret_id |  临时SecretId |
| secret_key | 临时SecretKey |
| token | token, 临时密钥使用云API时，需要此参数参与签名 |
| appid | 用户的AppId |
| signature | 签名，用于更新临时密钥，一次有效 |
| expired | 服务端密钥生成时间戳 |
| success | 刷新状态 |

除了在命令行（终端）中使用一键登录，一键登录功能也适用于网页中二维码登录。

基本使用方法(loginUrl)：
```javascript
const Login = require('../sdk/login')

class doLogin {
  async getUrl() {
    const login = new Login()
    console.log(await login.loginUrl())
  }
}

const tencentLogin = new doLogin()
tencentLogin.getUrl()
```
输出结果：
```
{
  login_status_url: '/login/status?uuid=***********&os=Darwin&expired=1576752276&signature=***********',
  uuid: '***********',
  url: 'https://cloud.tencent.com/open/authorize?scope=login&app_id=100005789219&redirect_url=http%3A%2F%2Fscfdev.tencentserverless.com%2Flogin%2Fsuccess%3Fuuid%3D***********%26os%3DDarwin%26expired%3D1576752276%26key%***********',
  short_url: 'https://url.cn/5kbghL'
}
```
输出参数：

| 参数 | 描述 | 
| --- | --- | 
| login_status_url |  用户获取结果 |
| uuid | 生成的uuid，用户获取结果 |
| url | 原始地址 |
| short_url | 短网址 |

在获得到上述地址之后，可以打开`url`或者`short_url`的地址进行授权（也可以将则个地址转化为二维码进行扫码授权），授权之后可以通过以下方法获取结果。

基本使用方法(checkStatus)：
```javascript
const Login = require('../sdk/login')

class doLogin {
  async getResult() {
    const login = new Login()
    const uuid = '***********'
    const login_status_url =
      '/login/status?uuid=**********&os=Darwin&expired=1576752024&signature=*********'
    console.log(await login.checkStatus(uuid, login_status_url))
  }
}

const tencentLogin = new doLogin()
tencentLogin.getResult()

```
输出结果：
```
{
  appid: '1253970226',
  expired: 1576745081,
  secret_id: '***********',
  secret_key: '*********',
  signature: '*********',
  success: true,
  token: '********'
}
```

输出参数：

| 参数 | 描述 | 
| --- | --- | 
| secret_id |  临时SecretId |
| secret_key | 临时SecretKey |
| token | token, 临时密钥使用云API时，需要此参数参与签名 |
| appid | 用户的AppId |
| signature | 签名，用于更新临时密钥，一次有效 |
| expired | 服务端密钥生成时间戳 |
| uuid | uuid，用于更新临时密钥，一次有效 |


### 检测用户实名

通过此接口，可以判断用户是否在腾讯云实名认证

基本使用方法(GetUserAuthInfo)：
```javascript
const { GetUserAuthInfo } = require('../sdk/account/index')

class UserAuthInfo {
  async getUserAuth() {
    const getUserAuthInfo = new GetUserAuthInfo()
    const uin = 123456787890
    console.log(await getUserAuthInfo.isAuth(uin))
  }
}

const userAuthInfo = new UserAuthInfo()
userAuthInfo.getUserAuth()


```
输出结果：
```
{
  RequestId: '434cde3a-3112-11ea-8e4f-0242cb007104',
  Error: false,
  Message: { Authentication: '0' }
}

```
输入参数：

| 参数 | 必须 | 默认 | 描述 | 
| --- | --- | --- | ---|
| uin | 是 | - | 用户的uin（主uin） |

输出参数：

| 参数 | 描述 | 
| --- | --- | 
| Authentication |  0表示未认证，1表示已认证 |


### Websocket Api

create websocket instance

```javascript
const {Apigateway} = require('serverless-tencent-tools');

const ws = new Apigateway.Websocket(tencent_could_secret_id, tencent_could_secret_key, tencent_could_tmp_token, 'ap-guangzhou');

// create a websocket instance
const result = await ws.create();
console.log(result);
// result:
// {
//   address: 'ws://service-xxx-xxx.gz.apigw.tencentcs.com/release/websocket',
//   serviceId: 'service-xxx',
//   apiId: 'api-xxx',
//   scf: {
//     register: {
//       functionName: 'scf_ws_create_1580968283',
//       namspace: 'default',
//       qualifier: '$LATEST'
//     },
//     data: {
//       functionName: 'scf_ws_data_1580968283',
//       namspace: 'default',
//       qualifier: '$LATEST'
//     },
//     destroy: {
//       functionName: 'scf_ws_destroy_1580968283',
//       namspace: 'default',
//       qualifier: '$LATEST'
//     }
//   }
// }

// clean websocket all resource
await ws.destroy(result.serviceId, result.apiId, result.scf);
```

### 判断中国用户

该接口可以判断是否是中国用户

基本使用方法(IsInChina)：
```javascript
const Others = require('../sdk/others')

class OthersAction {
	async getIsInChina() {
		const isInChina = new Others.IsInChina()
		const inChina = await isInChina.inChina()
		console.log(inChina)
	}
}

new OthersAction().getIsInChina()

```

输出结果：
```javascript
{ IsInChina: true }
```

输出参数：

| 参数 | 描述 | 
| --- | --- | 
| IsInChina | 输出参数true或false，如果是true，表示是中国用户，否则表示非中国用户 |


（* 该接口目前为1.0版本，后期会增加其复杂度，但是接口规范不会变。）
