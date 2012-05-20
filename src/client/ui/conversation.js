var composer = require('./composer')

var currentAccountId
var currentFacebookId
var currentLastReadMessageId
var $ui

module.exports = {
	render:function($body, view) {
		currentAccountId = view.accountId
		currentFacebookId = view.facebookId
		currentLastReadMessageId = view.lastReadMessageId
		$ui = {}
		
		$body.append(
			div('conversation',
				$ui.wrapper=$(div('messagesWrapper', style({ height:viewport.height() - 45, overflow:'scroll' }),
					div('messages', style({ paddingBottom:44 }), function($messageList) {
						$ui.messageList = $messageList
						refreshMessages()
					})
				)),
				composer.render($ui, currentAccountId, currentFacebookId)
			)
		)
	}
}

function refreshMessages() {
	$ui.messageList.append(div('loading', 'Getting messages...'))
	var params = {
		withAccountId:currentAccountId,
		withFacebookId:currentFacebookId,
		lastReadMessageId:currentLastReadMessageId
	}
	api.get('messages', params, function(err, res) {
		if (err) { return error(err) }
		$ui.messageList.empty().append(map(res.messages, renderMessage))
		if (!res.messages.length) {
			$ui.messageList.append(div('ghostTown', 'Start the conversation - draw something!'))
		}
	})
}

function renderMessage(message) {
	var fromMe = (message.senderAccountId == gState.myAccount().accountId)
	return div('clear messageBubble ' + (fromMe ? 'fromMe' : ''),
		face.load(message.senderAccountId),
		message.body && div('body', message.body),
		message.payloadType == 'picture' && img(style({ width:150, height:100 }), { src:'/api/image?conversationId='+message.conversationId+'&pictureId='+message.payloadId+'&authorization='+encodeURIComponent(api.getAuth()) })
	)
}

function addMessage(message) {
	$ui.messageList.prepend(renderMessage(message))
	$ui.messageList.find('.ghostTown').remove()
}

events.on('push.message', function(message) {
	if (!currentAccountId || currentAccountId != message.senderAccountId) { return }
	addMessage(message)
})

events.on('message.sending', function(message) {
	if (message.body) {
		// Render text messages right away
		addMessage(message)
	}
})

events.on('message.sent', function(message, toAccountId, toFacebookId) {
	if (message.body) { return } // already rendered
	if (!currentAccountId && toFacebookId && toFacebookId == currentFacebookId) {
		// A first message was sent to this facebook id, and the server responds with the newly created account id as well as the facebook id
		currentAccountId = toAccountId
	}
	if (currentAccountId != toAccountId) { return }
	addMessage(message)
})

events.on('view.change', function() {
	currentAccountId = null
	currentFacebookId = null
	currentLastMessageId = null
	$ui = null
})

events.on('app.willEnterForeground', function() {
	if ($ui) { refreshMessages() }
})
