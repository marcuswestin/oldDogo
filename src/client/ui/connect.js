module.exports = {
	render: function(onConnected) {
		return div('connectView',
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
			})),
			div('notice',
				'When you connect, you agree to our ', link('Privacy Policy', '/privacy'), ' & ', link('Terms of Service', '/terms')
			)
		)
	},
	slideOut: function() {
		$('.connectView').css({
			'-webkit-transition': '-webkit-transform .4s ease-in-out',
			'-webkit-transform': 'translateY('+(-viewport.height())+'px)'
		})
		setTimeout(function() {
			$('.connectView').remove()
		}, 1000)
	}
}
