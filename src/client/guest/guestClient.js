require('client/misc/clientGlobals')

graphics.base += 'phone/'

events.on('app.start', startGuestClient)
bridge.init()

function startGuestClient() {
	var parts = parseUrl(location).pathname.split('/').slice(2) // /c/65538/1/gKHZy0G6cix9
	var conversationId = parseInt(parts[0])
	var guestIndex = parseInt(parts[1])
	var secret = parts[2]
	api.post('/api/guest/session', { conversationId:conversationId, guestIndex:guestIndex, secret:secret }, function(err, res) {
		if (err) { return error(err) }
		sessionInfo.save(res.sessionInfo, function(err) {
			if (err) { return callback(err) }
			api.get('/api/guest/messages', { conversationId:conversationId }, function(err, res) {
				if (err) { return callback(err) }
				$('#viewport').css(viewport.getSize()).empty().append(
					div(style({ background:'#fff' }), JSON.stringify(res.messages))
				)
			})
		})
	})
}
