var request = require('request')
var curry = require('std/curry')
var parseQueryString = require('querystring').parse
var facebookDevCache = require('./facebookDevCache')

module.exports = {
	get: curry(send, 'get'),
	post: curry(send, 'post')
}

function send(method, path, qsParams, callback) {
	if (facebookDevCache[method+path]) {
		return setTimeout(function() { callback(null, facebookDevCache[method+path]) })
	}
	request[method]({ url:'https://graph.facebook.com/' + path, qs:qsParams }, function(err, res) {
		if (err) { return callback(err) }
		try {
			if (res.headers['content-type'].match(/^text\/javascript/)) {
				var body = JSON.parse(res.body)
			} else {
				var body = parseQueryString(res.body)
			}
		} catch(e) {
			return callback(e)
		}
		callback(null, body)
	})
}
