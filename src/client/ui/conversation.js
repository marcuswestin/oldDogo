var composer = require('./composer')

var messageList
var currentAccountId
var currentFacebookId

module.exports = {
	render:function($body, view) {
		var accountId = view.accountId
		var facebookId = view.facebookId
		
		currentAccountId = accountId
		currentFacebookId = facebookId
		
		var $ui = {}
		
		$body.append(
			div('conversation',
				$ui.wrapper=$(div('messagesWrapper', style({ height:viewport.height() - 45, overflow:'scroll' }),
					div('messages', style({ paddingBottom:44 }), function($messageList) {
						messageList = $ui.messageList = $messageList
						if (accountId) {
							$ui.messageList.append(div('loading', 'Getting messages...'))
							var params = {
								withAccountId:view.accountId,
								lastReadMessageId:view.lastReadMessageId
							}
							api.get('messages', params, function(err, res) {
								if (err) { return error(err) }
								loadAccountId(accountId, function(withAccount) {
									$ui.messageList.empty().append(map(res.messages, curry(renderMessage, withAccount)))
								})
							})
						} else {
							$ui.messageList.append(div('loading', 'Start the conversation - draw something!'))
						}
					})
				)),
				composer.render($ui, accountId, facebookId, renderMessage)
			)
		)
	}
}

function renderMessage(withAccount, message) {
	var myAccount = gState.myAccount()
	var fromMe = (message.senderAccountId == myAccount.accountId)
	var account = fromMe ? myAccount : withAccount
	
	return div('clear messageBubble ' + (fromMe ? 'fromMe' : ''),
		face.facebook(account),
		message.body && div('body', message.body),
		message.payloadType == 'picture' && img(style({ width:150, height:100 }), { src:'/api/image?conversationId='+message.conversationId+'&pictureId='+message.payloadId+'&authorization='+encodeURIComponent(api.getAuth()) })
	)
}

events.on('push.message', function(message) {
	if (!currentAccountId || currentAccountId != message.senderAccountId) { return }
	loadAccountId(message.senderAccountId, function(fromAccount) {
		messageList.prepend(renderMessage(fromAccount, message))
	})
})
