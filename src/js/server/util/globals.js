proto = require('std/proto')
create = require('std/create')
each = require('std/each')
map = require('std/map')
bind = require('std/bind')
slice = require('std/slice')
options = require('std/options')
_ = require('underscore')
filter = require('std/filter')
serialMap = require('std/serialMap')

ListPromise = require('std/ListPromise')

makeTimer = require('./makeTimer')
makeLog = require('./log').makeLog
log = makeLog('Global')

getId = function(model) {
	return typeof model == 'number' ? model : model.id
}

logError = logErr = function logError(err, callback /* , args ... */) {
	var args = slice(arguments, 2)
	log.error('Error:', args, err.stack || err.message || err)
	if (typeof callback == 'function') {
		callback(err, null)
	} else {
		log.error("SHIT SHIT SHIT, logErr callback stack hanging!!!")
	}
}

