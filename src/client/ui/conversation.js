var composer = require('./composer')
var once = require('std/once')
var pictures = require('../../data/pictures')
var linkify = require('lib/linkify')

var currentView
var $ui

var convId = function() {
	return conversation.id(currentView, 'messages') // TODO remove
}

var conversation = module.exports = {
	id: function conversationId(convo, name) {
		return 'conv-'+name+'-'+(convo.accountId ? 'dogo-'+convo.accountId : 'fb-'+convo.facebookId)
	},
	render:renderConversation,
	refreshMessages:refreshMessages,
	addMessage:addMessage
}

function renderConversation(opts) {
	currentView = opts
	$ui = {}
	
	return div('conversation',
		$ui.info = $(div('info')),
		$ui.wrapper=$(div('messagesWrapper', style({ height:opts.height, 'overflow-y':'scroll', '-webkit-overflow-scrolling':'touch', overflowX:'hidden' }),
			$ui.invite=$(div('invite')),
			div('messages', $ui.messages = list({ items:opts.messages, onSelect:selectMessage, renderItem:renderMessage, getItemId:messageId }))
		)).on('scroll', checkScrollBounds),
		function() {
			setTimeout(function() {
				$ui.wrapper.scrollTop($ui.messages.height())
			}, 100)
			checkScrollBounds()
			opts.refreshMessages && refreshMessages()
		}
	)
}

function messageId(message) { return 'message-'+(message.id || message.localId) }

function selectMessage(message, _, $el) {
	if (message.pictureId || message.base64Picture) {
		composer.selectDraw($el.find('.messageBubble .pictureContent')[0], message)
	} else {
		// do nothing
	}
}

function refreshMessages() {
	if (!currentView) { return }
	var params = {
		withAccountId:currentView.accountId,
		withFacebookId:currentView.facebookId
	}
	var wasCurrentView = currentView
	loading(true)
	api.get('messages', params, function refreshRenderMessages(err, res) {
		loading(false)
		if (wasCurrentView != currentView) { return }
		if (err) { return error(err) }
		// var cachedMessages = gState.cache[convId()]
		// var lastCachedMessage = cachedMessages && cachedMessages[0]
		// var lastReceivedMessage = res.messages[0]
		// if (lastCachedMessage && lastReceivedMessage && lastCachedMessage.id == lastReceivedMessage.id) { return }
		$ui.messages.append(res.messages)
		if (!res.messages.length) {
			$ui.info.empty().append(div('ghostTown', 'Start the conversation - draw something!'))
		}
		$ui.wrapper.scrollTop($ui.messages.height())
		gState.set(convId(), res.messages)
	})
}

var checkScrollBounds = once(function checkScrollBounds() {
	if (!$ui.wrapper) { return }
	var pics = $ui.wrapper.find('.messageBubble .pictureContent')
	var viewHeight = $ui.wrapper.height()
	var viewTop = $ui.wrapper.scrollTop() - (viewHeight * 3/4) // preload 3/4 of a view above
	var viewBottom = viewTop + viewHeight + (viewHeight * 1/2) // prelado 1/2 of a view below
	for (var i=pics.length - 1; i >= 0; i--) { // loop in reverse order since you're likelier to be viewing the bottom of the conversation
		var pic = pics[i]
		var picTop = pic.offsetTop
		var picBottom = picTop + pic.offsetHeight
		if (picBottom > viewTop && picTop < viewBottom && pic.getAttribute('pictureUrl')) {
			pic.style.backgroundImage = 'url('+pic.getAttribute('pictureUrl')+')'
			pic.removeAttribute('pictureUrl')
		}
	}
})

function renderMessage(message) {
	var fromMe = (message.senderAccountId == currentView.myAccountId)
	var typeClass = message.body ? 'text' : 'picture'
	checkScrollBounds()
	return div(div('clear messageBubble ' + typeClass + (fromMe ? ' fromMe' : ''),
		face.loadAccount(message.senderAccountId),
		renderContent(message)
	))
}

function picSize(message) {
	var size = pictures.display.thumb
	return style({ width:size, height:size, backgroundSize:size+'px '+size+'px' })
}

function clipPicSize(message) {
	var maxWidth = pictures.display.thumb
	var maxHeight = pictures.display.thumb
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
		return div('textContent', linkify(message.body))
	} else if (message.pictureId) {
		var pictureUrl = pictures.urlFromMessage(message, pictures.pixels.thumb)
		return div('pictureContent', picSize(message), { pictureUrl:pictureUrl })
	} else {
		var pictureUrl = message.base64Picture
		return div('pictureContent', clipPicSize(message), { pictureUrl:pictureUrl })
	}
}

function onNewMessage(message) {
	$ui.wrapper.find('.ghostTown').remove()
	addMessage(message)
}

function addMessage(message) {
	var deltaFromBottom = Math.abs(($ui.wrapper.scrollTop() + $ui.wrapper.height()) - ($ui.messages.height() + 50))
	$ui.messages.append(message)
	if (deltaFromBottom < 100) {
		$ui.wrapper.scrollTop($ui.messages.height())
	}
}

events.on('push.message', function(message) {
	if (!currentView || !currentView.accountId || currentView.accountId != message.senderAccountId) { return }
	gState.cache[convId()].unshift(message)
	onNewMessage(message)
})

events.on('message.sending', function(message) {
	$ui.info.empty()
	onNewMessage(message)
	message.on('sent', function(response) {
		$('#'+messageId(message)).attr('id', messageId(response.message))
	})
})

events.on('message.sent', function(info) {
	var toAccountId = info.toAccountId
	var toFacebookId = info.toFacebookId
	if (!currentView) { return }
	if (!currentView.accountId && toFacebookId && toFacebookId == currentView.facebookId) {
		// A first message was sent to this facebook id, and the server responds with the newly created account id as well as the facebook id
		currentView.accountId = toAccountId
	}
	if (currentView.accountId != toAccountId) { return }
	var message = info.message
	gState.cache[convId()].unshift(message)
	loadAccountId(toAccountId, function(account) {
		if (account.memberSince) { return }
		if (info.disableInvite) { return }
		promptInvite(message, account.accountId, account.facebookId)
	})
})

events.on('view.change', function() {
	currentView = null
	$ui = {}
})

events.on('app.willEnterForeground', function() {
	refreshMessages()
})

function promptInvite(message, accountId, facebookId) {
	composer.hide()
	loadAccountId(accountId, function(account) {
		var $infoBar = $(div(transition('height', 500), div('dogo-info blue',
			div('invite',
				div('encouragement', 'Very Expressive!'),
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
						var text = 'sent you a drawing. Reply in style with Dogo!'
					}
					bridge.command('facebook.dialog', {
						dialog: 'apprequests',
						params: {
							message: text,
							to: account.facebookId.toString()
							// title: name+' sent you a...',
							// data: JSON.stringify({ conversationId:message.conversationId }),
							// frictionless:'1'
						}
					})
					events.once('facebook.dialogCompleteWithUrl', function(info) {
						var url = parseUrl(info.url)
						var facebookRequestId = url.getSearchParam('request')
						api.post('facebook_requests', { facebookRequestId:facebookRequestId, toAccountId:accountId, conversationId:message.conversationId }, function(err, res) {
							if (err) { return error(err) }
						})
					})
				}))
			)
		)))
		var messageBubbles = $ui.messages.find('.messageBubble')
		$infoBar.css({ height:0, overflowY:'hidden' }).append(messageBubbles[messageBubbles.length - 1])
		setTimeout(function() {
			$infoBar.css({ height:$infoBar.find('.dogo-info').height() + 30 })
		}, 500)
	})
}
