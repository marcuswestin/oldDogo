var base64 = require('std/base64')

// import ./bridge
// import ./state
// import ./config
// 
module.exports = {
	post:post,
	get:get,
	getAuth:getAuth
}

function post(path, params, callback) {
	return send('POST', path, params, callback)
}

function get(path, params, callback) {
	return send('GET', path, params, callback)
}

function getAuth() {
	var authToken = gState.authToken()
	return authToken ? 'Basic '+base64.encode(authToken) : null
}

function send(method, path, params, callback) {
	if (!callback && typeof params == 'function') {
		callback = params
		delete params
	}
	var url = '/api/'+path
	var headers = { 'Authorization':getAuth(), 'X-Dogo-Mode':config.mode }
	if (method == 'post' && params) {
		params = JSON.stringify(params)
		headers['Content-Type'] = 'application/json'
	}
	return $.ajax({
		type:method,
		url:url,
		headers:headers,
		data:params,
		success:function(res) { callback && callback(null, res) },
		error:function(err) { callback && callback(err, null) }
	})
}
