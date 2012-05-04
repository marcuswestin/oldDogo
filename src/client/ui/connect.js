module.exports = {
	render: function(onConnected) {
		return div('connect',
			div(null, 'Connect', button(function() {
				bridge.command('facebook.connect', function(err, data) {
					if (err) { return error(err) }
					api.post('sessions', { facebookAccessToken:data.accessToken }, function(err, res) {
						if (err) { return error(err) }
						console.log("wee")
						onConnected(res)
					})
				})
			}))
		)
	}
}
