var state = module.exports = {
	cache: {},
	set: function(key, value) {
		state.cache[key] = value
		bridge.command('state.set', { key:key, value:value })
	},
	clear: function(callback) {
		state.cache = {}
		bridge.command('state.clear', callback)
	},
	get:function(key) {
		return state.cache[key]
	},
	load:function(key, callback) {
		if (state.cache[key]) {
			callback(state.cache[key])
		} else {
			bridge.command('state.load', { key:key }, function(err, res) {
				state.cache[key] = res
				callback(res)
			})
		}
	},
	getSessionInfo:function(key) {
		return (state.cache['sessionInfo'] || {})[key]
	},
	myAccount:function() {
		return state.getSessionInfo('myAccount')
	},
	facebookSession:function() {
		return state.getSessionInfo('facebookSession')
	},
	nextClientUid:function() {
		var sessionInfo = state.getSessionInfo()
		if (sessionInfo.clientUidBlock.start == sessionInfo.clientUidBlock.end) {
			alert("We're sorry, you must re-install the app to send more messages. Our bad!")
			throw new Error("Ran out of UIDs")
		}
		var clientUid = sessionInfo.clientUidBlock.start = sessionInfo.clientUidBlock.start + 1
		state.set('sessionInfo', sessionInfo)
		return clientUid
	},
	checkNewVersion:function() {
		api.get('version/info', function(err, res) {
			if (err || !res.url) { return }
			bridge.command('version.download', { url:res.url, headers:api.getHeaders() }, function(err) {
				if (err) { alert('upgrade failed ' + err) }
				else { alert("upgrade done") }
			})
		})
	}
}
