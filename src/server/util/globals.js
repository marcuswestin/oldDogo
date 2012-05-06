proto = require('std/proto')
create = require('std/create')
each = require('std/each')
map = require('std/map')
bind = require('std/bind')
slice = require('std/slice')

ListPromise = require('std/ListPromise')
txCallback = require('./txCallback')

getId = function(model) {
	return typeof model == 'number' ? model : model.id
}

logErr = function(err, callback /* , args ... */) {
	var args = slice(arguments, 2)
	console.error('Error:', err.stack || err.message || err, args)
	if (typeof callback == 'function') {
		callback(err, null)
	} else {
		console.error("SHIT SHIT SHIT, logErr callback stack hanging!!!")
	}
}
