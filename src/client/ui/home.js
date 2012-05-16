var conversation = require('./conversation')

var $ui

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
		
		$ui = {}
		
		$(body).append(div('home',
			$ui.conversations=$(section('conversations', null, div(function($tag) {
				$tag.append(div('loading', 'Loading...'))
				api.get('conversations', function(err, res) {
					if (err) { return error(err) }
					var messages = map(res.conversations, function(convo) {
						var hasUnread = (!convo.lastReadMessageId && convo.lastReceivedMessageId)
							|| (convo.lastReadMessageId < convo.lastReceivedMessageId)
						return { hasUnread:hasUnread, accountId:convo.withAccountId, body:convo.lastReceivedBody, lastReceivedMessageId:convo.lastReceivedMessageId }
					})
					$tag.empty().append(
						$ui.conversationList=list(messages, selectMessage, renderBubble)
					)
					if (res.conversations.length == 0) {
						$tag.append(div('ghostTown', "Start a conversation with a friend below"))
					}
				})
			}))),
			div(style({ height:4 })),
			section('friends', 'Friend', 
				list(contactsByFacebookId, selectContact, function(contact) {
					// if (contact.memberSince) {
						return div('contact', face.facebook(contact, true))
					// }
				})
			)
		))
		
		function selectMessage(message) {
			var accountId = message.accountId
			var account = contactsByAccountId[accountId]
			var title = (account ? account.name : 'Friend')
			var conversation = { accountId:accountId }
			scroller.push({ title:title, conversation:conversation })
			$ui.conversations.find('#'+bubbleId(accountId)).removeClass('hasUnread')
		}

		function selectContact(contact) {
			var conversation = { accountId:contact.accountId, facebookId:contact.facebookId, title:contact.name }
			scroller.push({ conversation:conversation })
			$ui.conversations.find('#'+bubbleId(contact.accountId)).removeClass('hasUnread')
		}
	}
}

function renderBubble(message) {
	return div('clear messageBubble', { id:bubbleId(message.accountId) }, function($bubble) {
		if (!accountKnown(message.accountId)) {
			$bubble.append(div('loading', 'Loading...'))
		}
		loadAccountId(message.accountId, function(account) {
			$bubble.empty().append(
				div('unreadDot'),
				face.facebook(account),
				div('name', account.name),
				div('body', message.body
					? message.body
					: div('youStarted', "You started the conversation.")
				)
			)

			if (message.hasUnread) { $bubble.addClass('hasUnread') }
		})
	})
}

function bubbleId(withAccountId) { return 'conversation-bubble-'+withAccountId }

events.on('push.message', function(message) {
	if (!$ui) { return }
	$ui.conversations.find('#'+bubbleId(message.senderAccountId)).remove()
	var currentConvo = scroller.current().conversation
	var isCurrent = currentConvo && (currentConvo.accountId == message.senderAccountId) // TODO also check facebookId
	$ui.conversationList.prepend({ accountId:message.senderAccountId, body:message.body, hasUnread:!isCurrent })
})
