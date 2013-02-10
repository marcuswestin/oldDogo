require('lib/jquery-1.8.1')
require('HandyHelpers/Array+Util')

require('globals/environment')
require('globals/tags')
require('globals/brand')

events = require('./events')
gState = require('./state')

options = require('std/options')
create = require('std/create')
proto = require('std/proto')
map = require('std/map')
api = require('client/api')
bridge = require('client/bridge')
face = require('client/ui/face')
bind = require('std/bind')
each = require('std/each')
slice = require('std/slice')
curry = require('std/curry')
filter = require('std/filter')
flatten = require('std/flatten')
paint = require('client/ui/paint')
_ = require('underscore')
parseUrl = require('std/url')
clip = require('std/clip')
find = require('std/find')
trim = require('std/trim')
merge = require('std/merge')
nextTick = require('std/nextTick')
delayed = require('std/delayed')
parallel = require('std/parallel')
rand = require('std/rand')
sum = require('std/sum')
time = require('std/time')
colors = require('client/colors')

Addresses = require('data/Addresses')
payloads = require('data/payloads')

isArray = _.isArray

gHeadHeight = 0
gKeyboardHeight = 216

$.fn.size = function() { var $this = $(this); return { width:$this.width(), height:$this.height() } }

eventEmitter = function(dataClass, data) {
	var events = create(eventEmitter.proto, { dataClass:dataClass, data:data })
	Object.defineProperty(data, 'events', { value:events, writable:false, enumerable:false, configurable:false })
	return data
}
eventEmitter.proto = {
	on: function on(signal, callback) {
		var listenersClass = eventEmitter.listeners[this.dataClass]
		if (!listenersClass) {
			listenersClass = eventEmitter.listeners[this.dataClass] = {}
		}
		var signalListeners = listenersClass[signal]
		if (!signalListeners) {
			signalListeners = listenersClass[signal] = {}
		}
		var id = this._getDataId()
		var instanceListeners = signalListeners[id]
		if (!instanceListeners) {
			instanceListeners = signalListeners[id] = []
		}
		instanceListeners.push(callback)
	},
	fire: function fire(signal, info) {
		var listenersClass = eventEmitter.listeners[this.dataClass]
		if (!listenersClass) { return }
		var signalListeners = listenersClass[signal]
		if (!signalListeners) { return }
		var id = this._getDataId()
		var instanceListeners = signalListeners[id]
		each(instanceListeners, this, function(callback) {
			callback.call(this, info)
		})
	},
	_getDataId:function() {
		return (this.dataClass == 'message' ? this.data.clientUid : null)
	}
}
eventEmitter.listeners = {}

unique = function() {
	return 'u'+(unique.current++)
}
unique.current = 1

link = function(className, title, path) {
	if (arguments.length == 2) {
		path = title
		title = className
		className = ''
	}
	if (typeof path == 'function') {
		return div('link '+className, title, button(path))
	} else {
		return a('link '+className, title, { href:(gAppInfo.config.serverUrl + path), target:'_blank' })
	}
}

px = function(pixels) {
	if (!isArray(pixels)) { pixels = slice(arguments) }
	return map(pixels, function(arg) {
		return arg+'px'
	}).join(' ')
}

BT = {
	url:function(module, path, params) {
		return gAppInfo.config.serverUrl+'/'+module+'/'+path+'?'+parseUrl.query.string(params)
	}
}

error = function error(err) {
	overlay.hide()
	var margin = 0
	var cornerSize = 40
	var message = api.error(err)
	if (!error.$tag) {
		error.$tag = $(div({ id:'errorNotice' },
			style({ position:'absolute', top:20+margin, left:cornerSize+margin, width:viewport.width() - cornerSize*2 - margin*4 }),
			div('content',
				style({ maxHeight:240 }, scrollable.y),
				div('close', style({ 'float':'right' }), icon('icon-circlex', 22, 23), button(function() { error.hide() })),
				div('message')
			)
		)).appendTo('#viewport')
	}
	setTimeout(function() {
		error.$tag
			.css({ visibility:'hidden' })
			.find('.message').text(message)
		setTimeout(function() {
			error.$tag
				.css(translate.y(-(error.$tag.height() + 30), 0))
				.css({ visibility:'visible' })
			setTimeout(function() {
				error.$tag.css(translate.y(0, 400))
			})
		})
	})
	error.hide = function() {
		error.$tag.css(translate.y(-(error.$tag.height() + 30)))
	}
}
error.hide = function() {}
error.handler = function(err, res) {
	if (err) { error(err) }
}

gConfigure = function(config) {
	payloads.configure(config.payloads)
}
