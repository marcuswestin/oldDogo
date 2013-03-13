module.exports = {
	fromNode:fromNode,
	getHtml:getHtml,
	getTextColors:getTextColors
}
/* Parse DOM -> dogo text
 ************************/
var tagNameStyles = { I:'i', U:'u', B:'b' }
var L_CURLY = '{'
var R_CURLY = '}'
var CURLY_ESCAPES = { '{':'{{}', '}':'{}}' }
var CURLY_REGEX = /[\{\}]/g
function fromNode(node) {
	if (_isTextNode(node)) {
		return node.textContent.replace(CURLY_REGEX, function(match) { return CURLY_ESCAPES[match] })
	}
	var content = filter(map(node.childNodes, fromNode)).join('')
	
	if (tagNameStyles[node.tagName]) {
		return '{s '+tagNameStyles[node.tagName]+' '+content+'}'
	} else if (node.tagName == 'FONT') {
		return '{c '+getIndexForColor(node.color)+' '+content+'}'
	} else {
		return content
	}
}

function _isTextNode(node) { return node.nodeType == 3 }

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
			if (command == 's') {
				var style = chars[i += 2]
				i += 2 // whitespace
				stack.push(style)
				return '<'+style+'>'+proceed()
			} else if (command == 'c') {
				i += 2
				var colorIndex = nextWord()
				i += 1
				stack.push('font')
				return '<font color="'+getColorForIndex(colorIndex)+'">'+proceed()
			}
		} else if (chars[i] == R_CURLY) {
			i += 1
			return '</'+stack.pop()+'>'+proceed()
		} else if (chars[i] == L_ARROW) {
			i += 1
			return '&lt;'+proceed()
		} else if (chars[i] == R_ARROW) {
			i += 1
			return '&gt;'+proceed()
		} else {
			return chars[i++] + proceed()
		}
	}
	
	function nextWord() {
		var word = ''
		while (chars[i] && chars[i] != ' ') { word += chars[i++] }
		return word
	}
}
// getHtml('hello, h{s i o{{}w ar{}}e you< t{s b here }}{s b my d}ear?')
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
		_getColors.colors = map([blues[0], teals[0], greens[0], yellows[0], oranges[0], reds[0], purples[0]], function(rgb) {
			return colors.rgbToHex(rgb)
		})
		_getColors.colors.inverse = inverse(_getColors.colors)
	}
	return _getColors.colors
}
