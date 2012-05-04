var trim = require('std/trim'),
	placeholder = 'Say something :)'

var messageList 

module.exports = {
	render:function(view) {
		var textInput
		var convo = view.convo || {}
		var contact = view.contact || {}
		console.log("HERE", contact)
		return div('conversation',
			div('messagesWrapper', style({ height:viewport.height() - 80, overflow:'scroll' }),
				div('messages', style({ paddingBottom:70 }),
					function(tag) {
						messageList = tag
						tag.append(div('loading', 'Getting messages...'))
						var params = {
							withAccountId:convo.withAccountId,
							withFacebookId:contact.facebookId
						}
						api.get('messages', params, function(err, res) {
							if (err) { return error(err) }
							tag.empty().append(map(res.messages, renderMessage))
						})
					}
				)
			),
			div('composer',
				textInput=textarea('bodyInput', { placeholder:placeholder }),
				div('send', 'Send', button(function() {
					var body = trim($(textInput).val())
					$(textInput).val('')
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
					messageList.prepend(renderMessage(message))
				}))
			)
		)
	}
}

function renderMessage(message) {
	var fromMe = (message.senderAccountId == myAccount.accountId)
	var account = fromMe ? myAccount : contactsByAccountId[message.senderAccountId]
	return div('clear messageBubble ' + (fromMe ? 'fromMe' : ''),
		face.facebook(account),
		div('body', message.body)
	)
}

$(function() {
	onMessage(function(message) {
		if (messageList) {
			messageList.prepend(renderMessage(message))
		}
	})
})