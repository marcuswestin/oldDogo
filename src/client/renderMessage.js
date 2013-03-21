module.exports = renderMessage

cardShadow = '0 2px 2px -1px rgba(0,0,25,.5)'

var lastMessage
events.on('view.changing', function() { lastMessage = null })
function renderMessage(message, person) {
	var isNewPerson, isNewTime
	if (!lastMessage) {
		isNewPerson = true
		isNewTime = true
	} else {
		isNewTime = (Math.abs(lastMessage.postedTime - message.postedTime) > (3 * time.hours))
		isNewPerson = message.personIndex != lastMessage.personIndex
	}

	var makeNewCard = isNewPerson || isNewTime
	lastMessage = message
	var bg = '#fff'
	
	return (makeNewCard
		? [div(style(unitMargin(1,1/2,0), unitPadding(1/2,1/2,0), { minHeight:unit*6, background:bg, boxShadow:cardShadow }),
			div(style(floatRight, { fontSize:12, marginRight:unit/2, color:'rgb(25,161,219)', textShadow:'0 -1px 0 rgba(0,0,0,.25)' }),
				time.ago.brief(message.postedTime)
			),
			div(style(floatLeft, { width:unit*6, height:unit*6 }),
				div(style({ position:'absolute', zIndex:1, width:unit*6, height:unit*6, background:'#fff' }),
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
		: div(style(unitMargin(0, 1/2), { background:bg, boxShadow:cardShadow }),
			renderContent(message)
		)
	)
}

var imageInsetShadow = 'inset 0 1px 1px rgba(0,0,0,.5), inset 0 -1px 2px 1px rgba(255,255,255,.25)'
function renderContent(message) {
	var payload = message.payload
	if (Messages.isText(message)) {
		return div(style(unitPadding(0, 1, 1/2)), html(DogoText.getHtml(payload.body)))
	} else if (Messages.isPicture(message)) {
		var url = BT.url('BTImage.fetchImage', message.preview
			? { document:message.preview.document }
			: { url:Payloads.url(message), cache:true }
		)
		var messageWidth = viewport.width() - unit*2
		var displaySize = [Math.min(messageWidth, payload.width), Math.min(messageWidth, payload.height)]
		return div(style(unitPadding(0,0,1/2)),
			div(style(
				graphics.backgroundImage(url, displaySize[0], displaySize[1], { background:'#eee' }),
				{ width:displaySize[0], height:displaySize[1], boxShadow:imageInsetShadow, margin:'0 auto' }
			))
		)
	} else if (Messages.isAudio(message)) {
		var url = message.preview
			? BT.url('BTFiles.getDocument', { document:message.preview.document, mimeType:Payloads.mimeTypes[message.type] })
			: Payloads.url(message)
		return div(null, 'Voice message: ', round(payload.duration, 1), 's', audio({ src:url, controls:true }))
	} else {
		return 'Cannot display message. Please upgrade Dogo!'
	}
}
