const { DataReport } = require('../others/dataReport')

class IsInChina {
  async inChina() {
    try {
      new DataReport().report({ name: 'DetectChinaUser' })
    } catch (e) {}

    const result =
      process.env.SLS_GEO_LOCATION === 'cn' ||
      new Intl.DateTimeFormat('en', { timeZoneName: 'long' })
        .format()
        .includes('China Standard Time')

    return { IsInChina: result }
  }
}

module.exports = IsInChina
