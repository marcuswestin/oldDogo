gState = {
	set: function(key, value) {
		gState.cache[key] = value
		bridge.command('state.set', { key:key, value:value })
	},
	clear: function(callback) {
		gState.cache = {}
		bridge.command('state.clear', callback)
	},
	load:function(callback) {
		bridge.command('state.load', function(err, res) {
			if (err) { return callback(err) }
			gState.cache = res || {}
			callback(null)
		})
	},
	authToken:function() {
		var sessionInfo = gState.cache['sessionInfo']
		return sessionInfo && sessionInfo['authToken']
	},
	myAccount:function() {
		var sessionInfo = gState.cache['sessionInfo']
		return sessionInfo && sessionInfo['myAccount']
	},
	facebookSession:function() {
		var sessionInfo = gState.cache['sessionInfo']
		return sessionInfo && sessionInfo['facebookSession']
	},
	nextClientUid:function() {
		var sessionInfo = gState.cache['sessionInfo']
		if (sessionInfo.clientUidBlock.start == sessionInfo.clientUidBlock.end) {
			alert("We're sorry, you must re-install the app to send more messages. Our bad!")
			throw new Error("Ran out of UIDs")
		}
		var clientUid = sessionInfo.clientUidBlock.start = sessionInfo.clientUidBlock.start + 1
		gState.set('sessionInfo', sessionInfo)
		return clientUid
	},
	cache: {},
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
