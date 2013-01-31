module.exports = function renderPushNotifications(view, onDone) {
	return div(style({ marginTop:300 }),
		div('button', 'Enable Notifications', button(function() {
			$(this).text('Enabling...').addClass('active')
			bridge.command('push.register', function(err) { onDone() })
		})),
		link('noNotifications', 'no thanks', function() {
			setTimeout(function() {
				var warning = "You must enable notifications for Dogo to work properly"
				if (!confirm(warning)) { return }
				onDone()
			})
		})
	)
}

events.on('push.registerFailed', function(info) {
	alert("Oh no! Notifications were not enabled. Go to your settings app and enable notifications for Dogo.")
})
