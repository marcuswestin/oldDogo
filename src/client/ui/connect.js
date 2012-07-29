module.exports = {
	render: function(body, onConnected) {
		$(body).append(div('connect',
			div('button', 'Connect', button(function() {
				var $el = $(this).text('Loading...').addClass('disabled')
				bridge.command('facebook.connect', { permissions:['email'] }, function(err, facebookSession) {
					if (err || !facebookSession) {
						$el.text('Try again').removeClass('disabled')
						return
					}
					api.connect({ facebookSession:facebookSession }, function(err) {
						if (err) {
							$el.text('Try again').removeClass('disabled')
							return
						}
						$el.text('Connected!')
						onConnected()
					})
				})
			}))
		))
	}
}
