module.exports = {
	render: function(onConnected) {
		return div('connect',
			div(null, 'Connect', button(function() {
				var $el = $(this).text('Loading...').addClass('disabled')
				bridge.command('facebook.connect', function(err, data) {
					if (err) {
						$el.text('Try again').removeClass('disabled')
						return error(err)
					}
					api.post('sessions', { facebookAccessToken:data.accessToken }, function(err, res) {
						if (err) {
							$el.text('Try again').removeClass('disabled')
							return error(err)
						}
						$el.text('Connected!')
						onConnected(res)
					})
				})
			}))
		)
	}
}
