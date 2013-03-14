module.exports = function markFirstCall(fn) {
	var firstCall = true
	return function() {
		var res = fn.apply(this, [firstCall].concat(slice(arguments, 0)))
		firstCall = false
		return res
	}
}