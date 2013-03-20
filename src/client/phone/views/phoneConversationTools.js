var tools = module.exports = {
	renderFoot:renderFoot,
	selectText:selectTool(_textTool),
	selectCamera:selectTool(_cameraTool),
	selectMicrophone:selectTool(_microphoneTool)
}

function renderFoot(view, opts) {
	var toolStyle = { display:'inline-block', margin:px(unit/4) }
	return div({ id:'conversationFoot' }, style(translate(0,0)),
		style({
			margin:px(0, 1/2*unit), width:viewport.width()-unit, height:opts.height, background:'#fff',
			boxShadow:'0 -1px 2px rgba(0,0,0,.55), -1px 0 1px rgba(0,0,0,.55), 1px 0 1px rgba(0,0,0,.55)'
		}),
		div(
			opts.text && div(style(toolStyle), graphic('pen', 40, 40), button(function() { tools.selectText(view) })),
			opts.camera && div(style(toolStyle), graphic('pen', 40, 40), button(function() { tools.selectCamera(view) })),
			opts.microphone && div(style(toolStyle), graphic('pen', 40, 40), button(function() { tools.selectMicrophone(view) }))
		)
	)
}

var duration = 300

/* Text tool
 ***********/
var textId
_textTool.getHeight = function() { return unit*5.5 }
function _textTool(toolHeight, barHeight) {
	// setTimeout(_showTextFormatting, 400) // AUTOS
	textId = tags.id()
	Documents.read('TextDraft-'+uniqueDraftId, function(err, data) {
		if (err) { return error(err) }
		var dogoText = data && data.dogoText
		if (!dogoText) { return }
		$('#'+textId).html(DogoText.getHtml(dogoText))
	})
	
	var webViewAccessoryHeight = tags.isMobileSafari ? 62 : 0
	
	$('#viewport').append(
		div(style({ position:'absolute', bottom:toolHeight + barHeight - webViewAccessoryHeight, width:'100%' }),
			div({ id:textId, contentEditable:'true' }, style(unitPadding(1), scrollable.y, transition('opacity', duration/2), {
					'-webkit-user-select':'auto', maxHeight:26*units,
					width:viewport.width()-unit*2, background:'#fff', boxShadow:'0 -2px 3px -1px rgba(0,0,0,.5)',
					opacity:0
				})
			)
		)
	)
	
	nextTick(function() { $('#'+textId).css({ opacity:1 }) })
	
	return div(style({ height:toolHeight + barHeight, background:'#fff' }),
		div(style({ height:unit*4, textAlign:'center' }, unitPadding(1/2)),
			div(style(floatLeft), 'Close', graphic('close', 20, 20), button(_hideCurrentTool)),
			div('button', style(floatRight), 'Send', button(_sendText)),
			div('textColor', style({ color:'#333', display:'inline-block' }, unitPadding(1/2)), button(_showTextColor),
				'Color'
			),
			div('textFormatting', style({ color:'#333', display:'inline-block' }, unitPadding(1/2)), button(_showTextFormatting),
				span(style(bold), 'b'), span(style(italic), 'i'), span(style(underline), 'u')
			)
		)
	)
	
	function _sendText() {
		var text = getDogoText()
		if (!text) { return }
		sendMessage(Messages.types.text, { body:text })
		$('#'+textId).text('').focus()
	}
	
	function _showTextFormatting() {
		tooltip.show({ width:unit*25, height:unit*5, element:'.textFormatting', offset:[0,unit*4] }, function() {
			var styles = { width:unit*5.5, margin:px(unit/2, unit/4) }
			return div(style(fillWidth, fillHeight, radius(5), { background:'#fff', border:'1px solid #ccc', textAlign:'center' }),
				div('button', style(styles, bold), 'b', _textStyler('bold')),
				div('button', style(styles, italic), 'i', _textStyler('italic')),
				div('button', style(styles, underline), 'u', _textStyler('underline'))
			)
		})
		function _textStyler(styleType) {
			return button(function() {
				document.execCommand(styleType, false, null)
				tooltip.hide()
			})
		}
	}
	
	function _showTextColor() {
		tooltip.show({ element:'.textColor', width:unit*39, height:unit*5.5, offset:[unit*4,unit*4] }, function() {
			var styles = { width:unit*3, margin:px(unit/2, unit/4), height:unit*2 }
			return div(style(fillWidth, fillHeight, radius(5), { background:'#fff', border:'1px solid #ccc', textAlign:'center' }),
				map(DogoText.getTextColors(), function(color) {
					return div('button', style(styles, { background:rgb(color) }), button(function() {
						document.execCommand('foreColor', false, rgb(color))
						tooltip.hide()
					}))
				})
			)
		})
	}
}

/* Camera tool
 *************/
_cameraTool.getHeight = function() { return viewport.width()  }
function _cameraTool(toolHeight, barHeight) {
	var camPad = unit/2
	var camSize = toolHeight - camPad*2
	var picSize = viewport.width() * 2
	var barHeight = unit * 5
	var file
	var draftDoc = 'PictureDraft'+uniqueDraftId+'.jpg'
	bridge.command('BT.setStatusBar', { visible:false, animation:'slide' })
	after(duration, function() {
		bridge.command('BTCamera.show', { position:[unit/2, viewport.height()-camSize-camPad-20, camSize, camSize] })
	})
	return div('cameraTool',
		div('bar', style({ width:viewport.width(), height:barHeight + unit/2, background:"#fff" }),
			div('button', 'close', style(unitPadding(1)), button(function() {
				bridge.command('BTCamera.hide', function() {
					_hideCurrentTool()
				})
			})),
			div('button', 'Send', style(floatRight, unitPadding(1)), button(function() {
				sendMessage(Messages.types.picture, { document:draftDoc, width:picSize, height:picSize })
				$('#cameraOverlay').css({ background:'transparent' })
			}))
		),
		div('overlay', { id:'cameraOverlay' }, style({ width:camSize, height:camSize, textAlign:'center', border:camPad+'px solid #fff' }),
			div('button', style(translate(0, camSize - 50), { opacity:.8, border:'1px solid #fff' }), 'Take Picture', button(function() {
				var resize = [picSize, picSize]
				bridge.command('BTCamera.capture', { document:draftDoc, format:'jpg', compressionQuality:0.80, saveToAlbum:true, resize:resize }, function(err, res) {
					if (err) { return error(err) }
					var url = BT.url('BTImage.fetchImage', { document:draftDoc, resize:resize })
					$('#cameraOverlay').css(graphics.backgroundImage(url, camSize, camSize))
				})
			}))
		)
	)
}

/* Voice tool
 ************/
_microphoneTool.getHeight = function() { return unit * 14 }
function _microphoneTool(toolHeight, barHeight) {
	var draftName = 'AudioDraft-'+uniqueDraftId+'.m4a'
	var pad = unit/2
	var buttonStyles = style(unitMargin(1/2, 1/4))
	_microphoneTool.pitch = 0;
	return div({ id:'microphoneTool' },
		div('bar', style({ width:viewport.width(), height:barHeight, background:'#fff' }),
			div(style(unitPadding(0,1/4)),
				div('button', 'Close', buttonStyles, button(function() {
					_hideCurrentTool()
				})),
				div('button', 'Hi', buttonStyles, button(function() {
					_microphoneTool.pitch = 0.4
					bridge.command('BTAudio.setPitch', { pitch:_microphoneTool.pitch }, function() {
						console.log('Pitch set')
					})
				})),
				div('button', 'Play', buttonStyles, button(function() {
					bridge.command('BTAudio.playFromFileToSpeaker', { document:draftName, pitch:_microphoneTool.pitch }, function() {
						console.log("Playing")
					})
				})),
				div('button', 'Lo', buttonStyles, button(function() {
					_microphoneTool.pitch = -0.4
					bridge.command('BTAudio.setPitch', { pitch:_microphoneTool.pitch }, function() {
						console.log('Pitch set')
					})
				})),
				div('button', 'Send', style(floatRight), buttonStyles, button(function() {
					var sendDocName = 'AudioDocument-'+uniqueDraftId+'.m4a'
					bridge.command('BTAudio.readFromFileToFile', { fromDocument:draftName, toDocument:sendDocName, pitch:_microphoneTool.pitch }, function(err, res) {
						if (err) { return error(err) }
						sendMessage(Messages.types.audio, { document:sendDocName, duration:res.duration })
					})
				}))
			)
		),
		div('overlay', style({ width:viewport.width()-pad*2, height:toolHeight-pad*2, border:pad+'px solid #fff' }),
			div('decibelMeter', style({ height:4*unit, width:viewport.width()-pad*4 }, unitPadding(1/2)),
				div('volume', style({ background:'#fff', height:'100%', width:0 }))
			),
			div('button', 'Hold to Talk', style(translate(60,20)), button({
				start:function() {
					bridge.command('BTAudio.recordFromMicrophoneToFile', { document:draftName }, function() {
						console.log("Recording")
					})
				},
				end:function() {
					bridge.command('BTAudio.stopRecordingFromMicrophoneToFile', function() {
						console.log("Done recording")
					})
				}
			}))
		)
	)
}


events.on('BTAudio.decibelMeter', function(info) {
	var level = info.decibelLevel // roughly [-100, 0]
	var percentage = 100 + level
	$('#microphoneTool .decibelMeter .volume').css({ width:percentage+'%' })
})

/* Utilities for the tools
 *************************/
var uniqueDraftId
var view
var extraHeight = 0
var currentToolFn

function selectTool(toolFn) {
	return function(_view) {
		currentToolFn = toolFn
		view = _view
		uniqueDraftId = view.conversation ? 'conv-'+view.conversation.conversationId : 'contact-'+view.contact.contactUid
		var thisDuration = duration
		if (currentToolFn == _textTool) {
			extraHeight = 34
			if (tags.isMobileSafari) {
				thisDuration = 0
			}
		} else {
			extraHeight = 0
		}
		
		var toolHeight = toolFn.getHeight()
		var footHeight = $('#conversationFoot').height()
		
		$('#centerFrame').css(translate.y(-(toolHeight + extraHeight), thisDuration))
		$('#southFrame').empty().css(translate.y(0, 0))
			.append(toolFn(toolHeight, footHeight))
			.css(translate.y(-(toolHeight + footHeight), thisDuration))
		
		events.fire('tool.show')
	}
}

function preventDefault($e) { $e.preventDefault() }
function scrollToBottom() { window.scrollTo(0, 99999) }
events.on('tool.show', function() {
	$('#'+textId).focus().on('blur', _hideCurrentTool)
	if (tags.isMobileSafari) {
		$('#southFrame, #'+textId).on('touchmove', preventDefault)
		after(duration, function() {
			$(document).on('scroll', scrollToBottom)
		})
	}
})
events.on('tool.hide', function() {
	$('#'+textId).off('blur', _hideCurrentTool)
	if (tags.isMobileSafari) {
		$('#southFrame, #'+textId).off('touchmove', preventDefault)
		$(document).off('scroll', scrollToBottom)
	}
})

events.on('view.changing', _hideCurrentTool)
function _hideCurrentTool() {
	if (!view) { return }
	view = null
	if (currentToolFn == _textTool) {
		Documents.write('TextDraft-'+uniqueDraftId, { dogoText:getDogoText() }, error)
		$('#'+textId).blur().css({ opacity:0 })
		after(duration, function() {
			$('#'+textId).remove()
		})
	}
	events.fire('tool.hide')
	bridge.command('BT.setStatusBar', { visible:true, animation:'slide' })
	$('#centerFrame').css(translate.y(0))
	$('#southFrame').css(translate.y(extraHeight || 0))
	after(duration, function() { $('#southFrame').empty() })
}

function getDogoText() {
	return trim(DogoText.fromNode($('#'+textId)[0]))
}

function sendMessage(type, data) {
	_withConversation(function(err) {
		if (err) { return error(err) }
		if (sessionInfo.person) {
			sessionInfo.getClientUid(function(err, clientUid) {
				if (err) { return error(err) }
				doSend(myIndex(), clientUid)
			})
		} else {
			doSend(sessionInfo.personIndex)
		}
		function doSend(personIndex, clientUid) {
			var message = { type:type, conversationId:parseInt(view.conversation.conversationId), personIndex:personIndex, clientUid:clientUid }
			var jsonParams = { message:message }
			var commandData = { method:"POST", url:api.getUrl('api/message'), headers:api.getHeaders(), boundary: '________dgmltprtbndr', jsonParams:jsonParams }
			var preview = null

			if (Messages.isAudio(message)) {
				commandData.document = data.document
				preview = { document:data.document }
				message.payload = { duration:data.duration }

			} else if (Messages.isPicture(message)) {
				commandData.document = data.document
				preview = { document:data.document }
				message.payload = { width:data.width, height:data.height }

			} else if (Messages.isText(message)) {
				message.payload = { body:data.body }
				preview = { body:data.body }

			} else {
				return error('Unknown message type ' + type)
			}
			
			bridge.command('message.send', commandData, onResponse)
			message.preview = preview // set message.preview after command has been sent to avoid sending the preview to the server
			events.fire('message.sending', message)
		}

		function onResponse(err, res) {
			if (err) { return error(err) }
			// conversation.lastMessage = res.message
			// conversation.lastSentMessage = res.message
			// events.fire('message.sent', res, conversation)
			
		}
	})
	
	function _withConversation(callback) {
		if (view.conversation) { return callback() }
		overlay.show('Sending first message...')
		var contacts = map([view.contact], function(c) {
			return { addressType:c.addressType, addressId:c.addressId, name:c.name, contactUid:c.contactUid }
		})
		Conversations.create(contacts, function(err, conversation) {
			if (err) { return callback(err) }
			overlay.hide()
			view.conversation = conversation
			saveViewStack(callback)
		})
	}
}

events.on('view.changing', function() { myIndex.cached = null })
function myIndex() {
	if (myIndex.cached) { return myIndex.cached }
	var people = view.conversation.people
	for (var index=0; index<people.length; index++) {
		if (!Addresses.equal(people[index], sessionInfo.person)) { continue }
		return myIndex.cached = index
	}
}
