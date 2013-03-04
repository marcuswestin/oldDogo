module.exports = {
	fromNode:fromNode,
	getHtml:getHtml
}
/* Parse DOM -> dogo text
 ************************/
var tagNameStyles = { I:'i', U:'u', B:'b' }
var L_CURLY = '{'
var R_CURLY = '}'
var CURLY_ESCAPES = { '{':'{{}', '}':'{}}' }
var CURLY_REGEX = /[\{\}]/g
function fromNode(node) {
	if (isTextNode(node)) {
		return node.textContent.replace(CURLY_REGEX, function(match) { return CURLY_ESCAPES[match] })
	}
	var styles = tagNameStyles[node.tagName] || ''
	var content = filter(map(node.childNodes, fromNode)).join('')
	// console.log("QWE", content+'.')
	return styles ? '{s '+styles+' '+content+'}' : content
}
function isTextNode(node) {
	return node.nodeType == 3
}

/* Parse dogo text -> HTML
 *************************/
function getHtml(text) {
	if (!text) { return '' }
	var L_CURLY = '{', R_CURLY = '}'
	var L_ARROW = '<', R_ARROW = '>'
	var chars = text.split('')
	var i = 0
	var stack = []
	return proceed()
	function proceed() {
		if (!chars[i]) { return '' }
		if (chars[i] == L_CURLY) {
			// "{{}" == "{" and "{}}" == "}"
			if (chars[i+1] == L_CURLY) { i += 3; return L_CURLY + proceed() }
			if (chars[i+1] == R_CURLY) { i += 3; return R_CURLY + proceed() }
			// {s u content ... } for style underlined content
			var command = chars[i += 1]
			if (command != 's') { throw new Error("Unknown command "+command) }
			var style = chars[i += 2]
			i += 2 // whitespace
			stack.push(style)
			return '<'+style+'>'+proceed()
		} else if (chars[i] == R_CURLY) {
			i += 1
			return '</'+stack.pop()+'>'+proceed()
		} else if (chars[i] == L_ARROW) {
			i += 1
			return '&larr;'+proceed()
		} else if (chars[i] == R_ARROW) {
			i += 1
			return '&rarr;'+proceed()
		} else {
			return chars[i++] + proceed()
		}
	}
}
// getHtml('hello, h{s i o{{}w ar{}}e you< t{s b here }}{s b my d}ear?')
// getHtml(fromNode($0))
