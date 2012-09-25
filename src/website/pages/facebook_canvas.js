require('../../client/globals')
var conversation = require('../../client/ui/conversation')
var pictures = require('../../data/pictures')

error = function(err) {
	var message = api.error(err)
	alert(message)
}

;(function() {
	
	api.setHeaders({ 'x-dogo-client':'0.91.0-facebook_canvas' })
	pictures.bucket = 'dogo-dev-conv'
	
	var requestIds = parseUrl(location).getSearchParam('request_ids')
	viewport.fit($('#viewport'))
	setTimeout(function() {
		window.scrollTo(0, 1)
	})
	if (requestIds) {
		var facebookRequestId = requestIds.split(',').pop()
		api.connect({ facebookRequestId:facebookRequestId }, function(err, res) {
			if (err) { return error(err) }
			api.get('facebook_canvas/conversation', { facebookRequestId:facebookRequestId }, function(err, res) {
				if (err) { return error(err) }
				$('#viewport').append(
					div('dogoApp',
						conversation.render({
							messages:res.messages,
							myAccountId:res.facebookRequest.toAccountId,
							height:viewport.height()
						})
					),
					$(input('replyInput', style({ position:'absolute', bottom:0, left:0, display:'block', height:30, margin:'0 auto' }), { placeholder:'Reply' })).on('keypress', onKeyPress),
					div('button', 'Send', style({ width:40, position:'absolute', bottom:3, right:3, fontWeight:'bold' }), button(sendMessage))
				)
				viewport.react(function() {
					$('.replyInput').width(viewport.width() - 81)
				})
				
				function onKeyPress($e) {
					if ($e.keyCode != 13) { return }
					sendMessage()
				}
				
				function sendMessage() {
					var body = $('.replyInput').val()
					$('.replyInput').val('')
					var message = {
						toAccountId:res.facebookRequest.fromAccountId,
						senderAccountId:res.facebookRequest.toAccountId,
						body:body
					}
					conversation.addMessage(message)
					api.post('message', message, function(err, res) {
						if (err) { return error(err) }
					})
				}
			})
		})
	}

	console.log('requestIds', requestIds)
	// api.get('messages', {})
})()