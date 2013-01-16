var trim = require('std/trim')

module.exports = {
	build:buildIndex,
	lookup:lookupInIndex
}

var indices = {}

function buildIndex(data) {
	var name = data.name
	var payloadToStrings = data.payloadToStrings
	var index = indices[name] = {}
	each(payloadToStrings, function(strings, payload) {
		each(strings, function(string) {
			string = string.toLowerCase()
			each(string.split(' '), function(part) {
				var firstChar = part[0]
				if (!index[firstChar]) { index[firstChar] = [] }
				index[firstChar].push({ string:part, payload:payload })
			})
		})
	})
}

function lookupInIndex(data, callback) {
	var name = data.name
	var searchString = trim(data.searchString).toLowerCase()
	if (!searchString) { callback(null, { matches:[] }) }
	var list = indices[name][searchString[0]]
	if (!list || !list.length) { return callback(null, { matches:[] }) }
	var matches = []
	var regexp = new RegExp('^'+searchString)
	for (var i=0; i<list.length; i++) {
		if (!list[i].string.match(regexp)) { continue }
		matches.push(list[i].payload)
	}
	callback(null, { matches:matches })
}
