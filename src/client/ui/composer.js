var trim = require('std/trim')
var placeholder = 'Say something :)'
var drawer = require('./drawer')

var currentAccountId
var currentFacebookId
var $ui
var currentTool = null

var composer = module.exports = {
	selectDraw:selectDraw,
	sendMessage:sendMessage,
	hide:function() {
		drawer.remove()
		resetCurrentTool()
		if (!$ui) { return }
		$ui.surface.empty()
		delete $ui
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
		resetCurrentTool()
		
		return div('composer',
			$ui.surface = $(div('surface')),
			div('tools',
				div('button tool', div('icon write'), button(toolSelector(selectText))),
				div('button tool', div('icon photo'), button(toolSelector(onSelectPhoto))),
				div('button tool', div('icon draw'), button(toolSelector(onSelectDraw)))
			)
		)
	}
}

function resetCurrentTool() {
	currentTool = null
}

function toolSelector(fn) {
	return function() {
		if (currentTool == fn) { return }
		bridge.command('textInput.hide')
		fn()
		currentTool = fn
	}
}

function selectText($e) {
	$('.composer .tools').append(
		div('closeTextInput', div('icon'), button(function() {
			bridge.command('textInput.hide')
		}))
	)	
	var onReturnHandler = events.on('textInput.return', function(info) {
		if (!$ui) { return }
		bridge.command('textInput.set', { text:'' })
		var body = trim(info.text)
		if (!body) { return }
		sendMessage({ body:body })
	})
	events.once('keyboard.willHide', function(info) {
		if (currentTool == selectText) { resetCurrentTool() }
		events.off('textInput.return', onReturnHandler)
	})
	
	events.fire('composer.selectedText')
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
	$('.dogoApp').append(
		drawer.render({ onSend:sendImage, onHide:hideDraw, img:img, message:message }).css(translate.y(viewport.height()))
	)
	setTimeout(function() {
		$('.dogoApp .draw-composer').css(translate.y(0, selectDraw.duration))
	})
}
selectDraw.duration = 300
function hideDraw() {
	$('.dogoApp .draw-composer').css(translate.y(viewport.height(), selectDraw.duration))
	setTimeout(function() {
		composer.hide()
	}, selectDraw.duration)
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
