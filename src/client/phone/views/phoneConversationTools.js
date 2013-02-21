module.exports = {
	selectText:selectText
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

var id
function _renderText(canvasHeight) {
	id = tags.id()
	Documents.read('TextDraft-'+conversation.conversationId, function(err, data) {
		if (err) { return error(err) }
		var text = (data && data.text) || ''
		$('#'+id).text(text)
		$('#'+id).focus()
		after(duration/2, function() { $('#'+id).text(text) }) // we do this again to update the cursor position
	})
	return div(style({ height:canvasHeight+keyboardHeight, background:'#fff'}),
		div({ id:id, contentEditable:'true' }, style(unitPadding(1), scrollable.y, {
				position:'absolute', bottom:0, '-webkit-user-select':'auto', maxHeight:26*units,
				width:viewport.width()-unit*2, background:'#fff', boxShadow:'0 -2px 3px -1px rgba(0,0,0,.5)',
			})
		),
		div(style({ height:unit*4, padding:px(unit/2) }),
			div(graphic('close', 32, 32), button(_closeText))
		)
	)
	
	function _closeText() {
		$('#'+id).blur()
		$('#centerFrame').css(translate.y(0))
		$('#southFrame').css(translate.y($('#'+id).height() + 2*unit))
		after(duration, function() { $('#southFrame').empty() })
		Documents.write('TextDraft-'+conversation.conversationId, { text:$('#'+id).text() }, error)
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
