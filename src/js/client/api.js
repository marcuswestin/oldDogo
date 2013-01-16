var base64 = require('std/base64')

module.exports = {
	post:post,
	get:get,
	send:send,
	sendRequest:sendRequest,
	getAuth:getAuth,
	getHeaders:getHeaders,
	setHeaders:setHeaders,
	connect:connect,
	// refresh:refresh,
	getPath:getPath,
	error:error
}

function post(path, params, callback) {
	return send('POST', path, params, callback)
}

function get(path, params, callback) {
	return send('GET', path, params, callback)
}

function getAuth() {
	var authToken = window.gState && gState.getSessionInfo('authToken')
	return authToken ? 'Basic '+base64.encode(authToken) : null
}

function getPath(path) {
	return '/'+path
}

function send(method, path, params, callback) {
	if (!callback && typeof params == 'function') {
		callback = params
		delete params
	}
	var url = getPath(path)
	var headers = getHeaders()
	if (method == 'post' && params) {
		params = JSON.stringify(params)
		headers['Content-Type'] = 'application/json'
	}
	return sendRequest({
		method:method,
		url:url,
		headers:headers,
		params:params,
		callback:callback
	})
}

function sendRequest(opts) {
	return $.ajax({
		type:opts.method,
		url:opts.url,
		headers:opts.headers,
		data:opts.params,
		success:function(res, textStatus, jqXhr) {
			handleResponse(jqXhr, opts.url, opts.callback, null, res)
		},
		error:function(jqXhr, textStatus, errorType) {
			var err = {
				responseText: jqXhr.responseText,
				statusText:jqXhr.statusText,
				status:jqXhr.status
			}
			
			var contentType = jqXhr.getResponseHeader('Content-Type')
			if (contentType == 'application/json') {
				try { err = JSON.parse(jqXhr.responseText) }
				catch(e) {}
			}
			
			handleResponse(jqXhr, opts.url, opts.callback, err, null)
		}
	})
}

var baseHeaders = {}
function setHeaders(headers) {
	baseHeaders = headers
}

function getHeaders() {
	return $.extend({ 'Authorization':getAuth() }, baseHeaders)
}

function handleResponse(jqXhr, url, callback, err, res) {
	try {
		var process = jqXhr.getResponseHeader('X-Dogo-Process')
		if (process) { eval(process) }
	} catch(e) {}
	callback && callback(err, res)
}

function connect(opts, callback) {
	var facebookSession = opts.facebookSession || {}
	var params = {
		facebookAccessToken:facebookSession.accessToken,
		facebookExpirationDate:facebookSession.expirationDate,
		facebookRequestId:opts.facebookRequestId
	}
	api.post('api/session', params, curry(handleSession, facebookSession, callback))
}

// function refresh(authToken, callback) {
// 	api.get('api/session', { authToken:authToken }, curry(handleSession, null, callback))
// }

function handleSession(facebookSession, callback, err, res) {
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
	gState.set('sessionInfo', {
		myAccount:res.account,
		authToken:res.authToken,
		facebookSession:facebookSession,
		clientUidBlock:res.clientUidBlock,
		picturesBucket:res.picturesBucket
	})
	callback(null)
}

function error(err) {
	if (!err) { err = {} }
	if (err.responseText) {
		return err.responseText
	} else if (err.statusText) {
		return err.statusText
	} else if (err.status) {
		return err.status
	} else if (typeof err == 'string') {
		return err
	} else {
		return 'Woops! We did something wrong. Please try again.'
	}
}

