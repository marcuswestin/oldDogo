var trim = require('std/trim')
var placeholder = 'Say something :)'
var drawer = require('./drawer')

var currentConversation = null

var toolsHeight = 40

var icons = icon.preload({
	chat: ['glyphish/white/09-chat-2', 24, 22],
	camera: ['glyphish/white/86-camera', 24, 18, 0, 0, 1],
	palette: ['glyphish/white/98-palette', 24, 20],
	close: ['icon-circlex', 22, 23, 10, 16, 10, 16]
})

var composer = module.exports = {
	selectText:selectText,
	selectDraw:selectDraw,
	selectPhoto:selectPhoto,
	sendMessage:sendMessage,
	remove:function() {
		if (!currentConversation) { return }
		currentConversation = null
	},
	render: function(view) {
		currentConversation = view.conversation
		
		return div({ id:'composer' }, style({ height:toolsHeight }),
			div('tools',
				style({ height:toolsHeight }), style(translate.y(-6)),
				div('button tool write', icons.chat, button(function() {
					selectText()
				})),
				div('button tool photo', icons.camera, button(function() {
					selectPhoto()
				})),
				div('button tool draw', icons.palette, button(function() {
					selectDraw()
				}))
			)
		)
	}
}

var hideTextInput = function() {}
function selectText() {
	var inputWidth = viewport.width() - 122
	var margin = 6
	
	var fadeDuration = 150
	var id = tags.id()
	$('.dogoApp').append(
		div({ id:id },
			style({ opacity:0, position:'absolute', bottom:0, left:0, height:0, width:viewport.width() }),
			style(transition('opacity', fadeDuration)),
			div('textInputBackground', { id:'textInput' }, { contenteditable:'true' },
				style({
					padding:px(8, 6),
					width:inputWidth, margin:margin,
					position:'absolute', bottom:0, '-webkit-user-select':'auto', left:40
				})
			),
			div('send button', 'Send', style({ position:'absolute', bottom:9, right:4, padding:px(6,8,7) }), button(function() {
				if (!currentConversation) { return }
				var message = trim($('#textInput').text())
				if (!message) { return }
				$('#textInput').html('')
				sendMessage('text', { body:message })
			})),
			div('closeTextInput',
				icons.close,
				style({ position:'absolute', bottom:0, left:0 }),
				button(function() { hideTextInput() })
			)
		)
	)
	$('#'+id+' .textInputBackground').focus()
	
	setTimeout(function() {
		$('#'+id).css({ opacity:1 })
	}, 100)
	
	hideTextInput = function() {
		hideTextInput = function() {}
		$('#emoticons').remove()
		bridge.command('textInput.hideKeyboard')
		$('#'+id).css({ opacity:0 })
		setTimeout(function() {
			// Removing the element before command('textInput.hideKeyboard') has actually found the input
			// causes the entire screen to go black. Just move it out of the way instead of removing it
			$('#'+id).css(translate(-9999,-9999))
			setTimeout(function() { $('#'+id).remove() }, 5000)
		}, fadeDuration)
	}
}

function showEmoticons() {
	bridge.command('viewport.expand', { height:gKeyboardHeight })
	if (!$('#emoticons')[0]) {
		$('.dogoApp').append(div({ id:'emoticons' },
			style({ position:'absolute', bottom:-gKeyboardHeight, left:0, width:viewport.width(), height:gKeyboardHeight, background:'red' }),
			button(function() {
				// hide emoticons
				bridge.command('viewport.putUnderKeyboard')
			})
		))
	}
	bridge.command('viewport.putOverKeyboard')
}

events.on('message.selected', function() {
	hideTextInput()
})

function selectPhoto() {
	bridge.command('menu.show', {
		title:"Send a Photo",
		cancelTitle:'Cancel',
		titles:['Pick from Library', 'Take new Photo']
	}, function(err, res) {
		if (err) { return error(err) }
		if (!res) { return }
		var sources = ['libraryPhotos', 'camera'] // ,'cancel'
		if (!sources[res.index]) { return }
		bridge.command('media.pick', { source:sources[res.index], allowsEditing:true }, function(err, res) {
			if (!res.mediaId) { return }
			selectDraw({
				url: '/blowtorch/media/'+res.mediaId+'.jpg',
				size: [res.width, res.height]
			})
		})
	})
}

function selectDraw(background) {
	var $drawComposer = $(
		drawer.render({
			background:background,
			onHide:function() {
				$drawComposer.css(translate.y(viewport.height()))
			},
			onSend:function sendImage(data, width, height) {
				sendMessage('picture', { width:width, height:height, base64Data:data })
				$drawComposer.css(translate.y(-viewport.height()))
			}
		})
	).css({ position:'absolute', top:0 }).css(translate.y(viewport.height()))
	$drawComposer.appendTo('.dogoApp')
	setTimeout(function() {
		$drawComposer.css(translate.y(0, 350))
	})
}


function sendMessage(type, payload) {
	var clientUid = gState.nextClientUid()
	var conversation = currentConversation
	
	var message = eventEmitter('message', {
		toConversationId:conversation.id,
		fromPersonId:gState.me().personId,
		clientUid:clientUid,
		type:type,
		payload:payload,
		_isSending:true
	})
	
	bridge.command('net.request', { method:"POST", headers:api.getHeaders(), path:api.getPath('api/message'), params:message }, function(err, res) {
		if (err) { return error(err) }
		conversation.lastMessage = res.message
		conversation.lastSentMessage = res.message
		events.fire('message.sent', res, conversation)
		message._isSending = false
		message.events.fire('sent', res.message)
	})
	
	events.fire('message.sending', message)
}

events.on('view.changing', function onViewRenderEvent() {
	if (!currentConversation) { return }
	composer.remove()
})
