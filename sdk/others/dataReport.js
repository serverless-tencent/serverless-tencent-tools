const request = require('request')
const os = require('os')

class DataReport {
	async report(uin, client, action) {
		var url = 'http://service-ocnymoks-1258344699.gz.apigw.tencentcs.com/release/dataReport'
		var requestData = {
			uin: uin,
			os_platform: os.platform(),
			os_release: os.release(),
			os_type: os.type(),
			client: client,
			action: action
		}
		request(
			{
				url: url,
				method: 'POST',
				json: true,
				headers: {
					'content-type': 'application/json'
				},
				body: requestData
			}
		)
		return true
	}
}

module.exports = {
	DataReport
}
