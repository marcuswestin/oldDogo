var base64 = require('std/base64')

// import ./bridge
// import ./state
// import ./config
// 
module.exports = {
	post:post,
	get:get
}

function post(path, params, callback) {
	return send('POST', path, params, callback)
}

function get(path, params, callback) {
	return send('GET', path, params, callback)
}

function send(method, path, params, callback) {
	if (!callback) {
		callback = params
		delete params
	}
	var url = '/api/'+path
	var authToken = state.get('authToken')
	var auth = authToken ? 'Basic '+base64.encode(authToken) : null
	var headers = { 'Authorization':auth, 'X-Dogo-Mode':config.mode }
	if (method == 'post' && params) {
		params = JSON.stringify(params)
		headers['Content-Type'] = 'application/json'
	}
	return $.ajax({
		type:method,
		url:url,
		headers:headers,
		data:params,
		success:function(res) { callback(null, res) },
		error:function(err) { callback(err, null) }
	})
}
