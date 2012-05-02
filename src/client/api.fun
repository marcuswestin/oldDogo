import xhr
import ./bridge
import ./state

// TODO Rename to api
api = {
	post: function(path, params, callback) {
		return api._send('POST', path, params, callback)
	},
	get: function(path, params, callback) {
		return api._send('GET', path, params, callback)
	},
	_send: function(method, path, params, callback) {
		url = '/api/'+path
		auth = null
		token = state.authToken
		<script token=token auth=auth>
			token = token.evaluate()
			var authToken = token && token.getContent()
			if (!authToken) { return }
			var base64 = require('std/base64'),
				jsAuth = 'Basic '+base64.encode(authToken)
			auth.mutate('set', [fun.expressions.Text(jsAuth)])
		</script>
		headers = { 'Content-Type':'application/json', 'Authorization':auth }
		return xhr._send(method, url, params, callback, headers)
		return bridge.command('api.request', {
			url:url,
			method:method,
			params:params
		}, callback)
	}
}
