var delayed = require('std/delayed')

module.exports = {
	render: function(onConnected) {
		
		var scroller = makeScroller({ duration:400, alwaysBounce:false })
		return div({ id:'connectView' }, viewport.fit, brandGradient([viewport.width() / 2, 150], 50),
			div('logoIcon', icon('logoIcon-blank', 128, 128, 48, 0, 0, 0)),
			div({ id:'logoName' }, icon('logoName', 166, 72, 64, 0, 0, 0), style(translate(0, 0, 1000))),
			scroller.renderBody(2, function(view, info) {
				switch (info.index) {
					case 0: return function() {
						var duration = 400
						return div(
							delayed(duration * 2, function($el) {
								$('#logoName').css(translate(0, -169, duration * 1.25))
								$el.append(div(style({ opacity:0, marginTop:300 }), style(transition('opacity', duration)),
									div('button connect',
										'Connect to ',
										div(icon('logoName', 56, 24), style({ display:'inline-block', marginTop:-6 }), style(translate.y(7))),
										button(function() {
										var $button = $(this).text('Connecting...').addClass('active')
										var connecting = false
										bridge.command('facebook.connect', { permissions:['email'] }, function(err, data) {
											var facebookSession = data.facebookSession
											if (err || !facebookSession || !facebookSession.accessToken) {
												$button.text('Try again').removeClass('active')
												return
											}
											if (connecting) { return }
											connecting = true
											$button.text('Loading...')
											api.connect({ facebookSession:facebookSession }, function(err) {
												connecting = false
												if (err) {
													$button.text('Try again').removeClass('active')
													return
												}
												$button.text('Connected!')
												scroller.push()
												events.fire('app.connected')
											})
										})
									})),
									div('notice',
										'When you connect, you agree to our ', link('Privacy Policy', '/privacy'), ' & ', link('Terms of Service', '/terms')
									),
									delayed(duration, function($register) {
										$register.css({ opacity:1 })
									})
								))
							})
						)
					}
					case 1: return div(style({ marginTop:300 }),
						div('button', 'Enable Notifications', button(function() {
							$(this).text('Enabling...').addClass('active')
							bridge.command('push.register', function(err) {
								onConnected()
							})
						})),
						link('noNotifications', 'no thanks', function() {
							setTimeout(function() {
								var warning = "You must enable notifications for Dogo to work properly"
								return alert(warning)
								// if (!confirm(warning)) { return }
								onConnected()
							})
						})
					)
				}
			})
		)
	},
	slideOut: function() {
		var duration = 750
		$('#connectView')
			.css(transition('opacity', duration)).css('opacity', 0)
		setTimeout(function() {
			$('#connectView').css(translate.y(-viewport.height()-100, 0))
		}, duration)
		// Warning: Actually removing the conenct view after the transition has completed causes an error where the screen becomes unresponsive. ¿Que?
	}
}

events.on('push.registerFailed', function(info) {
	alert("Oh no! Notifications were not enabled. Go to your settings app and enable notifications for Dogo.")
})
