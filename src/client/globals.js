require('lib/jquery-1.7.2')
require('tags')
require('tags/button')
require('tags/list')
require('tags/style')
require('tags/scroller')

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
viewport = require('tags/viewport')
each = require('std/each')
slice = require('std/slice')
curry = require('std/curry')
draw = require('./ui/draw')
button = tags.button
list = tags.list
style = tags.style
tags.expose()

loading = function loading(isLoading) {
	if (!loading.$ui) {
		loading.$ui = $(div('loading-wrapper', div('icon'))).appendTo('.app')
	}
	
	if (isLoading) {
		if (loading.timer) { return }
		loading.timer = setTimeout(function(){ loading.$ui.css({ top:gHeadHeight }) }, 100)
	} else {
		clearTimeout(loading.timer)
		loading.timer = null
		return loading.$ui.css({ top:0 })
	}
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
	
	var cache = gState.cache[cacheKey]
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