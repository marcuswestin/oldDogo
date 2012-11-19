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
		delete $ui
		bridge.command('textInput.hide')
	},
	render: function(view) {
		currentConversation = view.conversation
		$ui = {}

		resetCurrentTool()
		
		return div('composer', style({ '-webkit-transform': 'translate3d(0,0,0)' }),
			div('tools',
				div('button tool write', icon(24, 22, 'white/09-chat-2'), button(selectText)),
				div('button tool photo', icon(24, 18, 'white/86-camera'), button(selectPhoto)),
				div('button tool draw', icon(24, 20, 'white/98-palette'), button(selectDraw))
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
		div('closeTextInput', icon(22, 22, 'white/298-circlex'), button(function() {
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
	var conversation = currentConversation
	
	var message = eventEmitter('message', {
		toConversationId:conversation.id,
		toPersonId:conversation.person.id,
		senderAccountId:gState.myAccount().accountId,
		localId:unique(),
		clientUid:clientUid,
		isSending:true
	})
	
	each(params, function(val, key) { message[key] = val })
	
	bridge.command('net.request', { method:"POST", headers:api.getHeaders(), path:api.getPath('message'), params:message }, function(err, res) {
		if (err) { return error(err) }
		conversation.lastMessage = res.message
		conversation.lastSentMessage = res.message
		events.fire('message.sent', res, conversation)
		message.isSending = false
		message.events.fire('sent', res.message)
	})
	
	events.fire('message.sending', message)
}

events.on('view.change', function onViewRenderEvent() {
	composer.hide()
})
