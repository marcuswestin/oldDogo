module.exports = {
	render:function() {
		var section = function(className, label, content) {
			return div('section clean',
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
					tag.append(map(res.conversations, function(convo) {
						return div('item',
							div('messageBubble', face.account(convo.withAccountId), convo.lastMessageBody)
						)
					}))
					if (res.conversations.length == 0) {
						tag.append(div('ghostTown', "Start a conversation with a friend below"))
					}
				})
			})),
			div(style({ height:4 })),
			section('friends', 'Friends', div(function(el) {
				api.get('contacts', function(err, res) {
					if (err) { return error(err) }
					el.append(map(res.contacts, function(contact) {
						return div('item contact '+(contact.memberSice ? 'member' : ''), face.facebook(contact))
					}))
				})
			}))
		)
	}
}
