var bodies = {}

module.exports = {
	render:function(body) {
		var section = function(className, headerLabel, content) {
			return div('section clear',
				headerLabel && div('header',
					div('label', headerLabel)
				),
				div('section '+className,
					content
				)
			)
		}
		
		body.append(div('home',
			sec=section('conversations', null, div(function(tag) {
				tag.append(div('loading', 'Loading...'))
				api.get('conversations', function(err, res) {
					if (err) { return error(err) }
					tag.empty().append(list(res.conversations, selectConvo, function(convo) {
						return div('clear messageBubble', function(bubble) {
							if (!accountKnown(convo.withAccountId)) {
								bubble.append(div('loading', 'Loading...'))
							}
							withAccount(convo.withAccountId, function(withAccount) {
								bubble.empty().append(
									div('unread-indicator'),
									face.facebook(withAccount),
									div('name', withAccount.name),
									bodies[withAccount.accountId]=div('body', convo.lastReceivedBody
										? convo.lastReceivedBody
										: div('youStarted', "You started the conversation.")
									)
								)
							})
						})	
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
	var account = contactsByAccountId[convo.withAccountId]
	scroller.push({ convo:convo, title:account ? account.name : 'Friend' })
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
