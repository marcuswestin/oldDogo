import ./bridge

net = {
	post: function(path, params, callback) {
		url = 'http://marcus.local:9090/api/'+path
		return bridge.command('net.request', { url:url, method:'POST', params:params }, callback)
	}
}
