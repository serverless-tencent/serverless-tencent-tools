const { BindRole } = require('../sdk/cam/index').BindRole

class Role {
  async bindRole() {
    await new BindRole({
      SecretId: '',
      SecretKey: ''
    }).bindSLSQcsRole()
  }
}

const role = new Role()
role.bindRole()
