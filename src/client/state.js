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
	cache: {}
}
