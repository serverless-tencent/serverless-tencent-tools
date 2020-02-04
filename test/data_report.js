const {DataReport} = require('../sdk/others/index')

const dataReport = new DataReport.DataReport()
const uin = 123456787890
dataReport.report({name: "test_name", "uin": uin})
console.log("success")
