tinyTest = require('tinyTest/tinyTest')
setup = tinyTest.setup
then = tinyTest.then
is = tinyTest.is
waitFor = tinyTest.waitFor
tap = tinyTest.tap
count = tinyTest.count
check = tinyTest.check

clientUid = function() { return clientUid._unique++ }
clientUid._unique = new Date().getTime()

var request = require('request')
api = {
	post: function(path, params, callback) { api.send('post', path, params, callback) },
	get: function(path, params, callback) { api.send('get', path, params, callback) },
	send: function(method, path, params, callback) {
		if (!callback) {
			callback = params
			params = null
		}
		
		var auth = api.authToken ? (api.authToken + '@') : ''
		var url = 'http://'+auth+'localhost:'+gConfig.port+'/'+path
		if (method == 'post') {
			var body = params ? JSON.stringify(params) : ''
			var qs = null
		} else {
			var body = ''
			var qs = params
		}
		
		var headers = (body ? { 'Content-Type':'application/json', 'Content-Length':body.length } : {})
		request[method]({ url:url, headers:headers, body:body, qs:qs }, function(err, res, body) {
			if (err) { return callback(err) }
			if (res.statusCode != 200) { return callback('API responded with '+res.statusCode+'.\n'+body+'\n'+url+'\n') }
			try { var data = JSON.parse(res.body) }
			catch(e) { return callback(e, null) }
			callback(null, data)
		})
	}
}
