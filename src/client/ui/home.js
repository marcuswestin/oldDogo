var bodies = {}

module.exports = {
	render:function() {
		var section = function(className, label, content) {
			return div('section clear',
				div('header',
					div('label', label)
				),
				div('section '+className,
					content
				)
			)
		}
		
		var loading
		return div('list',
			loading=div('loading', 'Loading...'),
			sec=section('conversations', 'Conversations', div(function(tag) {
				api.get('conversations', function(err, res) {
					loading.remove()
					if (err) { return error(err) }
					tag.append(list(res.conversations, selectConvo, function(convo) {
						var fromMe = (convo.withAccountId != convo.lastMessageFromId)
						var account = fromMe ? myAccount : contactsByAccountId[convo.withAccountId]
						return div('clear messageBubble ' + (fromMe ? 'fromMe' : ''),
							face.facebook(account),
							bodies[account.accountId]=div('body', convo.lastMessageBody)
						)
					}))
					if (res.conversations.length == 0) {
						tag.append(div('ghostTown', "Start a conversation with a friend below"))
					}
				})
			})),
			div(style({ height:4 })),
			section('friends', 'Friends', 
				list(contactsByFacebookId, selectContact, function(contact) {
					return div('contact', face.facebook(contact, true))
				})
			)
		)
	}
}

function selectConvo(convo) {
	var contact = contactsByAccountId[convo.withAccountId]
	scroller.push({ convo:convo, title:contact.name })
}

function selectContact(contact) {
	console.log('selectContact', contact)
	scroller.push({ contact:contact, title:contact.name })
}

$(function() {
	onMessage(function(message) {
		if (bodies[message.senderAccountId]) {
			$(bodies[message.senderAccountId].empty()).text(message.body)
		}
	})	
})
