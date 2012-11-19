require('lib/jquery-1.8.1')
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

getId = function getId(d) { return d.id }

accountKnown = function(accountId) { return !!gState.cache['contactsByAccountId'][accountId] }
loadFacebookId = function loadFacebookId(facebookId, callback) { return loadAccount(null, facebookId, callback) }
loadFacebookId.queue = {}
loadAccountId = function loadAccountId(accountId, callback) { return loadAccount(accountId, null, callback) }
loadAccountId.queue = {}
loadAccount = function loadAccount(accountId, facebookId, callback) {
	if (!accountId && !facebookId) { throw new Error("loadAccount: Undefined accountId") }
	if (accountId) {
		var cacheKey = 'contactsByAccountId'
		var queue = loadAccountId.queue
		var id = accountId
	} else {
		var cacheKey = 'contactsByFacebookId'
		var queue = loadFacebookId.queue
		var id = facebookId
	}
	
	var cache = gState.cache[cacheKey] || {}
	var account = cache[id]
	if (account) {
		callback && callback(account)
		return account
	} else if (queue[id]) {
		queue[id].push(callback)
	} else {
		queue[id] = [callback]
		api.get('account_info', { accountId:accountId, facebookId:facebookId }, function onApiGetAccountInfo(err, res) {
			if (err) { return error(err) }
			cache[id] = res.account
			gState.set(cacheKey, cache)
			each(queue[id], function(callback) { callback(res.account) })
			delete queue[id]
		})
	}
}

gHeadHeight = 45
gKeyboardHeight = 216

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
		return (this.dataClass == 'message' ? this.data.clientUid : this.data.id)
	}
}
eventEmitter.listeners = {}

unique = function() {
	return 'u'+(unique.current++)
}
unique.current = 1

link = function(className, title, path) {
	if (arguments.length == 2) {
		title = className
		path = title
		className = ''
	}
	if (typeof path == 'function') {
		return div('link '+className, title, button(path))
	} else {
		return a('link '+className, title, { href:(appInfo.config.serverUrl + path), target:'_blank' })
	}
}

image = (function() {
	var ratio = (window.devicePixelRatio || 1)
	var imagePostfix = (ratio == 2 ? '@2x' : '')
	function imageUrl(name) {
		return image.base + name + '@2x.png'
	}
	function backgroundUrl(name) {
		return 'url("'+imageUrl(name)+'")'
	}
	return {
		base: '/graphics/',
		url: imageUrl,
		backgroundUrl: backgroundUrl
	}
}())
