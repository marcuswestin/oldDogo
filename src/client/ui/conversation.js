var trim = require('std/trim'),
	placeholder = 'Say something :)'

var messageList, currentConvo

module.exports = {
	render:function(body, view) {
		var convo = view.convo || {}
		var contact = view.contact || {}
		var messagesTag
		
		currentConvo = view.convo
		
		$(body).append(div('conversation',
			messagesTag=div('messagesWrapper', style({ height:viewport.height() - 45, overflow:'scroll' }),
				div('messages', style({ paddingBottom:44 }),
					function($tag) {
						messageList = $tag
						$tag.append(div('loading', 'Getting messages...'))
						var params = {
							withAccountId:convo.withAccountId,
							withFacebookId:contact.facebookId,
							lastReadMessageId:convo.lastReadMessageId
						}
						api.get('messages', params, function(err, res) {
							if (err) { return error(err) }
							if (convo.withAccountId) {
								loadAccount(convo.withAccountId, function(withAccount) {
									$tag.empty().append(map(res.messages, curry(renderMessage, withAccount)))
								})
							} else if (contact && contact.facebookId) {
								$tag.empty().append(map(res.messages, curry(renderMessage, contact)))
							}
						})
					}
				)
			),
			div('composer', function(composer) {
				var input
				
				composer.append(
					div('body',
						input=textarea({ placeholder:placeholder }, button(function() {
							$input.focus()
						}))
					)
				)
				
				$input=$(input)
					.on('focus', function() {
						$(messagesTag)
							.css({ marginTop:215 })
							.scrollTop(1)
							.on('scroll', function() {
								if ($(messagesTag).scrollTop() == 0) {
									$(messagesTag).scrollTop(1)
								}
							})
					})
					.on('blur', function() {
						$(messagesTag)
							.css({ marginTop:0 })
							.off('scroll')
					})
				
				composer.append(div('send button', 'Send', button(function() {
					var body = trim($input.val())
					$input.val('')
					if (!body) { return }
					var message = {
						toAccountId:convo.withAccountId,
						toFacebookId:contact.facebookId,
						senderAccountId:myAccount.accountId,
						body:body
					}
					api.post('messages', message, function(err, res) {
						if (err) { return error(err) }
					})
					
					loadAccount(convo.withAccountId, function(withAccount) {
						messageList.prepend(renderMessage(withAccount, message))
					})
				})))
			})
		))
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