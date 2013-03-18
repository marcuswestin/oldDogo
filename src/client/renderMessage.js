module.exports = renderMessage

var lastMessage
events.on('view.changing', function() { lastMessage = null })
function renderMessage(message, person) {
	var isNewPerson = !lastMessage || (lastMessage.fromPersonId != message.fromPersonId)
	var isNewTime = !lastMessage || (Math.abs(lastMessage.postedTime - message.postedTime) > (3 * time.hours))
	var makeNewCard = isNewPerson || isNewTime
	
	var bg = '#fff'
	
	return (makeNewCard
		? [div(style(unitMargin(1,1/2,0), unitPadding(1/2,1/2,0), { minHeight:unit*6, background:bg }),
			div(style(floatRight, { fontSize:12, marginRight:unit/2, color:'rgb(25,161,219)', textShadow:'0 -1px 0 rgba(0,0,0,.25)' }),
				time.ago.brief(message.postedTime)
			),
			div(style(floatLeft, { width:unit*6.5, height:unit*6.5 }),
				div(style(unitPadding(.5), { position:'absolute', zIndex:1, width:unit*5.5, height:unit*5.5, background:'#fff' }),
					face(person, { size:unit*5.5 })
				)
			),
			div(style(),
				person.name
			),
			div(style(unitMargin(1/4,0,0,0), unitPadding(0,0,1/2)),
				renderContent(message)
			)
		)
		]
		: div(style(unitMargin(0, 1/2), unitPadding(0,0,1/2,1/2), { background:bg }),
			renderContent(message)
		)
	)
}

function renderContent(message) {
	var payload = message.payload
	if (Messages.isText(message)) {
		return html(DogoText.getHtml(payload.body))
	} else if (Messages.isPicture(message)) {
		var url = BT.url('BTImage.fetchImage', message.preview
			? { document:message.preview.document }
			: { url:Payloads.url(message), cache:true }
		)
		var messageWidth = viewport.width() - unit*2
		var displaySize = [Math.min(messageWidth, payload.width / resolution), Math.min(messageWidth, payload.height / resolution)]
		var deltaX = (messageWidth - displaySize[0]) / 2
		return div(style(graphics.backgroundImage(url, displaySize[0], displaySize[1], { background:'#eee' }), translate.x(deltaX)))
	} else if (Messages.isAudio(message)) {
		var url = message.preview
			? BT.url('BTFiles.getDocument', { document:message.preview.document, mimeType:Payloads.mimeTypes[message.type] })
			: Payloads.url(message)
		return html('Voice message: '+round(payload.duration, 1)+'s <audio src="'+url+'" controls="true">')
	} else {
		return 'Cannot display message. Please upgrade Dogo!'
	}
}
