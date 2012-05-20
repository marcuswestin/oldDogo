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
					$ui.invite=$(div('invite')),
					div('messages', style({ paddingBottom:44 }), function($messageList) {
						$ui.messages = $messageList
						refreshMessages()
					})
				)),
				composer.render($ui, currentAccountId, currentFacebookId)
			)
		)
	}
}

function refreshMessages() {
	$ui.messages.append(div('loading', 'Getting messages...'))
	var params = {
		withAccountId:currentAccountId,
		withFacebookId:currentFacebookId,
		lastReadMessageId:currentLastReadMessageId
	}
	api.get('messages', params, function(err, res) {
		if (err) { return error(err) }
		$ui.messages.empty().append(map(res.messages, renderMessage))
		if (!res.messages.length) {
			$ui.messages.append(div('ghostTown', 'Start the conversation - draw something!'))
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
	$ui.messages.prepend(renderMessage(message))
	$ui.messages.find('.ghostTown').remove()
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
	if (!currentAccountId && toFacebookId && toFacebookId == currentFacebookId) {
		// A first message was sent to this facebook id, and the server responds with the newly created account id as well as the facebook id
		currentAccountId = toAccountId
	}
	if (currentAccountId != toAccountId) { return }
	loadAccountId(toAccountId, function(account) {
		if (account.memberSince) { return }
		promptInvite(account.accountId, account.facebookId)
	})
	if (message.body) { return } // already rendered
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

function promptInvite(accountId, facebookId) {
	return; // Disabled for now
	composer.hide()
	loading($ui.invite)
	loadAccountId(accountId, function(account) {
		$ui.invite.empty().append(div(
			div('encouragement', 'Nice!'),
			div('personal', account.name, " hasn't downloaded Dogo yet."),
			div('button', 'Tell them!', button(function() {
				// TODO events.on('facebook.dialogDidComplete', function() { ... })
				// https://developers.facebook.com/docs/reference/dialogs/requests/
				// https://developers.facebook.com/docs/mobile/ios/build/
				bridge.command('facebook.apprequests', {
					message:"I sent you a message on Dogo.",
					notification_text:"Get Dogo!",
					to:account.facebookId.toString()
				})
			}))
		))
	})
}
