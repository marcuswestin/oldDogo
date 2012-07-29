var base64 = require('std/base64')

// import ./bridge
// import ./state
// import ./config
// 
module.exports = {
	post:post,
	get:get,
	getAuth:getAuth,
	getHeaders:getHeaders,
	setHeaders:setHeaders,
	connect:connect
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
	var headers = getHeaders()
	if (method == 'post' && params) {
		params = JSON.stringify(params)
		headers['Content-Type'] = 'application/json'
	}
	return $.ajax({
		type:method,
		url:url,
		headers:headers,
		data:params,
		success:function(res, textStatus, xhr) { handleResponse(callback, null, res, xhr) },
		error:function(xhr, textStatus, err) { handleResponse(callback, textStatus || err, null, xhr) }
	})
}

var baseHeaders = {}
function setHeaders(headers) {
	baseHeaders = headers
}

function getHeaders() {
	return $.extend({ 'Authorization':getAuth() }, baseHeaders)
}

function handleResponse(callback, err, res, xhr) {
	try {
		var process = xhr.getResponseHeader('X-Dogo-Process')
		if (process) { eval(process) }
	} catch(e) {}
	callback && callback(err, res)
}

function connect(opts, callback) {
	var facebookAccessToken = opts.facebookSession && opts.facebookSession.accessToken
	api.post('sessions', { facebookAccessToken:facebookAccessToken, facebookRequestId:opts.facebookRequestId }, function(err, res) {
		if (err) { return callback(err) }
		var contacts = res.contacts
		var contactsByAccountId = gState.cache['contactsByAccountId'] || {}
		var contactsByFacebookId = gState.cache['contactsByFacebookId'] || {}
		each(contacts, function(contact) {
			if (contact.accountId) {
				contactsByAccountId[contact.accountId] = contact
			}
			contactsByFacebookId[contact.facebookId] = contact
		})

		gState.set('contactsByAccountId', contactsByAccountId)
		gState.set('contactsByFacebookId', contactsByFacebookId)
		gState.set('sessionInfo', { myAccount:res.account, authToken:res.authToken, facebookSession:opts.facebookSession })
		callback(null)
	})
}