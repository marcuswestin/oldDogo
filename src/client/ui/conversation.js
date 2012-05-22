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
		renderContent(message)
	)
}

function renderContent(message) {
	var picSized = style({ width:150, height:100 })
	if (message.body) {
		return div('body', message.body)
	} else if (message.base64Picture) {
		return img(picSized, { src:message.base64Picture })
	} else if (message.payloadType == 'picture') {
		return img(picSized, { src:'/api/image?conversationId='+message.conversationId+'&pictureId='+message.payloadId+'&authorization='+encodeURIComponent(api.getAuth()) })
	}
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
	addMessage(message)
})

events.on('message.sent', function(message, toAccountId, toFacebookId) {
	if (!currentAccountId && toFacebookId && toFacebookId == currentFacebookId) {
		// A first message was sent to this facebook id, and the server responds with the newly created account id as well as the facebook id
		currentAccountId = toAccountId
	}
	if (currentAccountId != toAccountId) { return }
	loadAccountId(toAccountId, function(account) {
		if (account.memberSince) { return }
		promptInvite(message, account.accountId, account.facebookId)
	})
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

function promptInvite(message, accountId, facebookId) {
	return
	composer.hide()
	loadAccountId(accountId, function(account) {
		
		var $infoBar = $(div('dogo-info blue',
			div('invite',
				div('encouragement', 'Nice ', message.payloadType=='picture' ? 'Picture' : 'Message', '!'),
				div('personal', account.name, " doesn't have Dogo yet ..."),
				div('button', 'Send via Facebook', button(function() {
					// TODO events.on('facebook.dialogDidComplete', function() { ... })
					// https://developers.facebook.com/docs/reference/dialogs/requests/
					// https://developers.facebook.com/docs/mobile/ios/build/
				
					if (gState.facebookSession()) {
						bridge.command('facebook.setSession', gState.facebookSession())
					}
				
					var myAccount = gState.myAccount()
					var name = myAccount.firstName || myAccount.name
					if (message.body) {
						var text = name+' says: "'+message.body+'". Reply in style with Dogo!'
					} else {
						var text = 'sent you a drawing! Reply in style with Dogo'
					}
				
					bridge.command('facebook.dialog', {
						dialog: 'apprequests',
						params: {
							message: text,
							to: account.facebookId.toString(),
							data: JSON.stringify({ conversationId:message.conversationId })
							// frictionless:'1'
						}
					})
				}))
			)
		))
		$infoBar.insertAfter($ui.messages.find('.messageBubble')[0])
	})
}
