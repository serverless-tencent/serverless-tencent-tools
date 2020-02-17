const util = require('util')
const tencentcloud = require('tencentcloud-sdk-nodejs')
const camCredential = tencentcloud.common.Credential
const camClient = tencentcloud.cam.v20190116.Client
const camModels = tencentcloud.cam.v20190116.Models
const clientProfile = require('tencentcloud-sdk-nodejs/tencentcloud/common/profile/client_profile.js')
const HttpProfile = require('tencentcloud-sdk-nodejs/tencentcloud/common/profile/http_profile.js')

class BindRole {
  constructor(credentials = {}) {
    this.credentials = credentials
    this.camClient = this.getCamClient()
  }

  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  getCamClient() {
    // create cam client
    const cred = this.credentials.token
      ? new camCredential(
          this.credentials.SecretId,
          this.credentials.SecretKey,
          this.credentials.token
        )
      : new camCredential(this.credentials.SecretId, this.credentials.SecretKey)
    const httpProfile = new HttpProfile()
    httpProfile.reqTimeout = 30
    return new camClient(cred, 'ap-guangzhou', new clientProfile('HmacSHA256', httpProfile))
  }

  async bindSLSQcsRole() {
    const rp = 200
    let roleName = 'SLS_QcsRole'
    let pageRoleCount = 200
    let hasRole = false
    const policyList = [
      'QcloudCOSFullAccess',
      'QcloudSCFFullAccess',
      'QcloudAPIGWFullAccess',
      'QcloudSSLFullAccess',
      'QcloudMongoDBFullAccess',
      'QcloudCDBFullAccess',
      'QcloudCKafkaFullAccess',
      'QcloudVPCFullAccess',
      'QcloudElasticsearchServiceFullAccess',
      'QcloudMonitorFullAccess',
      'PolicyForServerlessFramework'
    ]

    try {
      // 创建部分没有预置的policy
      const createPolicyModels = new camModels.CreatePolicyRequest()
      const createPolicyHandler = util.promisify(this.camClient.CreatePolicy.bind(this.camClient))
      const createBody = {
        PolicyName: 'PolicyForServerlessFramework',
        Description: 'Policy For Serverless Framework',
        PolicyDocument: JSON.stringify({
          version: '2.0',
          statement: [
            {
              effect: 'allow',
              action: ['cdn:*', 'beian:*', 'ssl:*'],
              resource: ['*']
            }
          ]
        })
      }
      createPolicyModels.from_json_string(JSON.stringify(createBody))
      await createPolicyHandler(createPolicyModels)
    } catch (e) {}

    // 寻找roleList，防止出现区分大小问题
    // 在cam测，role实际上是区分大小写，例如SLS_QcsRole和SLS_QCSRole就是两个角色
    // 但是cam在拉取role判断权限的时候，是不区分大小写，所以同时出现两个role，可能会提醒没权限
    try {
      const listRoleModels = new camModels.DescribeRoleListRequest()
      const listRoleHandler = util.promisify(this.camClient.DescribeRoleList.bind(this.camClient))
      const body = { Rp: rp, Page: 0 }
      while (!hasRole && pageRoleCount == 200) {
        try {
          body.Page = body.Page + 1
          listRoleModels.from_json_string(JSON.stringify(body))
          const pageRoleList = await listRoleHandler(listRoleModels)
          pageRoleCount = pageRoleList.List.length
          for (let i = 0; i < pageRoleList.List.length; i++) {
            if (roleName.toUpperCase() == pageRoleList.List[i].RoleName.toUpperCase()) {
              roleName = pageRoleList.List[i].RoleName // 查到不区分大小写的role，则使用该role
              hasRole = true
              break
            }
          }
        } catch (e) {}
        await this.sleep(340) // 有频率限制 1分3次
      }
    } catch (e) {}

    // 如果有有同样的role，则用已有的role
    // 如果没有或者查询失败，则尝试新建role
    if (!hasRole) {
      try {
        const createRoleModels = new camModels.CreateRoleRequest()
        createRoleModels.from_json_string(
          JSON.stringify({
            RoleName: roleName,
            Description: 'Serverless Framework QCS Role',
            PolicyDocument: JSON.stringify({
              version: '2.0',
              statement: [
                {
                  effect: 'allow',
                  principal: {
                    service: 'sls.cloud.tencent.com'
                  },
                  action: 'sts:AssumeRole'
                }
              ]
            })
          })
        )
        const createRoleHandler = util.promisify(this.camClient.CreateRole.bind(this.camClient))
        await createRoleHandler(createRoleModels)
      } catch (e) {}
    } else {
      // 如果有role，则需要查询已经存在的policy
      try {
        let pagePolicyCount = 200
        const body = { Rp: rp, Page: 0 }
        body.Page = 0
        const listAttachedRolePoliciesModels = new camModels.ListAttachedRolePoliciesRequest()
        const listAttachedRolePoliciesHandler = util.promisify(
          this.camClient.ListAttachedRolePolicies.bind(this.camClient)
        )
        body.RoleName = roleName
        while (pagePolicyCount == 200) {
          try {
            body.Page = body.Page + 1
            listAttachedRolePoliciesModels.from_json_string(JSON.stringify(body))
            const pagePolicyList = await listAttachedRolePoliciesHandler(
              listAttachedRolePoliciesModels
            )
            pagePolicyCount = pagePolicyList.List.length
            for (let i = 0; i < pagePolicyList.List.length; i++) {
              const temp = policyList.indexOf(pagePolicyList.List[i].PolicyName)
              if (temp != -1) {
                policyList[temp] = undefined // 如果已存在policy，则不再进行绑定，在待绑定列表移除
              }
            }
            await this.sleep(340) // 有频率限制 1分3次
          } catch (e) {}
        }
      } catch (e) {}
    }

    // 查询并绑定， 如果这一步出错，就可以直接抛错了
    const listPoliciesModels = new camModels.ListPoliciesRequest()
    const listPoliciesHandler = util.promisify(this.camClient.ListPolicies.bind(this.camClient))

    let pagePolicyCount = 200
    const policyDict = {}
    const body = { Rp: rp, Page: 0 }
    while (pagePolicyCount == 200) {
      try {
        body.Page = body.Page + 1
        listPoliciesModels.from_json_string(JSON.stringify(body))
        const pagePolicList = await listPoliciesHandler(listPoliciesModels)
        for (let i = 0; i < pagePolicList.List.length; i++) {
          policyDict[pagePolicList.List[i].PolicyName] = pagePolicList.List[i].PolicyId
        }
        pagePolicyCount = pagePolicList.List.length
        await this.sleep(340) // 有频率限制 1分3次
      } catch (e) {}
    }
    const attachRolePolicyModels = new camModels.AttachRolePolicyRequest()
    const attachRolePolicyHandler = util.promisify(
      this.camClient.AttachRolePolicy.bind(this.camClient)
    )
    const attachRolePolicyBody = {
      AttachRoleName: roleName
    }
    for (let i = 0; i < policyList.length; i++) {
      try {
        if (policyList[i]) {
          attachRolePolicyBody.PolicyId = policyDict[policyList[i]]
          attachRolePolicyModels.from_json_string(JSON.stringify(attachRolePolicyBody))
          await attachRolePolicyHandler(attachRolePolicyModels)
          await this.sleep(340)
        }
      } catch (e) {}
    }
  }
}

module.exports = {
  BindRole
}
