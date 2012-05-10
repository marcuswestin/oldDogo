var composer = require('./composer')

var messageList, currentConvo

module.exports = {
	render:function($body, view) {
		var convo = view.convo || {}
		var contact = view.contact || {}
		
		currentConvo = view.convo
		
		var $ui = {}
		
		$body.append(
			$ui.conversation = $(div('conversation',
				div('messagesWrapper', style({ height:viewport.height() - 45, overflow:'scroll' }),
					div('messages', style({ paddingBottom:44 }), function($messageList) {
						$ui.messageList = $messageList
						$ui.messageList.append(div('loading', 'Getting messages...'))
						var params = {
							withAccountId:convo.withAccountId,
							withFacebookId:contact.facebookId,
							lastReadMessageId:convo.lastReadMessageId
						}
						api.get('messages', params, function(err, res) {
							if (err) { return error(err) }
							if (convo.withAccountId) {
								loadAccount(convo.withAccountId, function(withAccount) {
									$ui.messageList.empty().append(map(res.messages, curry(renderMessage, withAccount)))
								})
							} else if (contact && contact.facebookId) {
								$ui.messageList.empty().append(map(res.messages, curry(renderMessage, contact)))
							}
						})
					})
				),
				composer.render($ui, convo, contact, renderMessage)
			))
		)
	}
}

function renderMessage(withAccount, message) {
	var fromMe = (message.senderAccountId == myAccount.accountId)
	var account = fromMe ? myAccount : withAccount
	return div('clear messageBubble ' + (fromMe ? 'fromMe' : ''),
		face.facebook(account),
		div('body', message.body)
	)
}

$(function() {
	onMessage(function(message) {
		if (!currentConvo || currentConvo.withAccountId != message.senderAccountId) { return }
		loadAccount(message.senderAccountId, function(fromAccount) {
			messageList.prepend(renderMessage(fromAccount, message))
		})
	})
})