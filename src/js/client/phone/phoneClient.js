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
}

function renderPhoneClient() {
	sessionInfo.load(function(err) {
		if (err) { return error('There was an error starting the app. Please re-install it. Sorry.') }
		
		if (sessionInfo.authToken) {
			alert('logged in')
		} else {
			gScroller = makeScroller({
				headHeight:0,
				onViewChanging:function onViewChanging() { events.fire('view.changing') },
				duration:300,
				renderHead:function(){ return 'head'},
				renderView:function() { return 'view'},
				renderFoot:function(){ return 'foot'}
			})
			
			$('#centerFrame').append(
				div({ id:'appBackground' }),
				div({ id:'appForeground' }, style(translate(0,0)),
					gScroller
				)
			)
		}
		bridge.command('app.show', { fade:.95 })
	})
}

