module.exports = {
	setup:setup,
	show:showTextInput,
	animate:animateTextInput,
	hide:hideTextInput,
	set:setTextInput,
	hideKeyboard:hideKeyboard
}

var $input
var topBarOffset = 0

function setup() {
	$(document)
		.on('focus', '[contentEditable=true]', function() {
			shiftWebView(-keyboardHeight)
			showFakeKeyboard()
		})
		.on('blur', '[contentEditable=true]', function() {
			// return
			shiftWebView(0)
			hideFakeKeyboard()
		})
}

function hideKeyboard() {
	$('[contentEditable=true]').blur()
}

function setTextInput(data) {
	$input.val(data.text)
}

var keyboardHeight = 216
function showTextInput(data) {
	var at = data.at
	var padding = 6
	$input = $(input())
		.css({ position:'absolute', border:0, margin:0, padding:0, zIndex:3, padding:'0 '+padding+'px' })
		.css({ width:at.width - padding*2, height:at.height, left:at.x + $('.dogoApp').offset().left, top:at.y + gViewportTop })
		.on('keyup', onChange)
		.on('keypress', onChange)
		.appendTo(document.body)
	
	if (data.backgroundColor) {
		$input.css({ backgroundColor:'rgba('+data.backgroundColor.join(',')+')' })
	}
	
	var keyboardAnimationDuration = 200
	setTimeout(function() {
		if (!data.preventWebviewShift) {
			shiftWebView(-keyboardHeight)
			// $input.css(translate.y(-keyboardHeight, keyboardAnimationDuration))
		}
		events.fire('keyboard.willShow', { keyboardAnimationDuration:keyboardAnimationDuration })
		setTimeout(function() {
			$input.focus()
		}, keyboardAnimationDuration)
	}, 0)
	$input.on('blur', function($e) {
		// return
		if (!data.preventWebviewShift) {
			shiftWebView(0)
		}
		setTimeout(function() {
			events.fire('keyboard.willHide', { keyboardAnimationDuration:keyboardAnimationDuration })
		}, 100)
	})
	
	showFakeKeyboard()
}

var keyboardAnimationDuration = 200
function showFakeKeyboard() {
	$(div({ id:'fakeIPhoneKeyboard' }, style(translate.y(viewport.height())), style({
		background:'url(/graphics/mockPhone/iphoneKeyboard.png) white',
		backgroundSize:px(320,216), height:gKeyboardHeight, width:viewport.width(),
		position:'absolute', top:0
	}))).appendTo('#viewport').on('mousedown', function($e) { $e.preventDefault() })
	setTimeout(function() {
		$('#fakeIPhoneKeyboard').css(translate.y(viewport.height() - keyboardHeight, keyboardAnimationDuration))
	})
}

function shiftWebView(to) {
	$('.dogoApp').css(translate.y(to), keyboardAnimationDuration)
}

function hideFakeKeyboard() {
	$('#fakeIPhoneKeyboard').css(translate.y(viewport.height(), keyboardAnimationDuration))
	setTimeout(function() {
		$('#fakeIPhoneKeyboard').remove()
	}, keyboardAnimationDuration)
}

function animateTextInput(data) {
	var to = data.to
	var duration = data.duration
	$input.css({ width:to.width, height:to.height, left:to.x, top:to.y - topBarOffset })
}

function hideTextInput() {
	if (!$input) { return }
	$input.off('keyup').off('keypress').blur().remove()
	delete $input
	hideFakeKeyboard()
}

var onChange = function($e) {
	setTimeout(function() {
		var params = { text:$input.val() }
		events.fire('textInput.didChange', params)
		if ($e.keyCode == 13) { events.fire('textInput.return', params) }
	}, 0)
}