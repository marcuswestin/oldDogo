var bodies = {}

module.exports = {
	render:function(body) {
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
		
		body.append(div('list',
			sec=section('conversations', 'Conversations', div(function(tag) {
				tag.append(div('loading', 'Loading...'))
				api.get('conversations', function(err, res) {
					if (err) { return error(err) }
					tag.empty().append(list(res.conversations, selectConvo, function(convo) {
						var withAccount = contactsByAccountId[convo.withAccountId]
						var fromMe = (convo.withAccountId != convo.lastMessageFromId)
						var fromAccount = fromMe ? myAccount : withAccount
						return div('clear messageBubble ',// + (fromMe ? 'fromMe' : ''),
							face.facebook(withAccount),
							div('name', withAccount.name),
							bodies[withAccount.accountId]=div('body', convo.lastMessageBody)
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
		))
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
