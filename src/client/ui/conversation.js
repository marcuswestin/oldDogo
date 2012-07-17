var composer = require('./composer')
var once = require('std/once')
var pictures = require('../../data/pictures')

var currentView
var $ui

module.exports = {
	render:function($body, view) {
		currentView = view
		$ui = {}

		$body.append(
			div('conversation',
				$ui.info = $(div('info')),
				$ui.wrapper=$(div('messagesWrapper', style({ height:viewport.height() - 45, overflowY:'scroll', overflowX:'hidden' }),
					$ui.invite=$(div('invite')),
					div('messages', $ui.messages = list({ items:[], onSelect:selectMessage, renderItem:renderMessage }))
				)),
				composer.render($ui, currentView.accountId, currentView.facebookId)
			)
		)

		$ui.wrapper.on('scroll', checkScrollBounds)
		
		refreshMessages()
	}
}

$('body').on('touchmove', '.conversation', function() {
	composer.hide()
})

function selectMessage(message, _, $el) {
	if (message.pictureId || message.base64Picture) {
		composer.selectDraw($el.find('.messageBubble .pictureContent')[0], message)
	} else {
		// do nothing
	}
}

function refreshMessages() {
	loading(true)
	var params = {
		withAccountId:currentView.accountId,
		withFacebookId:currentView.facebookId,
		lastReadMessageId:currentView.lastReadMessageId
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

var checkScrollBounds = once(function checkScrollBounds() {
	var pics = $ui.wrapper.find('.messageBubble .pictureContent')
	var viewHeight = $ui.wrapper.height()
	var viewTop = $ui.wrapper.scrollTop() - (viewHeight * 3/4) // preload 3/4 of a view above
	var viewBottom = viewTop + viewHeight + (viewHeight * 1/2) // prelado 1/2 of a view below
	for (var i=pics.length - 1; i >= 0; i--) { // loop in reverse order since you're likelier to be viewing the bottom of the conversation
		var pic = pics[i]
		var picTop = pic.offsetTop
		var picBottom = picTop + pic.offsetHeight
		if (picTop > viewTop && picBottom < viewBottom && pic.getAttribute('pictureUrl')) {
			pic.style.backgroundImage = 'url('+pic.getAttribute('pictureUrl')+')'
			pic.removeAttribute('pictureUrl')
		}
	}
})

function renderMessage(message) {
	var fromMe = (message.senderAccountId == gState.myAccount().accountId)
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
		return div('textContent', message.body)
	} else if (message.pictureId) {
		var pictureUrl = pictures.urlFromMessage(message, pictures.pixels.thumb)
		return div('pictureContent', picSize(message), { pictureUrl:pictureUrl })
	} else {
		var pictureUrl = message.base64Picture
		return div('pictureContent', clipPicSize(message), { pictureUrl:pictureUrl })
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
	if (!currentView.accountId || currentView.accountId != message.senderAccountId) { return }
	addMessage(message)
})

events.on('message.sending', function(message) {
	$ui.info.empty()
	addMessage(message)
})

events.on('message.sent', function(message, toAccountId, toFacebookId) {
	if (!currentView) { return }
	if (!currentView.accountId && toFacebookId && toFacebookId == currentView.facebookId) {
		// A first message was sent to this facebook id, and the server responds with the newly created account id as well as the facebook id
		currentView.accountId = toAccountId
	}
	if (currentView.accountId != toAccountId) { return }
	loadAccountId(toAccountId, function(account) {
		if (account.memberSince) { return }
		promptInvite(message, account.accountId, account.facebookId)
	})
})

events.on('view.change', function() {
	currentView = null
	$ui = null
})

events.on('app.willEnterForeground', function() {
	currentView
	refreshMessages()
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
