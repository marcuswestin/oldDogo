// global
events = {
	on:on,
	fire:fire
}

var _handlers = {}

function fire(name, info) {
	var handlers = _handlers[name]
	if (!handlers || !handlers.length) {
		return alert('Got unknown event ' + name + ": " + JSON.stringify(info))
	}
	for (var i=0; i<handlers.length; i++) {
		handlers[i](info)
	}
	return this
}

function on(name, handler) {
	if (!_handlers[name]) { _handlers[name] = [] }
	_handlers[name].push(handler)
	return this
}
