module.exports = {
	setup:setupDevButtons
}

function setupDevButtons() {
	var $buttons = $(div(style({ position:'absolute', top:0, left:0 })))
	var padded = style({ padding:10, color:'#fff' })
	each([-180, -90, 0, 90, 180], function(deg) {
		$buttons.append(div(padded, 'Rotate: ', deg, button(function() {
			events.fire('device.rotated', { deg:deg })
		})))
	})
	$buttons.append(div(padded, 'Clear state', button(function() {
		gState.clear()
	})))
	$buttons.append(div(padded, 'Run Usage tests', button(function() {
		clientTests.runUsageTests()
	})))
	$buttons.append(div(padded, 'Run Connect tests', button(function() {
		clientTests.runConnectTests()
	})))
	var splashShowing = false
	$buttons.append(div(padded, 'Toggle Splash Screen', button(function() {
		var duration = 500
		if (splashShowing) {
			$('#splashScreen').css({ opacity:0 })
			setTimeout(function() { $('#splashScreen').remove() }, duration)
		} else {
			$('#viewport').append(
				img({ id:'splashScreen', src:'/ios/Default.png' },
					style({ position:'absolute', top:-20, left:0, opacity:0, zIndex:2, width:viewport.width(), height:viewport.height()+20 }),
					style(transition({ opacity:500 }))
				)
			)
			setTimeout(function() { $('#splashScreen').css({ opacity:1 }) })
		}
		splashShowing = !splashShowing
	})))
	$buttons.append(div(padded,
		div(null, 'Add email address', button(function() {
			var email = trim($('#addEmailAddress').val())
			$('#addEmailAddress').val('')
			Conversations.addAddresses([Addresses.email(email, 'Test Email')], function() {
				console.log('addedd', arguments)
			})
		})),
		input({ id:'addEmailAddress' })
	))
	$('body').append($buttons)
}