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
					var contactsById = state.get('contactsById')
					tag.append(map(res.conversations, function(convo) {
						var fromMe = (convo.withAccountId != convo.lastMessageFromId)
						var account = fromMe ? state.get('account') : contactsById[convo.withAccountId]
						return div('item clear',
							div('messageBubble ' + (fromMe ? 'fromMe' : ''),
								face.facebook(account),
								div('body', convo.lastMessageBody)
							)
						)
					}))
					if (res.conversations.length == 0) {
						tag.append(div('ghostTown', "Start a conversation with a friend below"))
					}
				})
			})),
			div(style({ height:4 })),
			section('friends', 'Friends', div(function(el) {
				setTimeout(function() {
					api.get('contacts', function(err, res) {
						if (err) { return error(err) }
						el.append(map(res.contacts, function(contact) {
							return div('item contact '+(contact.memberSice ? 'member' : ''), face.facebook(contact))
						}))
					})
				}, 1000)
			}))
		)
	}
}
