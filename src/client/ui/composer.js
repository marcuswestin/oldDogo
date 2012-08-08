var trim = require('std/trim')
var placeholder = 'Say something :)'
var drawer = require('./drawer')

var currentAccountId
var currentFacebookId
var $ui
var textHidden = true

var composer = module.exports = {
	selectDraw:selectDraw,
	hide:function() {
		if (!$ui) { return }
		gScroller.$head.show()
		$ui.surface.empty()
		if ($ui.drawer) { $ui.drawer.remove() }
		delete $ui
		if (textHidden) { return }
		textHidden = true
		bridge.command('textInput.hide')
	},
	render: function(opts) {
		opts = options(opts, {
			accountId:null,
			facebookId:null
		})
		$ui = {}

		currentAccountId = opts.accountId
		currentFacebookId = opts.facebookId
		
		return div('composer',
			$ui.surface = $(div('surface')),
			div('tools',
				div('button tool', div('icon write'), button(selectText)),
				div('button tool', div('icon photo'), button(onSelectPhoto)),
				div('button tool', div('icon draw'), button(onSelectDraw))
			)
		)
		
		function selectText(e) {
			$('.composer .tools').append(div('closeTextInput', button(function() {
				bridge.command('textInput.hide')
			})))
			composer.hide()
			textHidden = false
			var y0 = viewport.height()
			var y1 = 229
			var pos = { x:0, y:y0, width:284, height:35 }
			var appOffset = -213
			var onReturnHandler = events.on('textInput.return', function(info) {
				if (!$ui) { return }
				bridge.command('textInput.set', { text:'' })
				var body = trim(info.text)
				if (!body) { return }
				send({ body:body })
			})
			bridge.command('textInput.show', {
				at:pos,
				returnKeyType:'Send',
				font: { name:'Open Sans', size:16 },
				backgroundImage:'img/background/exclusive_paper.jpg',
				cornerRadius:3,
				borderColor:[0,0,0,.1]
			})
			events.once('keyboard.willShow', function(info) {
				$('.dogoApp').css('-webkit-transform', 'translateY('+appOffset+'px)')
				pos.y = y1
				bridge.command('textInput.animate', {
					duration:info.keyboardAnimationDuration,
					to:pos
				})
			})
			events.once('keyboard.willHide', function(info) {
				$('.composer .tools .closeTextInput').remove()
				events.off('textInput.return', onReturnHandler)
				$('.dogoApp').css('-webkit-transform', 'translateY(0px)')
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
				$('.dogoApp').css('-webkit-transform', 'translateY('+appOffset+'px)')
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
	$('.dogoApp').append($ui.drawer=drawer.render({ onSend:sendImage, onHide:composer.hide, img:img, message:message }))
}

function sendImage(data, width, height) {
	send({ pictureWidth:width, pictureHeight:height, base64Picture:data })
	composer.hide()
}

function send(params) {
	var message = {
		toAccountId:currentAccountId,
		toFacebookId:currentFacebookId,
		senderAccountId:gState.myAccount().accountId
	}
	
	each(params, function(val, key) { message[key] = val })
	
	if (message.base64Picture) {
		bridge.command('message.send', { message:message, headers:api.getHeaders() })
	} else {
		api.post('messages', message, function(err, res) {
			if (err) { return error(err) }
			events.fire('message.sent', { message:res.message, toAccountId:res.toAccountId, toFacebookId:res.toFacebookId, disableInvite:res.disableInvite })
		})
	}
	
	events.fire('message.sending', message)
}

events.on('view.change', function onViewRenderEvent() {
	composer.hide()
})

$('#viewport').on('touchmove', '.conversation', function() {
	composer.hide()
})
