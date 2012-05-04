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
	var url = '/api/'+path
	var auth = state.authToken ? 'Basic '+base64.encode(state.authToken) : null
	var headers = { 'Content-Type':'application/json', 'Authorization':auth, 'X-Dogo-Mode':config.mode }
	return $[method](url, params, callback, headers)
}
