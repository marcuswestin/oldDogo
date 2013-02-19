require('client/globals')

units = unit = 8

var fitInputText = require('tags/text/fitInputText')
$(document).on('input', 'input', fitInputText)
$(document).on('keypress', 'input', function($e) {
	if ($e.keyCode == 13) { $(this).blur() }
})
$(document).on('touchstart', 'input', function() {
	// $('input').blur()
	$(this).focus()
})

events.on('app.start', function() {
	$('#viewport').append(div({ id:'centerFrame' }, style(viewport.size(), { 'background':'#fff' }))).append(div({ id:'southFrame' }, style({ width:viewport.width(), height:0 })))
	
	$('#centerFrame').append(
		div(style({ padding:px(10*units, unit) }), 'Hello, this is a test to see how text wraps along multiple lines, and then again for a third line, text wraps along multiple lines, and then again for a third line, wraps along multiple lines, and then again for a third line, text wraps along multiple lines, and then again for a third line')
	)
	
	bridge.command('app.show', { fade:.95 })
})

bridge.init()