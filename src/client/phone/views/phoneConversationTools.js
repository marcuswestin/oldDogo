module.exports = {
	selectText:selectText,
	selectCamera:selectCamera
}

var duration = 300
var conversation

function selectText(_conversation) {
	conversation = _conversation
	var canvasHeight = unit * 2
	$('#centerFrame')
		.css(transition('-webkit-transform', duration))
		.css(translate.y(-(canvasHeight + unit*4)))
	$('#southFrame')
		.css(transition('-webkit-transform', 0))
		.css(translate.y(0))
	nextTick(function() {
		$('#southFrame')
			.append(_renderText(canvasHeight))
			.css(transition('-webkit-transform', duration))
			.css(translate.y(-(canvasHeight + footHeight)))
	})
}

function selectCamera(_conversation) {
	conversation = _conversation
	var camSize = viewport.width() - unit
	var camPad = unit/2
	var toolsHeight = unit * 5
	var height = viewport.width() + unit*6
	$('#centerFrame, #southFrame').css(transition('-webkit-transform', duration)).css(translate.y(-(camSize + camPad*2 + toolsHeight)))
	$('#southFrame').empty().css({ background:'transparent' }).append(
		div('tools', style({ width:viewport.width(), height:toolsHeight, background:"#fff" }),
			div('button', 'close', unitPadding(1), button(function() {
				bridge.command('BTCamera.hide', function() {
					$('#centerFrame, #southFrame').css(translate.y(0))
				})
			}))
		),
		div('overlay', style({ width:camSize, height:camSize, border:camPad+'px solid #fff' }),
			div(style(translate(20,20)), 'Hi')
		)
	)
	after(duration, function() {
		bridge.command('BTCamera.show', { position:[unit/2, viewport.height()-camSize-camPad-20, camSize, camSize] })
	})
}

var id
function _renderText(canvasHeight) {
	// setTimeout(_showTextFormatting, 400) // AUTOS
	id = tags.id()
	Documents.read('TextDraft-'+conversation.conversationId, function(err, data) {
		if (err) { return error(err) }
		var text = (data && data.text) || ''
		$('#'+id).text(text)
		$('#'+id).focus()
		after(duration/2, function() {
			if (text) {
				$('#'+id).text(text)
			} else {
				$('#'+id).text('.') // we do this again to update the cursor position
				after(0, function() { $('#'+id).text('') })
			}
		}) 
	})
	return div(style({ height:canvasHeight+keyboardHeight, background:'#fff' }),
		div({ id:id, contentEditable:'true' }, style(unitPadding(1), scrollable.y, {
				position:'absolute', bottom:0, '-webkit-user-select':'auto', maxHeight:26*units,
				width:viewport.width()-unit*2, background:'#fff', boxShadow:'0 -2px 3px -1px rgba(0,0,0,.5)',
			})
		),
		
		div(style({ height:unit*4, textAlign:'center' }, unitPadding(1/2), translate.y(-unit/4)),
			div(style(floatLeft), graphic('close', 32, 32), button(_closeText)),
			div('button', style(floatRight), 'Send', button(_sendText)),
			div('textColor', style({ color:'#333', display:'inline-block' }, unitPadding(1/2)), button(_showTextColor),
				'Color'
			),
			div('textFormatting', style({ color:'#333', display:'inline-block' }, unitPadding(1/2)), button(_showTextFormatting),
				span(style(bold), 'b'), span(style(italic), 'i'), span(style(underline), 'u')
			)
		)
	)
	
	function _closeText() {
		$('#'+id).blur()
		$('#centerFrame').css(translate.y(0))
		$('#southFrame').css(translate.y($('#'+id).height() + 2*unit))
		after(duration, function() { $('#southFrame').empty() })
		Documents.write('TextDraft-'+conversation.conversationId, { text:$('#'+id).text() }, error)
	}
	
	function _sendText() {
		var text = trim($('#'+id).text())
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

// var id = tags.id()
// $('#viewport').append(
// 	div({ id:id, contentEditable:'true' }, style(unitPadding(1), {
// 		position:'absolute', bottom:canvasHeight, '-webkit-user-select':'auto', opacity:0,
// 		width:viewport.width()-unit*2, background:'#fff', boxShadow:'0 -1px 2px rgba(0,0,0,.5)'
// 	}))
// )
// after(duration, function() {
// 	$('#'+id).focus()
// })

function sendMessage(type, messageData) {
	sessionInfo.getClientUid(function(err, clientUid) {
		if (err) { return error(err) }
		var message = { toParticipationId:conversation.participationId, fromPersonId:sessionInfo.person.personId, clientUid:clientUid, type:type, payload:{} }
		var commandData = { method:"POST", url:api.getUrl('api/message'), headers:api.getHeaders(), boundary: '________dgmltprtbndr', params:message }

		if (type == 'audio') {
			var filename = 'audio-'+time.now()+'.m4a'
			bridge.command('audio.save', { filename:filename }, function(err, res) {
				commandData.audioLocation = res.location
				commandData.params.payload.duration = res.duration
				bridge.command('audio.send', commandData, onResponse)

				message.preview = { duration:res.duration }
				events.fire('message.sending', message)
			})
		} else if (type == 'picture') {
			commandData.params.payload.width = messageData.width
			commandData.params.payload.height = messageData.height
			commandData.base64Data = messageData.base64Data // the iOS proxy converts it to an octet stream
			bridge.command('picture.send', commandData, onResponse)

			message.preview = { base64Data:messageData.base64Data, width:messageData.width, height:messageData.height }
			events.fire('message.sending', message)
		} else if (type == 'text') {
			commandData.params.payload = { body:messageData.body } // for text messages, send the payload as part of the params
			bridge.command('text.send', commandData, onResponse)
			
			message.preview = { body:messageData.body }
			events.fire('message.sending', message)
		}
	})
	
	function onResponse(err, res) {
		if (err) { return error(err) }
		// conversation.lastMessage = res.message
		// conversation.lastSentMessage = res.message
		// events.fire('message.sent', res, conversation)
	}
}