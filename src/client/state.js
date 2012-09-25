gState = {
	cache: {},
	set: function(key, value) {
		gState.cache[key] = value
		bridge.command('state.set', { key:key, value:value })
	},
	clear: function(callback) {
		gState.cache = {}
		bridge.command('state.clear', callback)
	},
	load:function(key, callback) {
		bridge.command('state.load', { key:key }, function(err, res) {
			gState.cache[key] = res
			callback(res)
		})
	},
	getSessionInfo:function(key) {
		return (gState.cache['sessionInfo'] || {})[key]
	},
	myAccount:function() {
		return gState.getSessionInfo('myAccount')
	},
	facebookSession:function() {
		return gState.getSessionInfo('facebookSession')
	},
	nextClientUid:function() {
		var sessionInfo = gState.getSessionInfo()
		if (sessionInfo.clientUidBlock.start == sessionInfo.clientUidBlock.end) {
			alert("We're sorry, you must re-install the app to send more messages. Our bad!")
			throw new Error("Ran out of UIDs")
		}
		var clientUid = sessionInfo.clientUidBlock.start = sessionInfo.clientUidBlock.start + 1
		gState.set('sessionInfo', sessionInfo)
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
