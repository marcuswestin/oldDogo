var each = require('std/each')

// global
events = {
	on:on,
	fire:fire,
	once:once,
	off:off
}

var _handlers = {}

function fire(name) {
	var args = slice(arguments, 1)
	var handlers = _handlers[name]
	if (!handlers || !handlers.length) {
		return console.log("WARN", 'Got unknown event', name, JSON.stringify(args))
	}
	for (var i=0; i<handlers.length; i++) {
		handlers[i].apply(this, args)
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
	return this
}

function once(name, handler) {
	var fn
	on(name, fn=function() {
		off(name, fn)
		handler.apply(this, arguments)
	})
}

function off(name, handler) {
	var handlers = _handlers[name]
	for (var i=handlers.length-1; i>=0; i--) {
		if (handlers[i] != handler) { continue }
		handlers.splice(i, 1)
		break
	}
}
