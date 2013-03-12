module.exports = {
	selectText:selectTool(_textTool),
	selectCamera:selectTool(_cameraTool),
	selectMicrophone:selectTool(_microphoneTool)
}

var duration = 300

/* Text tool
 ***********/
var id
_textTool.getHeight = function() { return unit*2 }
function _textTool(toolHeight, barHeight) {
	// setTimeout(_showTextFormatting, 400) // AUTOS
	id = tags.id()

	Documents.read('TextDraft-'+uniqueDraftId, function(err, data) {
		if (err) { return error(err) }
		var dogoText = data && data.dogoText
		function setDraft() { $('#'+id).html(DogoText.getHtml(dogoText)) }
		setDraft()
		$('#'+id).focus()
		after(duration/2, function() {
			if (dogoText) {
				setDraft()
			} else {
				$('#'+id).text('.') // we do this again to update the cursor position
				after(0, function() { $('#'+id).text('') })
			}
		}) 
	})
	
	return div(style({ height:keyboardHeight + toolHeight, background:'#fff' }),
		div({ id:id, contentEditable:'true' }, style(unitPadding(1), scrollable.y, transition('opacity', duration/2), {
				position:'absolute', bottom:0, '-webkit-user-select':'auto', maxHeight:26*units,
				width:viewport.width()-unit*2, background:'#fff', boxShadow:'0 -2px 3px -1px rgba(0,0,0,.5)',
				opacity:0
			})
		),
		
		after(duration/2, function() { $('#'+id).css({ opacity:1 }) }),
		
		div(style({ height:unit*4, textAlign:'center' }, unitPadding(1/2), translate.y(-unit/4)),
			div(style(floatLeft), graphic('close', 20, 20), button(_closeText)),
			div('button', style(floatRight), 'Send', button(_sendText)),
			div('textColor', style({ color:'#333', display:'inline-block' }, unitPadding(1/2)), button(_showTextColor),
				'Color'
			),
			div('textFormatting', style({ color:'#333', display:'inline-block' }, unitPadding(1/2)), button(_showTextFormatting),
				span(style(bold), 'b'), span(style(italic), 'i'), span(style(underline), 'u')
			)
		)
	)
	
	function getDogoText() {
		return trim(DogoText.fromNode($('#'+id)[0]))
	}
	
	function _closeText() {
		$('#'+id).blur()
		Documents.write('TextDraft-'+uniqueDraftId, { dogoText:getDogoText() }, error)
		_hideCurrentTool(unit*6)
	}
	
	function _sendText() {
		var text = getDogoText()
		if (!text) { return }
		sendMessage('text', { body:text })
		$('#'+id).text('').focus()
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
		var textColors = [blues[0], teals[0], greens[0], yellows[0], oranges[0], reds[0], purples[0]]
		tooltip.show({ element:'.textColor', width:unit*39, height:unit*5.5, offset:[unit*4,unit*4] }, function() {
			var styles = { width:unit*3, margin:px(unit/2, unit/4), height:unit*2 }
			return div(style(fillWidth, fillHeight, radius(5), { background:'#fff', border:'1px solid #ccc', textAlign:'center' }),
				map(textColors, function(color) {
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
	var barHeight = unit * 5
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
				console.log("Send pic")
			}))
		),
		div('overlay', style({ width:camSize, height:camSize, border:camPad+'px solid #fff' }),
			div(style(translate(20,20)), 'Hi')
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
					bridge.command('BTAudio.readFromFileToFile', { fromDocument:draftName, toDocument:sendDocName, pitch:_microphoneTool.pitch }, function(err) {
						if (err) { return error(err) }
						sendMessage('audio', { document:sendDocName })
					})
				}))
			)
		),
		div('overlay', style({ width:viewport.width()-pad*2, height:toolHeight-pad*2, border:pad+'px solid #fff' }),
			div('decibelMeter', style({ height:4*unit, width:viewport.width()-pad*4 }, unitPadding(1/2)),
				div('volume', style({ background:'blue', height:'100%', width:0 }))
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
function selectTool(toolFn) {
	return function(_view) {
		view = _view
		uniqueDraftId = view.conversation ? 'conv-'+view.conversation.conversationId : 'contact-'+view.contact.contactUid
		
		var toolHeight = toolFn.getHeight()
		var footHeight = $('#conversationFoot').height()
		
		$('#centerFrame').css(translate.y(-toolHeight, duration))
		$('#southFrame').empty().css(translate.y(0, 0))
		nextTick(function() {
			$('#southFrame')
				.append(toolFn(toolHeight, footHeight))
				.css(translate.y(-(toolHeight + footHeight), duration))
		})
	}
}

function _hideCurrentTool(extraHeight) {
	bridge.command('BT.setStatusBar', { visible:true, animation:'slide' })
	$('#centerFrame').css(translate.y(0))
	$('#southFrame').css(translate.y(extraHeight || 0))
	after(duration, function() { $('#southFrame').empty() })
}


function sendMessage(type, messageData) {
	sessionInfo.getClientUid(function(err, clientUid) {
		if (err) { return error(err) }
		var message = { toParticipationId:conversation.participationId, fromPersonId:sessionInfo.person.personId, clientUid:clientUid, type:type }
		var commandData = { method:"POST", url:api.getUrl('api/message'), headers:api.getHeaders(), boundary: '________dgmltprtbndr', params:message }
		var preview = null

		if (type == 'audio') {
			commandData.document = messageData.document
			message.payload = { duration:messageData.duration }
			preview = { document:messageData.document, duration:messageData.duration }
			bridge.command('message.send', commandData, onResponse)

		} else if (type == 'picture') {
			commandData.base64Data = messageData.base64Data // the iOS proxy converts it to an octet stream
			message.payload = { width:messageData.width, height:messageData.height }
			preview = { width:messageData.width, height:messageData.height, base64Data:messageData.base64Data }
			bridge.command('picture.send', commandData, onResponse)

		} else if (type == 'text') {
			message.payload = { body:messageData.body }
			preview = { body:messageData.body }
			bridge.command('text.send', commandData, onResponse)

		} else {
			return error('Unknown message type ' + type)
		}
		
		message.preview = preview // set message.preview after command has been sent to avoid sending the preview to the server
		events.fire('message.sending', message)
	})
	
	function onResponse(err, res) {
		if (err) { return error(err) }
		// conversation.lastMessage = res.message
		// conversation.lastSentMessage = res.message
		// events.fire('message.sent', res, conversation)
	}
}