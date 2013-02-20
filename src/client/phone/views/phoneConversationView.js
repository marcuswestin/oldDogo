module.exports = {
	renderHead:renderHead,
	renderBody:renderBody,
	renderFoot:renderFoot
}

function renderHead(view) {
	return appHead(
		div(style(), 'left', button(function() { gScroller.pop() })),
		div(style(unitPadding(1)), view.conversation.people[0].name),
		div(style(), 'right', button(function() { console.log("Right") }))
	)
}

function renderBody(view) {
	return 'body'
}

function renderFoot(view) {
	
}