var trim = require('std/trim')
var placeholder = 'Say something :)'
var drawer = require('./drawer')

var currentAccountId
var currentFacebookId
var $currentViewUi
var $ui

var composer = module.exports = {
	selectDraw:selectDraw,
	hide:function() {
		if (!$ui) { return }
		gScroller.$head.show()
		$ui.surface.empty()
		if ($ui.drawer) { $ui.drawer.remove() }
		bridge.command('textInput.hide')
		delete $ui
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
						div('button tool', div('icon write'), button(selectText)),
						div('button tool', div('icon photo'), button(onSelectPhoto)),
						div('button tool', div('icon draw'), button(onSelectDraw))
					)
				)
			)
		}
		
		function selectText(e) {
			composer.hide()
			var y0 = viewport.height()
			var y1 = 229
			var pos = { x:0, y:y0, width:320, height:35 }
			var appOffset = -213
			bridge.command('textInput.show', {
				at:pos,
				returnKeyType:'Send',
				font: { name:'Open Sans', size:16 },
				backgroundImage:'img/background/exclusive_paper.jpg',
				cornerRadius:3,
				borderColor:[0,0,0,.1]
			})
			events.once('keyboard.willShow', function(info) {
				$('body > .app').css('-webkit-transform', 'translateY('+appOffset+'px)')
				pos.y = y1
				bridge.command('textInput.animate', {
					duration:info.keyboardAnimationDuration,
					to:pos
				})
			})
			events.once('keyboard.willHide', function(info) {
				$('body > .app').css('-webkit-transform', 'translateY(0px)')
				pos.y = y0
				bridge.command('textInput.animate', {
					duration:info.keyboardAnimationDuration,
					to:pos
				})
				setTimeout(function() {
					bridge.command('textInput.hide')
				}, info.keyboardAnimationDuration * 1000)
			})
			events.on('textInput.changedHeight', function(info) {
				appOffset += info.heightChange
				$('body > .app').css('-webkit-transform', 'translateY('+appOffset+'px)')
			})
			$ui.surface.append(div('writer'))
		}
	}
}

function onSelectDraw($e) { selectDraw() }
function onSelectPhoto($e) {
	bridge.command('menu.show', {
		titles:['Pick from Library', 'Take Photo']
	}, function(err, res) {
		if (err) { return error(err) }
		if (!res) { return }
		var sources = ['libraryPhotos', 'camera']
		var source = sources[res.index]
		if (!source) { return }
		bridge.command('media.pick', { source:source }, function(err, res) {
			if (!res.mediaId) { return }
			selectDraw({ mediaId:res.mediaId }, { pictureWidth:res.width, pictureHeight:res.height })
		})
	})
}

function selectDraw(img, message) {
	composer.hide()
	gScroller.$head.hide()
	$('body > .app').append($ui.drawer=drawer.render({ onSend:sendImage, onHide:composer.hide, img:img, message:message }))
}

function sendImage(data, width, height) {
	send({ picWidth:width, picHeight:height, base64Picture:data })
	composer.hide()
}

var onReturnHandler
events.on('textInput.return', onReturn=function(info) {
	if (!$ui) { return }
	bridge.command('textInput.set', { text:'' })
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
	events.off('textInput.return', onReturnHandler)
	composer.hide()
})
