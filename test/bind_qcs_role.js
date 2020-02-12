const { BindRole } = require('../sdk/cam/index').BindRole

class Role {
  async bindRole() {
    new BindRole({
      SecretId: '',
      SecretKey: ''
    }).bindQcsRole()
  }
}

const role = new Role()
role.bindRole()
