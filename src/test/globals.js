tinyTest = require('tinyTest/tinyTest')
setup = tinyTest.setup
then = tinyTest.then
is = tinyTest.is
waitFor = tinyTest.waitFor
tap = tinyTest.tap
count = tinyTest.count
check = tinyTest.check

pushService = require('server/pushService')
pushService.testCount = 0
pushService.sendMessagePush = function() { pushService.testCount += 1 }

clientUid = function() { return clientUid._unique++ }
clientUid._unique = new Date().getTime()

var request = require('request')
api = {
	post: function(path, params, callback) { api.send('post', path, params, callback) },
	get: function(path, params, callback) {
		if (!callback) {
			callback = params
			delete params
		}
		api.send('get', path, params, callback)
	},
	send: function(method, path, params, callback) {
		if (!callback) {
			callback = params
			params = null
		}

		var auth = api.authToken ? (api.authToken + '@') : ''
		var url = 'http://'+auth+'localhost:'+gConfig.port+'/'+path
		if (method == 'GET') {
			var body = params ? JSON.stringify(params) : ''
			var qs = null
		} else {
			var body = ''
			var qs = params
		}
		var headers = {}
		if (body) {
			headers['Content-Type'] = 'application/json'
			headers['Content-Length'] = body.length
		}
		request[method]({ url:url, headers:headers, body:body, qs:qs }, function(err, res) {
			if (err) { return callback(err) }
			if (res.statusCode != 200) { return callback(new Error('Non-200 status code: '+res.statusCode+'. '+url)) }
			try { var data = JSON.parse(res.body) }
			catch(e) { return callback(e, null) }
			callback(null, data)
		})
	}
}
