module.exports = {
	hasYesNoQuestion:hasYesNoQuestion,
	renderYesNoResponder:renderYesNoResponder
}

var yesNoForbidden = (function() {
	return new RegExp('when|why|how|who', 'i')
}())

var yesNoRequired = (function() {
	var pre = ['are', 'r', 'do', 'will', 'can']
	var mid = '\\W+'
	var post = ['u', 'you', 'we', 'they']
	return new RegExp('('+pre.join('|')+')'+mid+'('+post.join('|')+')', 'i')
}())


function hasYesNoQuestion(body) {
	return body && !body.match(yesNoForbidden) && !!body.match(yesNoRequired)
}


function renderYesNoResponder(handleResponse) {
	return div(div('yesNoResponder', face.mine(), function($el) {
		var respond = function(answer) {
			handleResponse(answer)
			$el.css({ overflow:'hidden' }).animate({ marginTop:0, marginBottom:0, height:0, duration:500 })
		}
		
		return [
			div('button yes', 'Yes', button(curry(respond, true))),
			div('button no', 'No', button(curry(respond, false)))
		]
	}), div('clear'))
}
