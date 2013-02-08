require('server/globals')
tinyTest = require('tinyTest/tinyTest')
setup = tinyTest.setup
then = tinyTest.then
is = tinyTest.is
has = tinyTest.has
fail = tinyTest.fail
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
		
		if (method == 'post') {
			var body = params ? JSON.stringify(params) : ''
			var qs = null
		} else {
			var body = ''
			var qs = params
		}
		
		var headers = (body ? { 'Content-Type':'application/json', 'Content-Length':body.length } : {})
		request[method]({ url:_getUrl(path), headers:headers, body:body, qs:qs }, curry(_handleResponse, callback))
	},
	jsonMultipart:function(path, jsonParams, attachments, callback) {
		var headers = { 'content-type':'multipart/form-data' }
		var jsonPart = _makePart('attachment; name="jsonParams"', 'application/json', JSON.stringify(jsonParams))
		var multipart = [jsonPart].concat(map(attachments, function(data, name) {
			return _makePart('form-data; name="'+name+'" filename="'+name+'"', 'application/octet-stream', new Buffer(data))
		}))
		var form = request.post({ url:_getUrl(path), headers:headers, multipart:multipart }, curry(_handleResponse, callback))
	}
}

function _makePart(disposition, type, body) {
	return { 'content-disposition':disposition, 'content-type':type, 'body':new Buffer(body) }
}

function _getUrl(path) {
	return 'http://'+(api.authToken ? (api.authToken + '@') : '')+'localhost:'+gConfig.port+'/'+path
}

function _handleResponse(callback, err, res, body) {
	if (err) { return callback(err) }
	if (res.statusCode != 200) { return callback('API responded with '+res.statusCode+'.\n'+body+'\n') }
	try { var data = JSON.parse(res.body) }
	catch(e) { return callback(e, null) }
	callback(null, data)
}
