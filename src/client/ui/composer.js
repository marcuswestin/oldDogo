var trim = require('std/trim')
var placeholder = 'Say something :)'
var drawer = require('./drawer')

var currentConversation = null
var currentTool = null

var selectText = toolSelector(_selectText)
var selectPhoto = toolSelector(_selectPhoto)
var selectDraw = toolSelector(_selectDraw)

var toolsHeight = 36

var composer = module.exports = {
	selectText:selectText,
	selectDraw:selectDraw,
	selectPhoto:selectPhoto,
	sendMessage:sendMessage,
	hide:function() {
		drawer.remove()
		resetCurrentTool()
		if (!currentConversation) { return }
		currentConversation = null
		bridge.command('textInput.hide')
	},
	render: function(view) {
		currentConversation = view.conversation
		resetCurrentTool()
		
		return div({ id:'composer' }, style({ height:viewport.height() }), style(translate(0, viewport.height()-toolsHeight)),
			div('tools',
				style(translate(0,-4)),
				style({ height:toolsHeight }),
				div('button tool write', icon(24, 22, 'white/09-chat-2'), button(selectText)),
				div('button tool photo', icon(24, 18, 'white/86-camera'), button(selectPhoto)),
				div('button tool draw', icon(24, 20, 'white/98-palette'), button(selectDraw))
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
	$('#composer .tools').append(
		div('closeTextInput', icon(22, 22, 'white/298-circlex', 6, 6, 6, 6), style({ position:'absolute', top:6, right:5 }), button(function() {
			bridge.command('textInput.hide')
		}))
	)
	var onReturnHandler = events.on('textInput.return', function(info) {
		if (!currentConversation) { return }
		bridge.command('textInput.set', { text:'' })
		var body = trim(info.text)
		if (!body) { return }
		sendMessage({ body:body })
	})
	events.once('keyboard.willHide', function(info) {
		if (currentTool == _selectText) { resetCurrentTool() }
		events.off('textInput.return', onReturnHandler)
	})
	
	var inputHeight = 36
	var inputWidth = 268
	var margin = 5
	var textComposerMarginTop = 2
	setHeight(toolsHeight + inputHeight + margin, 200)
	var textComposer = div(
		style({ marginTop:textComposerMarginTop }),
		div(face.mine(35), style({
			'float':'right', margin:'1px 3px 0 0', borderRadius:1,
			boxShadow:'0 1px 1px rgba(0, 0, 25, .5)', border:'1px solid rgba(255, 255, 255, .9)'
		})),
		div('textInputBackground', style({
			width:inputWidth, height:inputHeight, marginLeft:margin,
			background:'#fff', borderRadius:2, boxShadow:'0 1px 2px rgba(38, 151, 210, .8)'
		}))
	)
	
	$('#composer .inputArea').empty().append(textComposer)
	
	bridge.command('textInput.show', {
		at:{ x:margin, y:viewport.height() - inputHeight - margin + 1, width:inputWidth, height:inputHeight },
		returnKeyType:'Send',
		font: { name:'Open Sans', size:16 },
		backgroundColor:[0,0,0,0],
		shiftWebview:true
	})
	var onChangeHeightHandler = events.on('textInput.changedHeight', function adjustHeight(info) {
		addHeight(info.heightChange, 50)
		$('#composer .inputBackground').css({ height:info.height - 2 })
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
		setHeight(toolsHeight, 200)
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
