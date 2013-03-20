var base64 = require('std/base64')

module.exports = {
	post:post,
	get:get,
	send:send,
	sendRequest:sendRequest,
	getAuth:getAuth,
	getHeaders:getHeaders,
	setHeaders:setHeaders,
	// refresh:refresh,
	getUrl:getUrl,
	error:error
}

function post(path, params, callback) {
	return send('POST', path, params, callback)
}

function get(path, params, callback) {
	return send('GET', path, params, callback)
}

function getAuth() {
	return sessionInfo ? sessionInfo.authorization : null
}

function getUrl(path) {
	return (gConfig.serverUrl || '') + getPath(path)
}

function getPath(path) {
	return (path[0] == '/' ? path : '/'+path)
}

function send(method, path, params, callback) {
	if (!callback && typeof params == 'function') {
		callback = params
		delete params
	}
	return sendRequest({
		method:method,
		url:getPath(path),
		jsonParams:params,
		callback:callback
	})
}

function sendRequest(opts) {
	var headers = getHeaders()
	if (opts.method == 'POST' && opts.jsonParams) {
		opts.jsonParams = JSON.stringify(opts.jsonParams)
		headers['Content-Type'] = 'application/json'
	}
	return $.ajax({
		type:opts.method,
		url:opts.url,
		headers:headers,
		data:opts.jsonParams,
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
	var auth = getAuth()
	return $.extend(auth ? { 'Authorization':auth } : {}, baseHeaders)
}

function handleResponse(jqXhr, url, callback, err, res) {
	try {
		var process = jqXhr.getResponseHeader('X-Dogo-Process')
		if (process) { eval(process) }
	} catch(e) {}
	callback && callback(err, res)
}

function error(err) {
	if (!err) { err = {} }
	if (err.responseText) {
		return err.responseText
	} else if (err.statusText) {
		return err.statusText
	} else if (err.status) {
		return err.status
	} else if (err.message) {
		return err.message
	} else if (typeof err == 'string') {
		return err
	} else {
		return 'Woops! We did something wrong. Please try again.'
	}
}

