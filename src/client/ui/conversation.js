var composer = require('./composer')

var currentAccountId
var currentFacebookId
var currentLastReadMessageId
var $ui

module.exports = {
	render:function($body, view) {
		currentAccountId = view.accountId
		currentFacebookId = view.facebookId
		currentLastReadMessageId = view.lastReadMessageId
		$ui = {}
		
		$body.append(
			div('conversation',
				$ui.info = $(div('info')),
				$ui.wrapper=$(div('messagesWrapper', style({ height:viewport.height() - 45, overflowY:'scroll', overflowX:'hidden' }),
					$ui.invite=$(div('invite')),
					div('messages', $ui.messages = list({ items:[], onSelect:selectMessage, renderItem:renderMessage }))
				)),
				composer.render($ui, currentAccountId, currentFacebookId)
			)
		)
		
		refreshMessages()
	}
}

$('body').on('touchmove', '.conversation', function() {
	composer.hide()
})

function selectMessage(message, _, $el) {
	if (message.pictureId || message.base64Picture) {
		composer.selectDraw($el.find('.messageBubble .picture')[0], message)
	} else {
		// do nothing
	}
}

function refreshMessages() {
	loading(true)
	var params = {
		withAccountId:currentAccountId,
		withFacebookId:currentFacebookId,
		lastReadMessageId:currentLastReadMessageId
	}
	api.get('messages', params, function(err, res) {
		loading(false)
		if (err) { return error(err) }
		$ui.messages.empty().prepend(res.messages)
		if (res.messages.length) {
			$ui.wrapper.scrollTop($ui.messages.height())
		} else {
			$ui.info.empty().append(div('ghostTown', 'Start the conversation - draw something!'))
		}
	})
}

function renderMessage(message) {
	var fromMe = (message.senderAccountId == gState.myAccount().accountId)
	var typeClass = message.body ? 'text' : 'picture'
	return div(div('clear messageBubble ' + typeClass + (fromMe ? ' fromMe' : ''),
		face.loadAccount(message.senderAccountId),
		renderContent(message)
	))
}

function picSize(message) {
	var maxWidth = 275
	var maxHeight = 275
	var width = message.pictureWidth
	var height = message.pictureHeight
	var ratio = 1
	if (width > maxWidth) {
		width = maxWidth
		ratio = width / message.pictureWidth
		height = Math.round(message.pictureHeight * ratio)
	}
	var offset = height > maxHeight ? -Math.floor((height - maxHeight) / 2) : 0
	return style({ width:width, height:Math.min(height, maxHeight), backgroundSize:width+'px '+height+'px', backgroundPosition:'0 '+offset+'px' })
}

function renderContent(message) {
	if (message.body) {
		return div('body', message.body)
	} else if (message.base64Picture) {
		return div('picture', picSize(message), style({
			backgroundImage:'url('+message.base64Picture+')'
		}))
	} else if (message.pictureId) {
		var url = '/api/image?conversationId='+message.conversationId+'&pictureId='+message.pictureId+'&pictureSecret='+message.pictureSecret+'&authorization='+encodeURIComponent(api.getAuth())
		return div('picture', picSize(message), style({
			backgroundImage:'url('+url+')'
		}))
	}
}

function addMessage(message) {
	$ui.wrapper.find('.ghostTown').remove()
	$ui.messages.append(message)
	if ($ui.wrapper.scrollTop() + $ui.wrapper.height() + gScroller.$head.height() > $ui.messages.height()) {
		$ui.wrapper.scrollTop($ui.messages.height())
	}
}

events.on('push.message', function(message) {
	if (!currentAccountId || currentAccountId != message.senderAccountId) { return }
	addMessage(message)
})

events.on('message.sending', function(message) {
	$ui.info.empty()
	addMessage(message)
})

events.on('message.sent', function(message, toAccountId, toFacebookId) {
	if (!currentAccountId && toFacebookId && toFacebookId == currentFacebookId) {
		// A first message was sent to this facebook id, and the server responds with the newly created account id as well as the facebook id
		currentAccountId = toAccountId
	}
	if (currentAccountId != toAccountId) { return }
	loadAccountId(toAccountId, function(account) {
		if (account.memberSince) { return }
		promptInvite(message, account.accountId, account.facebookId)
	})
})

events.on('view.change', function() {
	currentAccountId = null
	currentFacebookId = null
	currentLastMessageId = null
	$ui = null
})

events.on('app.willEnterForeground', function() {
	if ($ui) { refreshMessages() }
})

function promptInvite(message, accountId, facebookId) {
	return
	composer.hide()
	loadAccountId(accountId, function(account) {
		
		var $infoBar = $(div(transition('height', 500), div('dogo-info blue',
			div('invite',
				div('encouragement', 'Nice ', message.pictureId ? 'Picture' : 'Message', '!'),
				div('personal', account.name.split(' ')[0], " doesn't have Dogo yet."),
				div('button', 'Send on Facebook', button(function() {
					// TODO events.on('facebook.dialogDidComplete', function() { ... })
					// https://developers.facebook.com/docs/reference/dialogs/requests/
					// https://developers.facebook.com/docs/mobile/ios/build/
				
					if (gState.facebookSession()) {
						bridge.command('facebook.setSession', gState.facebookSession())
					}
				
					var myAccount = gState.myAccount()
					var name = myAccount.firstName || myAccount.name
					if (message.body) {
						var text = name+' says: "'+message.body+'". Reply in style with Dogo!'
					} else {
						var text = 'sent you a drawing! Reply in style with Dogo'
					}
				
					bridge.command('facebook.dialog', {
						dialog: 'apprequests',
						params: {
							message: text,
							to: account.facebookId.toString(),
							data: JSON.stringify({ conversationId:message.conversationId })
							// frictionless:'1'
						}
					})
				}))
			)
		)))
		$infoBar.css({ height:0, overflowY:'hidden' }).insertBefore($ui.messages.find('.messageBubble')[0])
		setTimeout(function() {
			$infoBar.css({ height:$infoBar.find('.dogo-info').height() + 30 })
		}, 500)
	})
}
