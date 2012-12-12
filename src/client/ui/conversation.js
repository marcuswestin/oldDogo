var composer = require('./composer')
var once = require('std/once')
var pictures = require('../../data/pictures')
var linkify = require('lib/linkify')
var questions = require('./questions')

module.exports = {
	render:renderConversation
}

var view
var $ui
var lastMessageWasFromMe = null;

events.on('view.change', function resetView() {
	view = null
	$ui = null
	lastMessageWasFromMe = null
	getMessagesList._list = null
})

function renderConversation(_view) {
	// setTimeout(function() { onNewMessage({ wasPushed:true, body:'R u?' }) }, 1000) // AUTOS
	// setTimeout(function() { composer.selectText() }) // AUTOS
	// setTimeout(function() { composer.selectDraw() }) // AUTOS
	// setTimeout(function() { composer.selectPhoto() }) // AUTOS
	
	view = _view
	$ui = {}
	lastMessageWasFromMe = null

	var messages = []
	return div('conversationView',
		// function($el) { setTimeout(function() { $el.append(
		getMessagesList(),
		// )).on('scroll', checkScrollBounds),
		
		function() {
			setTimeout(function() {
				events.fire('conversation.rendered', view.conversation)
			}, 100)
			// checkScrollBounds()
		}
		
		// ) }, 75) }
	)
}

function getMessagesCacheId() {
	return 'convo-'+view.conversation.id+'-messages'
}

function scrollToBottom() {
	gScroller.getCurrentView().scrollTop(getMessagesList().height())
}

function getMessagesList() {
	if (getMessagesList._list) { return getMessagesList._list }
	var drewLoading = false
	getMessagesList._list = list('messagesList', {
		onSelect:selectMessage,
		renderItem:renderMessage,
		getItemId:function(message) { return message.clientUid },
		renderEmpty:function() {
			if (drewLoading) { return div('ghostTown', 'Start the conversation', br(), 'Draw something!') }
			drewLoading = true
			return div('loading', 'Loading...')
		}
	})
	setTimeout(function() {
		gState.load(getMessagesCacheId(), function(messages) {
			refreshMessages()
			if (!messages || !messages.length) { return }
			getMessagesList._list.append(messages)
			scrollToBottom()
		})
	}, 100)
	return getMessagesList._list
}

function selectMessage(message, _, $el) {
	// alert("FINISH selectMessage")
	// if (message.pictureId || message.base64Picture) {
	// 	composer.selectDraw($el.find('.messageBubble .pictureContent')[0], message)
	// } else {
	// 	// do nothing
	// }
}

function refreshMessages() {
	if (!view) { return }
	var wasCurrentView = view
	api.get('messages', { conversationId:view.conversation.id }, function refreshRenderMessages(err, res) {
		if (wasCurrentView != view) { return }
		if (err) { return error(err) }
		var messagesList = getMessagesList()
		messagesList.append(res.messages)
		scrollToBottom()
		gState.set(getMessagesCacheId(), res.messages)
	})
}

// var checkScrollBounds = once(function checkScrollBounds() {
// 	if (!view) { return }
//	var $view = gScroller.getCurrentView()
// 	var pics = $view.find('.messageBubble .pictureContent')
// 	var viewHeight = $view.height()
// 	var viewTop = $view.scrollTop() - (viewHeight * 3/4) // preload 3/4 of a view above
// 	var viewBottom = viewTop + viewHeight + (viewHeight * 1/2) // prelado 1/2 of a view below
// 	for (var i=pics.length - 1; i >= 0; i--) { // loop in reverse order since you're likelier to be viewing the bottom of the conversation
// 		var pic = pics[i]
// 		var picTop = pic.offsetTop
// 		var picBottom = picTop + pic.offsetHeight
// 		if (picBottom > viewTop && picTop < viewBottom && pic.getAttribute('pictureUrl')) {
// 			pic.style.backgroundImage = 'url('+pic.getAttribute('pictureUrl')+')'
// 			pic.removeAttribute('pictureUrl')
// 		}
// 	}
// })

function arrowImage(name, size) {
	var url = image.url(name)
	return div('arrow', style({ width:size[0], height:size[1],
		background:'url("'+url+'") transparent no-repeat', backgroundSize:size[0]+'px '+size[1]+'px'
	}))
}

function renderMessage(message) {
	var isVeryFirstMessage = (lastMessageWasFromMe === null)
	var me = gState.myAccount()
	var messageIsFromMe = (message.senderAccountId == me.id)
	var isFirstMessageInGroup = (lastMessageWasFromMe != messageIsFromMe || isVeryFirstMessage)
	var shouldRenderFace = true || isFirstMessageInGroup
	var classes = [
		message.body ? 'textMessage' : 'pictureMessage',
		messageIsFromMe ? 'fromMe' : 'fromThem',
		isFirstMessageInGroup && !isVeryFirstMessage ? 'newGroup' : ''
	]
	
	// checkScrollBounds()
	lastMessageWasFromMe = messageIsFromMe
	
	var showYesNoResponder = (message.wasPushed && !message.questionAnswered && questions.hasYesNoQuestion(message.body))
	
	return [
		div('message',
			div(classes.join(' '),
				shouldRenderFace && div(
					face(messageIsFromMe ? me : view.conversation.person, 34)
				),
				div('messageBubble',
					(messageIsFromMe && message.body) ? arrowImage('bubbleArrow-right', [5,10]) : arrowImage('bubbleArrow-left', [6,10]),
					renderContent(message)
				),
				showYesNoResponder && questions.renderYesNoResponder(function(answer) {
					message.questionAnswered = true
					composer.sendMessage({ body:(answer ? 'Yes' : 'No') })
				})
			)
		),
		div('clear')
	]
}

gPicSize = function(message) {
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
		// var attrs = { pictureUrl:pictureUrl }
		var attrs = style({ backgroundImage:'url('+pictureUrl+')' })
		return div('pictureContent', gPicSize(message), attrs)
	} else {
		var pictureUrl = message.base64Picture
		// var attrs = { pictureUrl:pictureUrl }
		var attrs = style({ backgroundImage:'url('+pictureUrl+')' })
		return div('pictureContent', clipPicSize(message), attrs)
	}
}

function onNewMessage(message) {
	$('.conversationView .ghostTown').remove()
	var messagesList = getMessagesList()
	if (message.isSending || (message.wasPushed && !gIsTouching)) {
		// If this message was sent by me, or if I just received it and I'm not currently touching the screen, then scroll the new message into view
		var heightBefore = messagesList.height()
		setTimeout(function() {
			var dHeight = heightBefore - messagesList.height()
			var $view = gScroller.getCurrentView()
			$view.animate({
				scrollTop: $view.scrollTop() - dHeight,
				duration: 50
			})
		}, 50)
	}
	messagesList.append(message)
}

// function cacheMessage(message) {
// 	var cache = gState.cache[conversation.id(view, 'messages')]
// 	if (!cache) { return }
// 	cache.unshift(message)
// }

events.on('push.message', function(message) {
	if (!view || !view.accountId || view.accountId != message.senderAccountId) { return }
	// cacheMessage(message)
	onNewMessage(message)
})

events.on('message.sending', function(message) {
	onNewMessage(message)
	message.events.on('sent', function(response) {
		// Show that the message was succesfully sent
	})
})

events.on('message.sent', function(serverResponse) {
	var message = serverResponse.message
	if (!view || view.conversation.id != message.conversationId) { return }
	// cacheMessage(message)
	if (view.conversation.person.memberSince) { return }
	if (serverResponse.disableInvite) { return }
	promptInvite(message)
})

events.on('app.willEnterForeground', function() {
	refreshMessages()
})

function promptInvite(message) {
	composer.hide()
	var conversation = view.conversation
	// loadAccountId(accountId, function(account) {
		var $infoBar = $(div(style(transition('height', 500)), div('dogo-info',
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
						var params = { conversationId:conversation.id, personId:conversation.person.id, facebookRequestId:url.getSearchParam('request') }
						api.post('facebook_requests', params, error.handler)
					})
				}))
			)
		)))
		var messageBubbles = getMessagesList().find('.messageBubble')
		$infoBar.css({ height:0, overflowY:'hidden' }).appendTo(messageBubbles[messageBubbles.length - 1].parentNode)
		setTimeout(function() {
			$infoBar.css({ height:$infoBar.find('.dogo-info').height() + 30 })
		}, 500)
	// })
}

gIsTouching = false
$(function() {
	$(document)
		.on('touchstart', function() { gIsTouching = true })
		.on('touchend', function() { gIsTouching = false })
})
