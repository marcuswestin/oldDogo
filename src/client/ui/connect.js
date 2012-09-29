module.exports = {
	render: function(onConnected) {
		
		var scroller = makeScroller({ duration:400, alwaysBounce:false })
		return div('connectView',
			div('logo', 'dogo'),
			scroller.renderBody(2, function(view, info) {
				switch (info.index) {
					case 0: return [
						div('slogan', 'express yourself'),
						div('button connect', 'Connect to Dogo', button(function() {
							var $el = $(this).text('Loading...')
							var connecting = false
							bridge.command('facebook.connect', { permissions:['email'] }, function(err, facebookSession) {
								if (err || !facebookSession) {
									$el.text('Try again')
									return
								}
								if (connecting) { return }
								connecting = true
								api.connect({ facebookSession:facebookSession }, function(err) {
									connecting = false
									if (err) {
										$el.text('Try again')
										return
									}
									$el.text('Connected!')
									scroller.push()
								})
							})
						})),
						div('notice',
							'When you connect, you agree to our ', link('Privacy Policy', '/privacy'), ' & ', link('Terms of Service', '/terms')
						)
					]
					case 1: return [
						div('slogan', 'Nice! Dogo is great', br(), 'with notifications:'),
						div('button', 'Enable Notifications', button(function() {
							bridge.command('push.register', function(err) {
								onConnected()
							})
						})),
						link('no thanks', function() {
							setTimeout(function() {
								if (!confirm("Without notifications your friends' messages won't arrive right away o_O")) { return }
								onConnected()
							})
						})
					]
				}
			})
		)
	},
	slideOut: function() {
		$('.connectView').css(translate.y(-viewport.height()))
		// Warning: Actually removing the conenct view after the transition has completed causes an error where the screen becomes unresponsive. ¿Que?
	}
}

events.on('push.registerFailed', function(info) {
	alert("Oh no! Notifications weren't enabled. Go to your phone's settings and enable notifications for Dogo.")
})
