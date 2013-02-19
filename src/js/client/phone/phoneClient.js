require('client/globals')

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
	$('#viewport').append(div({ id:'centerFrame' }, style(viewport.size()))).append(div({ id:'southFrame' }, style({ width:viewport.width(), height:0 })))
	
})