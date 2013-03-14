var isArray = require('std/isArray')

var makeEncoder = module.exports = function makeEncoder(allFields) {
	var reversedFields = reverseFields(allFields)
	
	return {
		encode: encode,
		addTo: addTo,
		removeFrom: removeFrom,
		decode: decode
	}
	
	function encode(data) {
		return _add({}, data, allFields)
	}
	
	function decode(data) {
		return _add({}, data, reversedFields)
	}
	
	function addTo(result, data) {
		_add(result, data, allFields)
	}
	
	function removeFrom(result, field) {
		delete result[allFields[field]]
	}
	
	function _add(result, data, fields) {
		for (var key in fields) {
			var encoding = fields[key]
			if (isArray(encoding)) {
				result[encoding[0]] = map(data[key], function(datum) {
					return _add(result, datum, encoding[1])
				})
			} else if (data[key] != undefined) {
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
