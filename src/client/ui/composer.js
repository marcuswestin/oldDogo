var trim = require('std/trim')
var placeholder = 'Say something :)'
var drawer = require('./drawer')

var currentConversation
var $ui
var currentTool = null

var selectText = toolSelector(_selectText)
var selectPhoto = toolSelector(_selectPhoto)
var selectDraw = toolSelector(_selectDraw)

var composer = module.exports = {
	selectText:selectText,
	selectDraw:selectDraw,
	selectPhoto:selectPhoto,
	sendMessage:sendMessage,
	hide:function() {
		drawer.remove()
		resetCurrentTool()
		if (!$ui) { return }
		$ui.surface.empty()
		delete $ui
		bridge.command('textInput.hide')
	},
	render: function(view) {
		currentConversation = view.conversation
		$ui = {}

		resetCurrentTool()
		
		return div('composer',
			$ui.surface = $(div('surface')),
			div('tools',
				div('button tool', div('icon write'), button(selectText)),
				div('button tool', div('icon photo'), button(selectPhoto)),
				div('button tool', div('icon draw'), button(selectDraw))
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
		var args = (arguments[0] && arguments[0].preventDefault) ? [] : arguments // don't pass through event objects as arguments
		bridge.command('textInput.hide')
		fn.apply(this, args)
		currentTool = fn
	}
}

function _selectText() {
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
		if (currentTool == _selectText) { resetCurrentTool() }
		events.off('textInput.return', onReturnHandler)
	})
	
	events.fire('composer.selectedText')
}

function _selectPhoto() {
	bridge.command('menu.show', {
		titles:['Pick from Library', 'Take Photo']
	}, function(err, res) {
		if (err) { return error(err) }
		if (!res) { return }
		var sources = ['libraryPhotos', 'camera']
		var source = sources[res.index]
		if (!source) { return }
		bridge.command('media.pick', { source:source, allowsEditing:true }, function(err, res) {
			if (currentTool == _selectPhoto) { resetCurrentTool() }
			if (!res.mediaId) { return }
			selectDraw({ mediaId:res.mediaId }, { pictureWidth:res.width, pictureHeight:res.height })
		})
	})
}

function _selectDraw(img, message) {
	$('.dogoApp').append(
		drawer.render({ onSend:sendImage, onHide:hideDraw, img:img, message:message }).css(translate.y(viewport.height()))
	)
	setTimeout(function() {
		$('.dogoApp .drawer').css(translate.y(0, selectDraw.duration))
	})
}
selectDraw.duration = 300
function hideDraw() {
	$('.dogoApp .drawer').css(translate.y(viewport.height(), selectDraw.duration))
	setTimeout(function() {
		composer.hide()
	}, selectDraw.duration)
}

function sendImage(data, width, height) {
	sendMessage({ picture:{ width:width, height:height, base64Data:data } })
	composer.hide()
}

function sendMessage(params) {
	var clientUid = gState.nextClientUid()
	
	var message = eventEmitter('message', {
		toConversationId:currentConversation.id,
		toPersonId:currentConversation.person.id,
		senderAccountId:gState.myAccount().accountId,
		localId:unique(),
		clientUid:clientUid,
		isSending:true
	})
	
	each(params, function(val, key) { message[key] = val })
	
	bridge.command('net.request', { method:"POST", headers:api.getHeaders(), path:api.getPath('message'), params:message }, function(err, res) {
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
