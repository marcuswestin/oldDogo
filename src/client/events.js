var each = require('std/each')

// global
events = {
	on:on,
	fire:fire
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
