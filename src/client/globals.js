require('lib/jquery-1.8.1')
require('globals/tags')

require('./events')
require('./state')

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

parseUrl = require('std/url')

loading = function loading(isLoading) {
	if (isLoading) {
		loading.count += 1
		if (loading.count > 1) { return }
		clearTimeout(loading.hideTimer)
		loading.hideTimer = null
		loading.showTimer = setTimeout(curry(loading.pos, gHeadHeight), 100)
	} else {
		loading.count -= 1
		if (loading.count) { return }
		clearTimeout(loading.showTimer)
		loading.showTimer = null
		loading.hideTimer = setTimeout(curry(loading.pos, 0), 100)
	}
}
loading.count = 0
loading.pos = function(y) {
	if (!loading.$ui) {
		loading.$ui = $(div('loading-wrapper', div('icon'))).appendTo('.dogoApp')
	}
	// loading.$ui.css(translate.y(y-2))
}

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

eventEmitter = function(params) {
	var events = create(eventEmitter.proto, { listeners:{} })
	Object.defineProperty(params, 'events', { value:events, writable:false, enumerable:false, configurable:false })
	return params
}
eventEmitter.proto = {
	on: function on(signal, callback) {
		if (!this.listeners[signal]) {
			this.listeners[signal] = []
		}
		this.listeners[signal].push(callback)
	},
	fire: function fire(signal, args) {
		each(this.listeners[signal], this, function(callback) {
			callback.call(this, args)
		})
	}
}

unique = function() {
	return 'u'+(unique.current++)
}
unique.current = 1

link = function(title, path) {
	if (typeof path == 'function') {
		return div('link', title, button(path))
	} else {
		return a('link', title, { href:(appInfo.config.serverUrl + path), target:'_blank' })
	}
}
