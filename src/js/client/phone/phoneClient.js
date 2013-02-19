require('client/globals')

units = unit = 8

// setTimeout(function() { toggleUnitGrid() }, 200) // AUTOS Toggle Unit Grid

var fitInputText = require('tags/text/fitInputText')
$(document).on('input', 'input', fitInputText)
$(document).on('keypress', 'input', function($e) {
	if ($e.keyCode == 13) { $(this).blur() }
})
$(document).on('touchstart', 'input', function() {
	// $('input').blur()
	$(this).focus()
})

events.on('app.start', startPhoneClient)

bridge.init()

function startPhoneClient() {
	$('#viewport')
		.append(div({ id:'centerFrame' }, style(viewport.size(), { 'background':'#fff' })))
		.append(div({ id:'southFrame' }, style({ width:viewport.width(), height:0 })))

	renderPhoneClient()

	bridge.command('app.show', { fade:.95 })
}

function renderPhoneClient() {
	$('#centerFrame').append(
		div(style({ height:2 * units })),
		div(style({ padding:unit }),
			span(null,
				'Hello, this is a test to see how text wraps along multiple lines, ',
				'and then again for a third line, text wraps along multiple lines, ',
				'and then again for a third line, wraps along multiple lines, and then',
				' again for a third line, text wraps along multiple lines, and then again for a third line'
			)
		),
		div('button', 'Toggle unit grid', style({ padding:unit }), { id:'toggleButton' }, button(toggleUnitGrid))
	)
}
