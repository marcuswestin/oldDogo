module.exports = {
	render: function() {
		return div('connect',
			div(null, 'Connect', button(function() {
				bridge.command('facebook.connect', function(err, data) {
					if (err) { return error(err) }
					api.post('sessions', { facebookAccessToken:data.accessToken })
				})
			}))
		)
	}
}
