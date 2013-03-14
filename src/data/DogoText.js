var Colors = require('./Colors')
module.exports = {
	fromNode:fromNode,
	getHtml:getHtml,
	getPlainText:getPlainText,
	getTextColors:getTextColors
}

var L_BRACKET = '[', R_BRACKET = ']'
var L_ARROW = '<', R_ARROW = '>'
var BRACKET_ESCAPES = { '[':'[[]', ']':'[]]' }
var BRACKET_REGEX = /[\[\]]/g

/* Parse DOM -> dogo text
 ************************/
var tagNameStyles = { I:'i', U:'u', B:'b' }
function fromNode(node) {
	if (_isTextNode(node)) {
		return node.textContent.replace(BRACKET_REGEX, function(match) { return BRACKET_ESCAPES[match] })
	}
	var content = filter(map(node.childNodes, fromNode)).join('')
	
	if (tagNameStyles[node.tagName]) {
		return '[s '+tagNameStyles[node.tagName]+' '+content+']'
	} else if (node.tagName == 'FONT') {
		return '[c '+getIndexForColor(node.color)+' '+content+']'
	} else if (node.tagName == 'BR') {
		return '\n'
	} else if (node.tagName == 'DIV') {
		return '\n' + content
	} else {
		return content
	}
}

function _isTextNode(node) { return node.nodeType == 3 }

/* Parse dogo text -> HTML
 *************************/
function getPlainText(text) {
	if (!text) { return '' }
	var chars = text.split('')
	var i = 0
	return proceed()
	function proceed() {
		if (!chars[i]) { return '' }
		if (chars[i] == L_BRACKET) {
			if (chars[i+1] == L_BRACKET) { i += 3; return L_BRACKET + proceed() }
			if (chars[i+1] == R_BRACKET) { i += 3; return R_BRACKET + proceed() }
			i += 3
			nextWord()
			return proceed()
		} else if (chars[i] == R_BRACKET) {
			i++
			return proceed()
		} else {
			return chars[i++] + proceed()
		}
	}
	
	function nextWord() {
		var word = ''
		while (chars[i] && chars[i] != ' ') { word += chars[i++] }
		i += 1 // following space
		return word
	}
}

function getHtml(text) {
	if (!text) { return '' }
	var chars = text.split('')
	var i = 0
	var stack = []
	return proceed()
	function proceed() {
		if (!chars[i]) { return '' }
		if (chars[i] == L_BRACKET) {
			// "{{}" == "{" and "{}}" == "}"
			if (chars[i+1] == L_BRACKET) { i += 3; return L_BRACKET + proceed() }
			if (chars[i+1] == R_BRACKET) { i += 3; return R_BRACKET + proceed() }
			// {s u content ... } for style underlined content
			var command = chars[i += 1]
			if (command == 's') {
				var style = chars[i += 2]
				i += 2 // whitespace
				stack.push(style)
				return '<'+style+'>'+proceed()
			} else if (command == 'c') {
				i += 2
				var colorIndex = nextWord()
				stack.push('font')
				return '<font color="'+getColorForIndex(colorIndex)+'">'+proceed()
			}
		} else if (chars[i] == R_BRACKET) {
			i += 1
			return '</'+stack.pop()+'>'+proceed()
		} else if (chars[i] == L_ARROW) {
			i += 1
			return '&lt;'+proceed()
		} else if (chars[i] == R_ARROW) {
			i += 1
			return '&gt;'+proceed()
		} else if (chars[i] == '\n') {
			i += 1
			return '<br/>'+proceed()
		} else {
			return chars[i++] + proceed()
		}
	}
	
	function nextWord() {
		var word = ''
		while (chars[i] && chars[i] != ' ') { word += chars[i++] }
		i += 1 // following space
		return word
	}
}
// getHtml('hello, h[s i o[[]w ar[]]e you< t[s b here ]][s b my d]ear?')
// getHtml(fromNode($0))

/* Util
 ******/
function getTextColors() {
	return _getColors()
}

function getIndexForColor(hexColor) {
	return _getColors().inverse[hexColor]
}
function getColorForIndex(colorIndex) {
	return _getColors()[colorIndex]
}

function _getColors() {
	if (!_getColors.colors) {
		_getColors.colors = map([Colors.blues[0], Colors.teals[0], Colors.greens[0], Colors.yellows[0], Colors.oranges[0], Colors.reds[0], Colors.purples[0]], function(rgb) {
			return Colors.rgbToHex(rgb)
		})
		_getColors.colors.inverse = inverse(_getColors.colors)
	}
	return _getColors.colors
}
