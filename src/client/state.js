gState = {
	set: function(key, value) {
		gState.cache[key] = value
		bridge.command('state.set', { key:key, value:value })
	},
	clear: function() {
		gState.cache = {}
		bridge.command('state.clear')
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
