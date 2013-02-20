module.exports = {
	selectText:selectText
}

var duration = 300

function selectText() {
	var canvasHeight = unit*14
	$('#centerFrame')
		.css(transition('-webkit-transform', duration))
		.css(translate.y(-canvasHeight))
	$('#southFrame')
		.css({ height:canvasHeight+keyboardHeight })
		.append(_renderText)
		.css(transition('-webkit-transform', duration))
		.css(translate.y(-(canvasHeight + footHeight)))
}

function _renderText() {
	return div(style(fullHeight, { background:'#fff'}),
		'Text'
	)
}