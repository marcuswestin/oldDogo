var each = require('std/each')
var onlyCallOnce = require('std/once')

// global
module.exports = {
	on:on,
	fire:fire,
	once:once,
	off:off
}

var _handlers = {}

var offCallsDuringFire = {}
function fire(name) {
	offCallsDuringFire[name] = []
	var args = slice(arguments, 1)
	var handlers = _handlers[name]
	if (!handlers || !handlers.length) {
		return console.log("WARN", 'Got unknown event', name, JSON.stringify(args))
	}
	for (var i=0; i<handlers.length; i++) {
		handlers[i].apply(this, args)
	}
	if (offCallsDuringFire[name]) {
		var offCallsQueue = offCallsDuringFire[name]
		offCallsDuringFire[name] = null
		for (var i=0; i<offCallsQueue.length; i++) {
			off.apply(this, offCallsQueue[i])
		}
	}
	return this
}

function on(name, handler) {
	if ($.isArray(name)) {
		each(name, function(name) { on(name, handler) })
	} else {
		if (!_handlers[name]) { _handlers[name] = [] }
		_handlers[name].push(handler)
	}
	return handler
}

function once(name, handler) {
	var fn = on(name, function() {
		off(name, fn)
		handler.apply(this, arguments)
	})
}

function off(name, handler) {
	if (offCallsDuringFire[name]) {
		offCallsDuringFire[name].push(arguments)
		return
	}
	var handlers = _handlers[name]
	for (var i=handlers.length-1; i>=0; i--) {
		if (handlers[i] != handler) { continue }
		handlers.splice(i, 1)
		break
	}
}
