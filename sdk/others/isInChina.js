const { DataReport } = require('../others/dataReport')

class IsInChina {
  async inChina() {
    try {
      new DataReport().report({ name: 'DetectChinaUser' })
    } catch (e) {}

    let result
    try {
      result =
        new Date().getTimezoneOffset() == -480 || String(process.env.LC_CTYPE).indexOf('zh_CN')
    } catch (e) {
      result = false
    }
    return { IsInChina: result }
  }
}

module.exports = IsInChina
