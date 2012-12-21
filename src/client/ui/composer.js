var trim = require('std/trim')
var placeholder = 'Say something :)'
var drawer = require('./drawer')

var currentConversation = null
var currentTool = null

var selectText = toolSelector(_selectText)
var selectPhoto = toolSelector(_selectPhoto)
var selectDraw = toolSelector(_selectDraw)

var toolsHeight = 40

var icons = icon.preload({
	chat: ['glyphish/white/09-chat-2', 24, 22],
	camera: ['glyphish/white/86-camera', 24, 18, 0, 0, 1],
	palette: ['glyphish/white/98-palette', 24, 20],
	close: ['glyphish/custom/298-circlex', 22, 23, 6, 6, 6, 6]
})

var composer = module.exports = {
	selectText:selectText,
	selectDraw:selectDraw,
	selectPhoto:selectPhoto,
	sendMessage:sendMessage,
	hide:function(hideOnlyIfThisToolIsUsed) {
		if (hideOnlyIfThisToolIsUsed && currentTool != hideOnlyIfThisToolIsUsed) { return }
		currentTool = null
		setHeight(toolsHeight, 250)
		
		if (!currentConversation) { return }
		currentConversation = null
		bridge.command('textInput.hide')
	},
	render: function(view) {
		currentTool = null
		currentConversation = view.conversation
		
		return div({ id:'composer' }, style({ height:viewport.height() }), style(translate(0, viewport.height()-toolsHeight)),
			div('tools',
				style({ height:toolsHeight }),
				div('button tool write', icons.chat, button(selectText)),
				div('button tool photo', icons.camera, button(selectPhoto)),
				div('button tool draw', icons.palette, button(selectDraw))
			),
			div('inputArea')
		)
	}
}

function setHeight(height, duration) {
	$('#composer').css(translate.y(viewport.height() - height, duration))
	setHeight.lastHeight = height
}
function addHeight(height, duration) {
	setHeight(setHeight.lastHeight + height, duration)
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
	$('#composer .tools').append(
		div('closeTextInput',
			icons.close,
			style({ position:'absolute', top:6, right:8 }),
			button(function() { bridge.command('textInput.hide') })
		)
	)
	var onReturnHandler = events.on('textInput.return', function(info) {
		if (!currentConversation) { return }
		bridge.command('textInput.set', { text:'' })
		var body = trim(info.text)
		if (!body) { return }
		sendMessage({ body:body })
	})

	var inputHeight = 36
	var inputWidth = 262
	var margin = 6
	setHeight(toolsHeight + inputHeight + margin * 2 - 4, 200)
	var textComposer = div(
		face.mine(inputHeight),
		div('textInputBackground', style({
			width:inputWidth , height:inputHeight, marginLeft:margin
		}))
	)
	
	$('#composer .inputArea').empty().append(textComposer)
	
	var fudgeInputHeight = 3
	bridge.command('textInput.show', {
		at:{ x:margin, y:viewport.height() - inputHeight - margin * 2 + fudgeInputHeight, width:inputWidth, height:inputHeight + fudgeInputHeight },
		returnKeyType:'Send',
		font: { name:'Open Sans', size:16 },
		backgroundColor:[0,0,0,0],
		shiftWebview:true
	})
	var onChangeHeightHandler = events.on('textInput.changedHeight', function adjustHeight(info) {
		addHeight(info.heightChange, 0)
		$('#composer .textInputBackground').css({ height:info.height - 2 })
		var $view = gScroller.getCurrentView()
		var isAtBottom = Math.abs($view[0].scrollHeight - ($view.scrollTop() + $view.height())) < 40
		$('.conversationView .messagesList').css({ marginBottom:info.height - inputHeight + 60 })
		if (isAtBottom) {
			$view.scrollTop($view[0].scrollHeight)
		} else {
			$view.scrollTop($view.scrollTop() + info.heightChange)
		}
	})
	events.once('keyboard.willHide', function(info) {
		$('#composer .tools .closeTextInput').remove()
		$('.conversationView .messagesList').css({ marginBottom:0 })
		events.off('textInput.changedHeight', onChangeHeightHandler)
		bridge.command('textInput.hide')
		composer.hide(_selectText)
	})
	
	// setTimeout(function() { bridge.command('textInput.set', { text:'This is a long string to cause wrap W' }) })// AUTOS automatically resize composer text input
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
			if (!res.mediaId) { return }
			selectDraw({ mediaId:res.mediaId }, { pictureWidth:res.width, pictureHeight:res.height })
		})
	})
}

function _selectDraw(img, message) {
	$('#composer .inputArea').empty().append(
		drawer.render({
			img:img,
			message:message,
			onHide:composer.hide,
			onSend:function sendImage(data, width, height) {
				sendMessage({ picture:{ width:width, height:height, base64Data:data } })
				composer.hide(_selectDraw)
			}
		})
	)
	setHeight(viewport.height() + toolsHeight, 350)
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
	if (!currentConversation) { return }
	composer.hide()
	$('#composer').remove()
})
