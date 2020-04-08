const util = require('util')
const { CamV2Client } = require('../../library/tencent-cloud/client')

class BindRole {
  constructor(credentials = {}) {
    this.credentials = credentials
  }

  async bindSLSQcsRole() {
    const roleName = 'SLS_QcsRole'
    const camClient = new CamV2Client(this.credentials)
    try {
      await camClient.request({
        Action: 'CreateRole',
        roleName: roleName,
        policyDocument: JSON.stringify({
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
    } catch (e) {}

    try {
      await camClient.request({
        Action: 'AttachRolePolicies',
        roleName: roleName,
        'policyId.0': '219188',
        'policyId.1': '534122',
        'policyId.2': '4917788',
        'policyId.3': '29828213',
        'policyId.4': '16026171',
        'policyId.5': '219185',
        'policyId.6': '534788',
        'policyId.7': '186451',
        'policyId.8': '2851631',
        'policyId.9': '276210',
        'policyId.10': '32475945'
      })
    } catch (e) {}
  }

  async bindSCFQcsRole() {
    const roleName = 'SCF_QcsRole'
    const camClient = new CamV2Client(this.credentials)
    try {
      await camClient.request({
        Action: 'CreateRole',
        roleName: roleName,
        policyDocument: JSON.stringify({
          version: '2.0',
          statement: [
            {
              effect: 'allow',
              principal: {
                service: 'scf.qcloud.com'
              },
              action: 'sts:AssumeRole'
            }
          ]
        })
      })
    } catch (e) {}

    try {
      await camClient.request({
        Action: 'AttachRolePolicies',
        roleName: roleName,
        'policyId.0': '28341895'
      })
    } catch (e) {}
  }
}

module.exports = {
  BindRole
}
