var isArray = require('std/isArray')

var makeEncoder = module.exports = function makeEncoder(fields) {
	return {
		encode: doMakeEncoder(fields),
		decode: doMakeEncoder(reverseFields(fields))
	}
}
makeEncoder.reverseFields = reverseFields

function doMakeEncoder(allFields) {
	return function encode(data) {
		return doEncode(data, allFields)
	}

	function doEncode(data, fields) {
		var result = {}
		for (var key in fields) {
			var encoding = fields[key]
			if (isArray(encoding)) {
				result[encoding[0]] = map(data[key], function(datum) {
					return doEncode(datum, encoding[1])
				})
			} else {
				result[encoding] = data[key]
			}
		}
		return result
	}
}

function reverseFields(allFields) {
	return doReverse(allFields)

	function doReverse(fields) {
		var reversed = {}
		for (var key in fields) {
			var encoding = fields[key]
			if (isArray(encoding)) {
				reversed[encoding[0]] = [key, doReverse(encoding[1])]
			} else {
				reversed[encoding] = key
			}
		}
		return reversed
	}
}

// e.g.
// makeEncoder({
// 	'people':['p', {
// 		'name':'n',
// 		'facebookId':'f'
// 	}],
// 	'pictures': ['P', {
// 		'secret':'s',
// 		'width':'w',
// 		'height':'h'
// 	}]
// })
