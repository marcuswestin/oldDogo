module.exports = {
	show:showTextInput,
	animate:animateTextInput,
	hide:hideTextInput,
	set:setTextInput
}

var $input
var topBarOffset = 0

function setTextInput(data) {
	$input.val(data.text)
}

function showTextInput(data) {
	var at = data.at
	$input = $(input())
		.css({ position:'absolute', border:0, margin:0, padding:0, zIndex:1 })
		.css({ width:at.width, height:at.height, left:at.x, top:at.y - topBarOffset })
		.appendTo($('#viewport'))
		.on('keypress', onKeyPress)
	
	var keyboardAnimationDuration = 250
	setTimeout(function() {
		events.fire('keyboard.willShow', { keyboardAnimationDuration:keyboardAnimationDuration })
		setTimeout(function() {
			$input.focus()
		}, keyboardAnimationDuration)
	}, 0)
	$input.on('blur', function($e) {
		setTimeout(function() {
			events.fire('keyboard.willHide', { keyboardAnimationDuration:keyboardAnimationDuration })
		}, 400)
	})
}

function animateTextInput(data) {
	var to = data.to
	var duration = data.duration
	$input.css({ width:to.width, height:to.height, left:to.x, top:to.y - topBarOffset })
}

function hideTextInput() {
	if (!$input) { return }
	$input.blur().remove()
	delete $input
}

var onKeyPress = function($e) {
	setTimeout(function() {
		var params = { text:$input.val() }
		events.fire('textInput.didChange', params)
		if ($e.keyCode == 13) { events.fire('textInput.return', params) }
	}, 0)
}