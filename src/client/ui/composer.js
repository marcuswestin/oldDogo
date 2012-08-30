var trim = require('std/trim')
var placeholder = 'Say something :)'
var drawer = require('./drawer')

var currentAccountId
var currentFacebookId
var $ui
var textHidden = true
var inputHeight = 39

var composer = module.exports = {
	selectDraw:selectDraw,
	sendMessage:sendMessage,
	hide:function() {
		drawer.remove()
		if (!$ui) { return }
		gScroller.$head.show()
		$ui.surface.empty()
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
			$('.composer .tools').append(
				div('closeTextInput', div('icon'), button(function() {
					bridge.command('textInput.hide')
				}))
			)	
			composer.hide()
			textHidden = false
			var y0 = viewport.height() - inputHeight
			var pos = { x:0, y:y0, width:284, height:inputHeight }
			var onReturnHandler = events.on('textInput.return', function(info) {
				if (!$ui) { return }
				bridge.command('textInput.set', { text:'' })
				var body = trim(info.text)
				if (!body) { return }
				sendMessage({ body:body })
			})
			bridge.command('textInput.show', {
				at:pos,
				returnKeyType:'Send',
				font: { name:'Open Sans', size:16 },
				backgroundImage:'img/background/exclusive_paper.jpg',
				cornerRadius:3,
				borderColor:[0,0,0,.1],
				shiftWebview:true
			})
			events.once('keyboard.willHide', function(info) {
				$('.composer .tools .closeTextInput').remove()
				$('.messagesWrapper .messages').css({ marginBottom:0 })
				events.off('textInput.return', onReturnHandler)
				events.off('textInput.changedHeight', onChangeHeightHandler)
				bridge.command('textInput.hide')
			})
			var onChangeHeightHandler = events.on('textInput.changedHeight', function adjustHeight(info) {
				var $wrapper = $('.messagesWrapper')
				var isAtBottom = ($wrapper[0].scrollHeight == $wrapper.scrollTop() + $wrapper.height())
				$('.messagesWrapper .messages').css({ marginBottom:info.height - inputHeight })
				if (isAtBottom) {
					$wrapper.scrollTop(9999999)
				} else {
					$wrapper.scrollTop($wrapper.scrollTop() - info.heightChange)
				}
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
	$('.dogoApp').append(drawer.render({ onSend:sendImage, onHide:composer.hide, img:img, message:message }))
}

function sendImage(data, width, height) {
	sendMessage({ pictureWidth:width, pictureHeight:height, base64Picture:data })
	composer.hide()
}

function sendMessage(params) {
	var message = eventEmitter({
		toAccountId:currentAccountId,
		toFacebookId:currentFacebookId,
		senderAccountId:gState.myAccount().accountId,
		localId:unique(),
		isSending:true
	})
	
	each(params, function(val, key) { message[key] = val })
	
	bridge.command('net.request', { method:"POST", headers:api.getHeaders(), path:api.getPath('messages'), params:message }, function(err, res) {
		if (err) { return error(err) }
		events.fire('message.sent', res)
		message.isSending = false
		message.events.fire('sent', res)
	})
	
	events.fire('message.sending', message)
}

events.on('view.change', function onViewRenderEvent() {
	composer.hide()
})
