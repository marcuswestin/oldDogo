var composer = require('./composer')
var once = require('std/once')
var linkify = require('lib/linkify')
var questions = require('./questions')
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
	lastMessageFromId = null
	
	var messages = []
	
	gScroller.getCurrentView().on('scroll', onScroll)

	return div({ id:'conversationView' },
		div('personName', style({ padding:px(12 + spacing, 0, spacing * 2) }),  function() {
			return div(null, 'hi', style({ visibility:'hidden' }))
			var names = view.conversation.people[0].name.split(' ')
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

function getMessageId(message) { return message.fromPersonId + '-' + message.clientUid }

function getMessagesList() {
	if (getMessagesList._list) { return getMessagesList._list }
	var drewLoading = false
	getMessagesList._list = list('messagesList', {
		onSelect:selectMessage,
		renderItem:renderMessage,
		getItemId:getMessageId,
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
		var url = payloads.url(message.fromPersonId, message.type, message.payload)
		bridge.command('audio.play', { location:url }, function(err) {
			
		})
	} else {
		// do nothing
	}
	events.fire('message.selected')
}

function refreshMessages(scrollToBottom) {
	if (!view) { return }
	if (!view.conversation.conversationId) { return getMessagesList().append([]) } // no messages yet
	var wasCurrentView = view
	api.get('api/messages', { conversationId:view.conversation.conversationId, participationId:view.conversation.participationId }, function refreshRenderMessages(err, res) {
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

function renderMessage(message) {
	return gRenderMessageBubble(message, view.conversation, { dynamics:true, face:40, arrow:true, lazy:false })
}

light = [86,153,207]
dark = [48,95,132]

var lastMessageFromId = null
gRenderMessageBubble = function(message, conversation, opts) {
	var faceSize = 40
	var messageWidth = viewport.width()
	var picSize = viewport.width() - spacing * 4
	opts = options(opts, {
		dynamics:true,
		face:30,
		arrow:true,
		lazy:false,
		pictureSize: [picSize, picSize],
		maxHeight:null
	})
	var me = gState.me()
	var isNewPerson = (lastMessageFromId != message.fromPersonId)
	lastMessageFromId = message.fromPersonId
	var fromMe = (message.fromPersonId == me.personId)
	var classes = [message.type+'Message', fromMe ? 'fromMe' : 'fromThem']
	var person = (fromMe ? me : conversation.people[0])
	var floatRight = { 'float':'right' }
	var floatLeft = { 'float':'left' }
	if (isNewPerson) {
		var dx = spacing * 1.5 * (fromMe ? -1 : 1)
		var personParts = [
			face(person, { size:faceSize, style:{ borderRadius:px(1) } }),
			div('name', person.name.split(' ')[0], style(
				translate(dx, -14), {
				display:'inline-block', fontSize:20,
				color:'#fff', textShadow:'0 1px 0 '+colors.rgba(light, 1)
			}))
		]
		if (fromMe) { personParts.reverse() }
		var arrowSize = spacing * 2
		var arrowOffset = (faceSize - arrowSize) / 2
		var personHeader = isNewPerson && div('newSection',
			// height:faceSize+arrowSize/2+spacing/2, 
			// style({ padding:px(spacing * 1.5, spacing, spacing / 2) }),
			style({ margin:px(spacing * 2, spacing, 0) }),
			div('person',
				style({ height:faceSize, overflow:'hidden' }, fromMe && { textAlign:'right' }),
				personParts
			),
			div('cardSpacer', style({ height:spacing * 2, overflow:'hidden' }),
				div('cardArrow', style({ display:'inline-block', width:0, height:0, border:(arrowSize/2)+'px solid #fff', borderColor:'transparent transparent #fff transparent' },
					fromMe
						? translate(-arrowOffset, -5)
						: translate(arrowOffset, -5)
				)),
				div('cardTop', style({ height:spacing, background:'#fff', borderRadius:px(1,1,0,0) }, translate.y(-spacing*1.5 + 1)))
			)
		)
	}
	return [div('messageContainer', style(translate(0,0), { textAlign:fromMe ? 'right' : 'left', 'float':fromMe?'right':'left', width:messageWidth }),
		div(classes.join(' '),
			personHeader,
			renderContent(message, opts)
		)
	), div('clear')]
	
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
				style(translate(opts.pictureSize[0] / 2 - 25/2, opts.pictureSize[1] / 2 - 25/2)),
				style({ width:0, height:0 })
			)
			var pictureUrl = pictures.displayUrl(message, { resize:[opts.pictureSize[0]*2, opts.pictureSize[1]*2] })
			// var background = opts.lazy ? { pictureUrl:pictureUrl } : style({ backgroundImage:'url('+pictureUrl+')' })
			return [
				loadingClock,
				img('pictureContent', { src:pictureUrl }, style(
					translate(0,0),
					// translate(fromMe ? -(40) : 0, 0),
					{
						background:'#fff',
						display:'block',
						width:opts.pictureSize[0],
						height:opts.pictureSize[1],
						// padding:px(0, fromMe ? spacing : 0, 0, fromMe ? 0 : spacing),
						padding:px(0, spacing),
						margin:px(0, spacing),
						backgroundSize:px(opts.pictureSize[0], opts.pictureSize[1])
					}
				)),
				div('spacing', style({ height:spacing, background:'#fff', margin:px(0, spacing) }))
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
			var widthRatio = opts.pictureSize[0] / picSize[0]
			var heightRatio = opts.pictureSize[1] / picSize[1]
			var ratio = Math.max(widthRatio, heightRatio) // Math.min for "fit" instead of "fill" into opts.pictureSize
			var scaledSize = map(picSize, function(size) { return size * ratio })
			var scaledOffset = map([(opts.pictureSize[0]-scaledSize[0]) / 2, (opts.pictureSize[1]-scaledSize[1]) / 2], Math.round)
			return div('pictureContent',
				style({
					background:'#fff',
					display:'block',
					width:opts.pictureSize[0],
					height:opts.pictureSize[1],
					padding:px(0, spacing, spacing),
					margin:px(0, spacing),
					backgroundSize:px(scaledSize),
					backgroundPosition: px(scaledOffset),
					backgroundImage:'url('+message.preview.base64Data+')'
				})
			)
		}
	}

	function renderTextContent(payload, opts) {
		var margin = faceSize + spacing
		return div('textContent', style({ display:'block', fontSize:17 }),
			linkify(payload.body).join(''),
			style({ padding:px(0, spacing, spacing), margin:px(0, spacing), background:'#fff' })
		)
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

events.on('message.sent', function onConversationMessageSent(serverResponse) {
	var message = serverResponse.message
	if (!view || view.conversation.conversationId != message.conversationId) { return }
	if (serverResponse.promptInvite) {
		promptInvite(message)
	}
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
			div('personal', view.conversation.people[0].name.split(' ')[0], " has not installed Dogo"),
			div('button',
				// face.mine({ size:faceSize, style:{ 'float':'left' } }),
				'Send via Facebook',
				face(view.conversation.people[0], { size:faceSize, style:{ 'float':'right' } }),
				button(function sendViaFacebook() {
				// TODO events.on('facebook.dialogDidComplete', function() { ... })
				// https://developers.facebook.com/docs/reference/dialogs/requests/
				// https://developers.facebook.com/docs/mobile/ios/build/
				
				var me = gState.me()
				var name = me.name.split(' ')[0]
				if (message.body) {
					var text = name+' says: "'+message.body+'". Reply in style with Dogo!'
				} else {
					var text = name+' sent you a drawing. Reply in style with Dogo!'
				}
				
				bridge.command('facebook.dialog', {
					dialog: 'apprequests',
					params: {
						message: text,
						to: view.conversation.people[0].facebookId.toString()
						// title: name+' sent you a...',
						// data: JSON.stringify({ conversationId:message.conversationId }),
						// frictionless:'1'
					}
				})
				events.once('facebook.dialogCompleteWithUrl', function facebookDialogCompleteWithUrl(info) {
					var url = parseUrl(info.url)
					var params = { conversationId:conversation.conversationId, personId:conversation.people[0].personId, facebookRequestId:url.getSearchParam('request') }
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
