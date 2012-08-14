require('lib/jquery-1.7.2')
require('tags')
require('tags/button')
require('tags/list')
require('tags/style')
require('tags/scroller')
require('tags/util')
require('tags/viewport')

div = tags.createTag('div')
br = tags.createTag('br')
a = tags.createTag('a')
input = tags.createTag('input')
img = tags.createTag('img')
canvas = tags.createTag('canvas')
viewport = tags.viewport
button = tags.button
list = tags.list
style = tags.style
transition = style.transition

require('./events')
require('./state')

options = require('std/options')
create = require('std/create')
proto = require('std/proto')
map = require('std/map')
api = require('./api')
bridge = require('./bridge')
face = require('ui/face')
bind = require('std/bind')
each = require('std/each')
slice = require('std/slice')
curry = require('std/curry')
filter = require('std/filter')
flatten = require('std/flatten')
paint = require('./ui/paint')

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
	loading.$ui.css({ '-webkit-transform':'translateY('+(y-2)+'px)' })
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
	var result = create(eventEmitter.proto, params)
	Object.defineProperty(result, '_listeners', { value:{}, writable:false, enumerable:false, configurable:false })
	return result
}
eventEmitter.proto = {
	on: function on(signal, callback) {
		if (!this._listeners[signal]) {
			this._listeners[signal] = []
		}
		this._listeners[signal].push(callback)
	},
	fire: function fire(signal, args) {
		each(this._listeners[signal], this, function(callback) {
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
