const { DataReport } = require('../sdk/others/index')

const dataReport = new DataReport.DataReport()
const uin = 123456787890
dataReport.report(uin, "test_client", "test_action")
console.log("success")
