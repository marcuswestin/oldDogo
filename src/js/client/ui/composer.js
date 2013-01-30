var trim = require('std/trim')
var placeholder = 'Say something :)'
var drawer = require('./drawer')
var time = require('std/time')
var pasteHtmlAtInputCaret = require('client/util/pasteHtmlAtInputCaret')

var currentConversation = null

var toolsHeight = 43
var glassContentWidth

var icons = icon.preload({
	// chat: ['glyphish/white/09-chat-2', 24, 22],
	chat: ['glyphish/white/286-speechbubble', 24, 24],
	camera: ['glyphish/white/86-camera', 24, 18, 0, 0, 1],
	palette: ['glyphish/white/98-palette', 24, 20],
	close: ['icon-circlex', 22, 23, 8, 9, 6],
	voice: ['glyphish/white/66-microphone', 12, 24, 0, 0, 0, 0],
	location: ['glyphish/white/193-location-arrow', 24, 24],
	mapMarker: ['glyphish/white/07-map-marker', 16, 26, 0, 0, 4, 0]
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
		
		var closeWidth = 50
		var sendWidth = 60
		glassContentWidth = viewport.width() - closeWidth - sendWidth
		var toolsOffset = 3
		var toolsSectionStyle = style({ width:viewport.width(), height:toolsHeight })
		return div({ id:'composer' },
			style({ height:toolsHeight, width:viewport.width() }),
			div(repeatImage.x('optionsGlassBorder', 1, 1), style({ width:'100%' })),
			div('toolContainer', style({ width:viewport.width(), height:toolsHeight, overflow:'hidden' }),
				div('toolsSlider', style({ height:toolsHeight*2 }), style(translate.y(-toolsHeight, 1)),
					// tool options are "on top" of the list of tools, but are initially out of view
					div('toolOptions', toolsSectionStyle,
						div('closeTool', icons.close,
							style({ position:'absolute', top:0, width:closeWidth }),
							button(function() {
								slideTools.backIn()
								bridge.command('textInput.hideKeyboard')
							})
						),
						div('centerContent',
							style({ position:'absolute', top:0, width:viewport.width() - closeWidth - sendWidth }),
							style(translate.x(closeWidth)),
							null // Center will be populated with slideTools.out(function contentFn() { ... })
						),
						div('sendMessage',
							style({ position:'absolute', top:0, width:sendWidth, textAlign:'center' }),
							style(translate.x(closeWidth + glassContentWidth)),
							div('button send', 'Send', style({ marginTop:7 }), button(function() { slideTools.sendFn() }))
						)
					),
					// the list of tools animate down to reveal
					div('tools', toolsSectionStyle,
						style(translate.y(toolsOffset - 1)),
						style({ height:toolsHeight - 2 - toolsOffset }),
						div('button tool write', icons.chat, button(function() {
							selectText()
						})),
						div('button tool photo', icons.camera, button(function() {
							selectPhoto()
						})),
						div('button tool voice', icons.voice, button(function() {
							selectVoice()
						})),
						div('button tool location', icons.mapMarker, button(function() {
							selectLocation()
						})),
						div('button tool draw', icons.palette, button(function() {
							selectDraw()
						}))
					)
				)
			)
		)
	}
}

$(function() {
	$('#appContainer').append(
		div({ id:'composerCanvas' }, style({ width:viewport.width() }), style(translate.y(viewport.height(), 0)),
			div('toolCanvasBorder', repeatImage.x('keyboard-border', 1, 2)),
			div('toolCanvas')
		)
	)
})

repeatImage = {
	x: function(name, width, height) {
		return style({ background:image.background(name, width, height), backgroundSize:px(width, height), height:height, backgroundRepeat:'repeat-x' })
	},
	y: function(name, width, height) {
		return style({ background:image.background(name, width, height), backgroundSize:px(width, height), width:width, backgroundRepeat:'repeat-y' })
	}
}

var hideTextInput = function() {}
function selectText() {
	var fadeDuration = 150
	var uniqueId = tags.id()
	var optionsHeight = 43

	slideTools.out(gKeyboardHeight + optionsHeight, renderTextInput, renderKeyboards, sendTextMessage, optionsHeight) // the webview will slide with the keyboard as well
	$('#'+uniqueId).focus()
	
	setTimeout(fadeInTextInput, 100)
	
	function fadeInTextInput() {
		$('#'+uniqueId).css({ opacity:1 })
	}
	
	function renderTextInput(width) {
		var padding = 4
		$('#appContainer').append(div('textInputArea', { id:uniqueId, contentEditable:'true' },
			style(scrollable.y),
			style(transition('opacity', fadeDuration)),
			style({
				opacity:0,
				padding:px(padding),
				width:width - padding * 2,
				margin:px(4,0),
				'-webkit-user-select':'auto',
				maxHeight:154,
				position:'absolute',
				left:Math.round((viewport.width() - width) / 2) - 10,
				bottom:optionsHeight + 4
			})
		))
		return null
	}
	
	function renderKeyboards() {
		return [
			map(['Abc', ':)',':->',':('], function(keyboard, keyboardNum) {
				return div(style({ 'float':'left', textAlign:'center', width:80, height:optionsHeight, background:'#9199A4' }), keyboard, button(function() {
					if (keyboardNum == 0) {
						hideEmoticons()
					} else {
						showCustomKeyboard(function() {
							var numPerKeyboard = 7 * 4
							return [
								div(style({ margin:px(0, 0, 0, 6) }),
									map(new Array(numPerKeyboard), function(_,i) {
										var keyboardSize = 32
										var textSize = 20
										var keyboardSize2 = keyboardSize * 2
										var textSize2 = textSize * 2
										var emojiNum = (keyboardNum - 1) * numPerKeyboard + i + 1
										return div('key',
											button(function() {
												pasteHtmlAtInputCaret(img(
													{ src:image.base+'emoji/'+textSize2+'x'+textSize2+'/'+emojiNum+'.png' },
													style({ width:textSize, height:textSize })
												).toString())
											}),
											style({
												width:keyboardSize, height:keyboardSize, 'float':'left', margin:6,
												background:'url('+image.base+'emoji/'+keyboardSize2+'x'+keyboardSize2+'/'+emojiNum+'.png)',
												backgroundSize:keyboardSize+'px '+keyboardSize+'px'
											})
										)
									})
								)
							]
						})
					}
				}))
			})
		]
	}
	
	function sendTextMessage() {
		var message = trim($('#appContainer .textInputArea').text())
		if (!message) { return }
		$('#appContainer .textInputArea').html('')
		sendMessage('text', { body:message })
	}
	
	hideTextInput = function() {
		setTimeout(function() { $('#'+uniqueId).css({ opacity:1 }) }, 100)
		
		hideTextInput = function() {}
		hideEmoticons()
		bridge.command('textInput.hideKeyboard')
		$('#'+uniqueId).css({ opacity:0 })
		setTimeout(function() {
			// Removing the element before command('textInput.hideKeyboard') has actually found the input
			// causes the entire screen to go black. Just move it out of the way instead of removing it
			$('#'+uniqueId).css(translate(-9999,-9999))
			setTimeout(function() { $('#'+uniqueId).remove() }, 5000)
		}, fadeDuration)
	}
}

function showCustomKeyboard(contentFn) {
	if (!$('#customKeyboard')[0]) {
		$('#dogoApp').append(div({ id:'customKeyboard' },
			style({ position:'absolute', bottom:-gKeyboardHeight, left:0, width:viewport.width(), height:gKeyboardHeight }),
			div(repeatImage.x('keyboard-border', 1, 2)),
			// div(style({ height:1, background:'-webkit-gradient(linear, left top, left bottom, from(#151515), to(#fff))' })),
			// div(style({ height:1, background:'#3A3D41' })),
			// div(style({ height:1, background:'#B3B8BE' })),
			div('content')
		))
		bridge.command('viewport.expand', { height:gKeyboardHeight })
	}
	$('#customKeyboard .content').empty().append(contentFn())
	setTimeout(function() {
		bridge.command('viewport.putOverKeyboard')
	})
}
function hideEmoticons() {
	bridge.command('viewport.putUnderKeyboard')
	$('#customKeyboard').remove()
}


events.on('message.selected', function() {
	hideTextInput()
})

var slideTools = {
	duration:275,
	out: function(height, glassBarContentFn, canvasContentFn, sendFn, translation) {
		if (!translation) { translation = height }
		translation += 2 // 2 px border image
		slideTools.sendFn = sendFn
		$('#composer')
			// .css(translate.y(-height, slideTools.duration))
			// .css(transition('height', slideTools.duration))
			// .css({ height:height + toolsHeight })
		$('#composer .toolsSlider .centerContent').empty().append(glassBarContentFn(glassContentWidth))
		var delay = 0
		$('#composer .toolsSlider').css(translate.y(0, slideTools.duration * 1, delay))

		$('#dogoApp').css(translate.y(-translation, slideTools.duration))
		$('#composerCanvas').css(translate.y(-translation, slideTools.duration))
		$('#composerCanvas .toolCanvas').empty().css({ height:height }).append(canvasContentFn(viewport.width(), height))
	},
	backIn: function() {
		$('#composer')
			// .css(translate.y(0, slideTools.duration))
			// .css({ height:toolsHeight })
		var delay = 0
		$('#composer .toolsSlider').css(translate.y(-toolsHeight, slideTools.duration * 1, delay))
		$('#dogoApp').css(translate.y(0, slideTools.duration))
		$('#composerCanvas').css(translate.y(0, slideTools.duration))
		hideTextInput()
	}
}

function selectVoice() {
	slideTools.out(150, renderAudioGraphic, renderAudioRecorder, sendVoiceMessage)
	setTimeout(prepareAudioRecording, slideTools.duration)
	
	function renderAudioGraphic() {
		return div('audioGraphic', 'AUDIO GRAPHIC')
	}
	
	function renderAudioRecorder() {
		return [
			div('button', 'Hold & speek', button({
				start:function() {
					bridge.command('audio.record', function(err) {
						if (err) { return error(err) }
					})
				},
				end:function() {
					bridge.command('audio.stopRecording', function(err) {
						if (err) { return error(err) }
					})
				}
			})),
			div('button', 'Listen', button(function() {
				bridge.command('audio.play', function(err) {
					if (err) { return error(err) }
				})
			})),
		]
	}
	
	function sendVoiceMessage() {
		sendMessage('audio')
	}
	
	function prepareAudioRecording() {
		return
		bridge.command('audio.prepareRecording', function(err) {
			if (err) { return error(err) }
		})
	}
}

function selectLocation() {
	slideTools.out(150, renderLocationGlassContent, renderLocationCanvas, sendLocationMessage)
	
	function renderLocationGlassContent(width) {
		var padding = 4
		return div('button', 'My Current Location', style({ marginTop:7, padding:px(padding), width:width-padding*2-4 }), button(function() {
			alert("TODO: Get current location")
		}))
	}
	
	function renderLocationCanvas(width, height) {
		var margin = 4
		var border = 1
		return div('locationContent', style({ margin:margin, width:width-(margin+border)*2, height:height-(margin+border+1)*2, border:'1px solid #fff', borderRadius:4 }))
	}
	
	function sendLocationMessage() {
		alert("TODO send location message")
	}
}

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
				sendMessage('picture', { base64Data:data, width:width, height:height })
				$drawComposer.css(translate.y(-viewport.height()))
			}
		})
	).css({ position:'absolute', top:0 }).css(translate.y(viewport.height()))
	$drawComposer.appendTo('#dogoApp')
	setTimeout(function() {
		$drawComposer.css(translate.y(0, 350))
	})
}

function sendMessage(type, messageData) {
	var clientUid = gState.nextClientUid()
	var conversation = currentConversation
	
	var message = eventEmitter('message', {
		toParticipationId:conversation.participationId,
		fromPersonId:gState.me().personId,
		clientUid:clientUid,
		type:type,
		payload:{}
	})
	
	var commandData = {
		method:"POST",
		url:api.getUrl('api/message'),
		headers:api.getHeaders(),
		boundary: '________dgmltprtbndr',
		params:message
	}
	
	var preview = null
	
	if (type == 'audio') {
		var filename = 'audio-'+time.now()+'.m4a'
		bridge.command('audio.save', { filename:filename }, function(err, res) {
			commandData.audioLocation = res.location
			commandData.params.payload.duration = res.duration
			bridge.command('audio.send', commandData, onResponse)
			previewMessage(message, { duration:res.duration })
		})
	} else if (type == 'picture') {
		commandData.params.payload.width = messageData.width
		commandData.params.payload.height = messageData.height
		commandData.base64Data = messageData.base64Data // the iOS proxy converts it to an octet stream
		bridge.command('picture.send', commandData, onResponse)
		previewMessage(message, { base64Data:messageData.base64Data, width:messageData.width, height:messageData.height })
	} else if (type == 'text') {
		commandData.params.payload = { body:messageData.body } // for text messages, send the payload as part of the params
		bridge.command('text.send', commandData, onResponse)
		previewMessage(message, { body:messageData.body })
	}

	function onResponse(err, res) {
		if (err) { return error(err) }
		conversation.lastMessage = res.message
		conversation.lastSentMessage = res.message
		events.fire('message.sent', res, conversation)
		message.events.fire('sent', res.message)
	}
}

function previewMessage(message, preview) {
	message.preview = preview
	events.fire('message.sending', message)
}

events.on('view.changing', function onViewRenderEvent() {
	if (!currentConversation) { return }
	composer.remove()
})
