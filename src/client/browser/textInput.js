module.exports = {
	show:showTextInput,
	animate:animateTextInput,
	hide:hideTextInput
}

var $input
var topBarOffset = 20

function showTextInput(data) {
	var at = data.at
	$input = $(input())
		.css({ position:'absolute', border:0, margin:0, padding:0, zIndex:1 })
		.css({ width:at.width, height:at.height, left:at.x, top:at.y - topBarOffset })
		.appendTo($('.app'))
		.on('keypress', onKeyPress)
		
	var keyboardAnimationDuration = 250
	events.fire('keyboard.willShow', { keyboardAnimationDuration:keyboardAnimationDuration })
	setTimeout(function() {
		$input.focus()
	}, keyboardAnimationDuration)
	$input.on('blur', function($e) {
		setTimeout(function() {
			events.fire('keyboard.willHide', { keyboardAnimationDuration:keyboardAnimationDuration })
		}, 100) // hack
	})
}

function animateTextInput(data) {
	var to = data.to
	var duration = data.duration
	$input.animate({ width:to.width, height:to.height, left:to.x, top:to.y - topBarOffset }, duration)
}

function hideTextInput() {
	if (!$input) { return }
	$input.remove()
	delete $input
}

var onKeyPress = function() {
	setTimeout(function() {
		events.fire('textInput.didChange', { text:$input.val() })
	}, 0)
}