var composer = require('./composer')
var once = require('std/once')
var payloads = require('data/payloads')
var linkify = require('lib/linkify')
var questions = require('./questions')
var time = require('std/time')
var pictures = require('client/ui/pictures')

module.exports = {
	render:renderConversation
}

var view
var $ui

events.on('view.changing', function resetView() {
	if (!view) { return }
	view = null
	$ui = null
	getMessagesList._list = null
	gScroller.getCurrentView().off('scroll', onScroll)
})

function renderConversation(_view) {
	// setTimeout(function() { onNewMessage({ _wasPushed:true, body:'R u?' }) }, 1000) // AUTOS
	// setTimeout(function() { composer.selectText() }) // AUTOS
	// setTimeout(function() { composer.selectDraw() }) // AUTOS
	// setTimeout(function() { composer.selectPhoto() }) // AUTOS
	
	view = _view
	$ui = {}

	var messages = []
	
	gScroller.getCurrentView().on('scroll', onScroll)

	return div({ id:'conversationView' },
		div('personName', function() {
			var names = view.conversation.summary.people[0].name.split(' ')
			if (names.length > 1) {
				return names[0] + ' ' + names[names.length-1][0] // first name plus first letter of last name
			} else {
				return names[0]
			}
		}),
		getMessagesList(),
		
		function() {
			setTimeout(function() {
				events.fire('conversation.rendered', view.conversation)
			}, 100)
		}
	)
}

function getMessagesCacheId() {
	return 'convo-'+view.conversation.conversationId+'-messages'
}

function scrollDown(duration, amount) {
	var $view = gScroller.getCurrentView()
	if (!amount) {
		// default to the bottom of the view
		amount = getMessagesList().height() - $view.scrollTop()
	}
	var scrollTop = $view.scrollTop() + amount
	if (duration) {
		$view.animate({ scrollTop:scrollTop, duration:duration })
	} else {
		$view.scrollTop(scrollTop)
	}
}

function getMessagesList() {
	if (getMessagesList._list) { return getMessagesList._list }
	var drewLoading = false
	getMessagesList._list = list('messagesList', {
		onSelect:selectMessage,
		renderItem:renderMessage,
		getItemId:function(message) { return message.fromPersonId + '-' + message.clientUid },
		renderEmpty:function() {
			if (drewLoading) { return div('ghostTown', 'Start the conversation', br(), 'Draw something!') }
			drewLoading = true
			return div('ghostTown', 'Fetching messages...')
		}
	})
	setTimeout(function() {
		refreshMessages(true)
		gState.load(getMessagesCacheId(), function(messages) {
			if (!messages || !messages.length) { return }
			getMessagesList._list.append(messages, { updateItems:false })
			scrollDown()
			checkScrollBounds()
		})
	}, 150)
	return getMessagesList._list
}

function selectMessage(message) {
	if (message.type == 'picture') {
		composer.selectDraw({
			url: message.payload.secret ? pictures.displayUrl(message) : message.preview.base64Data,
			size: [message.payload.width, message.payload.height]
		})
	} else if (message.type == 'audio') {
		var url = payloads.url(message.conversationId, message.payload.secret, message.type)
		bridge.command('audio.play', { location:url }, function(err) {
			
		})
	} else {
		// do nothing
	}
	events.fire('message.selected')
}

function refreshMessages(scrollToBottom) {
	if (!view) { return }
	var wasCurrentView = view
	api.get('api/messages', { conversationId:view.conversation.conversationId }, function refreshRenderMessages(err, res) {
		if (wasCurrentView != view) { return }
		if (err) { return error(err) }
		var messagesList = getMessagesList()
		messagesList.append(res.messages, { updateItems:false })
		if (scrollToBottom) {
			scrollDown()
		}
		checkScrollBounds()
		gState.set(getMessagesCacheId(), res.messages)
	})
}

var lastTime = 0
function onScroll() {
	if (!view) { return }
	if (Math.abs(lastTime - time.now()) < 200) { return }
	lastTime = time.now()
	checkScrollBounds()
}

function checkScrollBounds() {
	// return
	var $view = gScroller.getCurrentView()
	var scroll = $view.scrollTop()
	var pics = $view.find('.messageBubble .pictureContent')
	var viewHeight = $view.height()
	var viewTop = scroll - (viewHeight * 3/4) // preload 3/4 of a view above
	var viewBottom = viewTop + viewHeight + (viewHeight * 1/2) // prelado 1/2 of a view below
	for (var i=pics.length - 1; i >= 0; i--) { // loop in reverse order since you're likelier to be viewing the bottom of the conversation
		var pic = pics[i]
		var picTop = pic.parentNode.offsetTop
		var picBottom = picTop + pic.offsetHeight
		if (picBottom > viewTop && picTop < viewBottom && pic.getAttribute('pictureUrl')) {
			pic.style.backgroundImage = 'url('+pic.getAttribute('pictureUrl')+')'
			pic.removeAttribute('pictureUrl')
		}
	}
}

function arrowImage(name, size) {
	var url = image.url(name)
	return div('arrow', style({ width:size[0], height:size[1],
		background:'url('+url+') transparent no-repeat', backgroundSize:size[0]+'px '+size[1]+'px'
	}))
}

function renderMessage(message) {
	return gRenderMessageBubble(message, view.conversation, { dynamics:true, face:40, arrow:true, lazy:true })
}

var pictureMargin = 4
var picDisplaySize = [262 - pictureMargin * 2, 180 - pictureMargin * 2]
gRenderMessageBubble = function(message, conversation, opts) {
	opts = options(opts, { dynamics:true, face:30, arrow:true, lazy:false })
	var me = gState.me()
	var fromMe = (message.fromPersonId == me.personId)
	var classes = [message.type+'Message', fromMe ? 'fromMe' : 'fromThem']
	return [div('messageContainer',
		div(classes.join(' '),
			opts.face ? face(fromMe ? me : conversation.summary.people[0], { size:opts.face }) : null,
			div('messageBubble',
				opts.arrow && div('arrow', style({
					background:image.background(fromMe ? 'bubbleArrow-right' : 'bubbleArrow-left', 5, 10),
					width:5, height:10,
					backgroundSize:px(5, 10)
				})),
				message.preview ? renderPreview(message, opts) : renderContent(message, opts)
			)
		)
	), div('clear')]
	
	function renderArrow() {
		return messageIsFromMe ? arrowImage('bubbleArrow-right', [5,10]) : arrowImage('bubbleArrow-left', [6,10])
	}
	
	function renderDynamics() {
		var showYesNoResponder = (message._wasPushed && !message._questionAnswered && questions.hasYesNoQuestion(message.body))
		return showYesNoResponder && questions.renderYesNoResponder(function(answer) {
			message._questionAnswered = true
			composer.sendMessage({ body:(answer ? 'Yes' : 'No') })
		})
	}
	
	function renderContent(message, opts) {
		if (message.type == 'text') {
			return renderTextContent(message.payload, opts)
		} else if (message.type == 'audio') {
			return renderAudioContent(message.payload, opts)
		} else {
			var loadingClock = div('loadingClock', icon('icon-clock', 25, 25),
				style(translate(picDisplaySize[0] / 2 - 25/2, picDisplaySize[1] / 2 - 25/2)),
				style({ width:0, height:0 })
			)
			var pictureUrl = pictures.displayUrl(message, { resize:[262*2, 180*2] })
			var background = opts.lazy ? { pictureUrl:pictureUrl } : style({ backgroundImage:'url('+pictureUrl+')' })
			return [
				loadingClock,
				div('pictureContent',
					background, style(translate(0,0)),
					style({
						width:picDisplaySize[0],
						height:picDisplaySize[1],
						margin:pictureMargin,
						backgroundSize:px(picDisplaySize[0], picDisplaySize[1])
					})
				)
			]
		}
	}

	function renderPreview(message, opts) {
		if (message.type == 'text') {
			return renderTextContent(message.preview, opts)
		} else if (message.type == 'audio') {
			return renderAudioContent(message.preview, opts)
		} else {
			var picSize = [message.preview.width, message.preview.height]
			var widthRatio = picDisplaySize[0] / picSize[0]
			var heightRatio = picDisplaySize[1] / picSize[1]
			var ratio = Math.max(widthRatio, heightRatio) // Math.min for "fit" instead of "fill" into picDisplaySize
			var scaledSize = map(picSize, function(size) { return size * ratio })
			var scaledOffset = map([(picDisplaySize[0]-scaledSize[0]) / 2, (picDisplaySize[1]-scaledSize[1]) / 2], Math.round)
			return div('pictureContent',
				style(translate(0,0)),
				style({
					width:picDisplaySize[0],
					height:picDisplaySize[1],
					margin:pictureMargin,
					backgroundImage:'url('+message.preview.base64Data+')',
					backgroundSize: px(scaledSize),
					backgroundPosition: px(scaledOffset)
				})
			)
		}
	}

	function renderTextContent(payload, opts) {
		return div('textContent', linkify(payload.body).join(''))
	}

	function renderAudioContent(payload, opts) {
		return div('textContent', 'AUDIO CONTENT DURATION ', payload.duration)
	}
}

function onNewMessage(message) {
	$('#conversationView .ghostTown').remove()
	var messagesList = getMessagesList()
	if (message.preview || (message._wasPushed && !gIsTouching)) {
		// If this message was sent by me, or if I just received it and I'm not currently touching the screen, then scroll the new message into view
		var heightBefore = messagesList.height()
		setTimeout(function() {
			var dHeight = messagesList.height() - heightBefore
			scrollDown(25, dHeight)
		}, 25)
	}
	messagesList.append(message, { updateItems:false })
	checkScrollBounds()
}

events.on('push.message', function(data) {
	var message = data.message
	if (!view || view.conversation.conversationId != message.conversationId) { return }
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
	if (!view || view.conversation.conversationId != message.conversationId) { return }
	// cacheMessage(message)
	if (view.conversation.summary.people[0].memberSince) { return }
	if (false && serverResponse.disableInvite) { return }
	promptInvite(message)
})

events.on('app.willEnterForeground', function() {
	refreshMessages()
})

function promptInvite(message) {
	var conversation = view.conversation
	var height = 140
	var faceSize = 34
	var $infoBar = $(div(style({ height:height, width:viewport.width() }), div('dogo-info',
		div('invite',
			div('encouragement', message.body ? 'Nice Message!' : 'Very Expressive!'),
			div('personal', view.conversation.summary.people[0].name.split(' ')[0], " has not installed Dogo"),
			div('button',
				// face.mine({ size:faceSize, style:{ 'float':'left' } }),
				'Send via Facebook',
				face(view.conversation.summary.people[0], { size:faceSize, style:{ 'float':'right' } }),
				button(function() {
				// TODO events.on('facebook.dialogDidComplete', function() { ... })
				// https://developers.facebook.com/docs/reference/dialogs/requests/
				// https://developers.facebook.com/docs/mobile/ios/build/
				
				var me = gState.me()
				var name = me.firstName || me.name.split(' ')[0]
				if (message.body) {
					var text = name+' says: "'+message.body+'". Reply in style with Dogo!'
				} else {
					var text = name+' sent you a drawing. Reply in style with Dogo!'
				}
				
				bridge.command('facebook.dialog', {
					dialog: 'apprequests',
					params: {
						message: text,
						to: view.conversation.summary.people[0].facebookId.toString()
						// title: name+' sent you a...',
						// data: JSON.stringify({ conversationId:message.conversationId }),
						// frictionless:'1'
					}
				})
				events.once('facebook.dialogCompleteWithUrl', function(info) {
					var url = parseUrl(info.url)
					var params = { conversationId:conversation.conversationId, personId:conversation.summary.people[0].personId, facebookRequestId:url.getSearchParam('request') }
					api.post('api/facebookRequests', params, error.handler)
				})
			}))
		)
	)))
	$infoBar.css(translate(-viewport.width(), 0)).appendTo($('.messagesList'))
	setTimeout(function() {
		scrollDown(50, 350)
		setTimeout(function() {
			$infoBar.css(translate(0, 0, 350))
		}, 50)
	}, 350)
}

gIsTouching = false
$(function() {
	$(document)
		.on('touchstart', function() { gIsTouching = true })
		.on('touchend', function() { gIsTouching = false })
})
