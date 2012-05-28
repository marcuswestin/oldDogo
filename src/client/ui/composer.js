var trim = require('std/trim')
var placeholder = 'Say something :)'
var draw = require('./draw')

var currentAccountId
var currentFacebookId
var $currentViewUi
var $ui

var composer = module.exports = {
	selectDraw:selectDraw,
	hide:function() {
		if (!$ui) { return }
		scroller.$head.show()
		$ui.surface.empty()
		if ($ui.drawer) { $ui.drawer.remove() }
		bridge.command('composer.hideTextInput')
	},
	render: function($viewUi, accountId, facebookId) {
		$ui = {}

		currentAccountId = accountId
		currentFacebookId = facebookId
		$currentViewUi = $viewUi
		
		return function($tag) {
			$tag.append(
				div('composer',
					$ui.surface = $(div('surface')),
					div('tools',
						div('button tool write', 'Write', button(selectText)),
						div('button tool draw', 'Draw', button(onSelectDraw))
					)
				)
			)
		}
		
		function selectText(e) {
			composer.hide()
			bridge.command('composer.showTextInput', { x:0, y:224, width:320, height:40 })
			$ui.surface.append(div('writer'))
		}
	}
}

function onSelectDraw(e) { selectDraw() }

function selectDraw(img, message) {
	composer.hide()
	scroller.$head.hide()
	$('body > .app').append($ui.drawer=draw.render({ onSend:sendImage, onHide:composer.hide, img:img, message:message }))
}

function sendImage(data, width, height) {
	send({ picWidth:width, picHeight:height, base64Picture:data })
	composer.hide()
}

events.on('composer.sendText', function(info) {
	var body = trim(info.text)
	if (!body) { return }
	send({ body:body })
})

function send(params) {
	var message = {
		toAccountId:currentAccountId,
		toFacebookId:currentFacebookId,
		senderAccountId:gState.myAccount().accountId
	}
	
	each(params, function(val, key) { message[key] = val })

	api.post('messages', message, function(err, res) {
		if (err) { return error(err) }
		events.fire('message.sent', res.message, res.toAccountId, res.toFacebookId)
	})
	
	// Server doesn't want to see pictureWidth for a while, because old clients were sending bad numbers. So it expects picWidth/picHeight.
	// But the client still expects pictureWidht/Height on messages
	message.pictureWidth = message.picWidth
	message.pictureHeight = message.picHeight
	events.fire('message.sending', message)
}

events.on('view.change', function onViewRenderEvent() {
	composer.hide()
})
