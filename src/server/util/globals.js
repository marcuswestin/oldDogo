proto = require('std/proto')
create = require('std/create')
each = require('std/each')
map = require('std/map')
bind = require('std/bind')
slice = require('std/slice')
options = require('std/options')
_ = require('underscore')

ListPromise = require('std/ListPromise')

nop = noop = function() { return this }

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

serialMap = function serialMap(items, opts) {
	var i = 0
	var result = []
	var iterate = opts.iterate
	var finish = opts.finish
	var ctx = opts.context
	var filterNulls = opts.filterNulls || false
	// the given iterator may expect arguments (item + i + next), or just (item + i)
	var callIterator = (iterate.length == 3 ? iterate : function(item, i, next) { iterate.call(this, item, next) })
	function next() {
		if (i == items.length) { return finish.call(ctx, null, result) }
		var iterationI = i
		process.nextTick(function() {
			callIterator.call(ctx, items[iterationI], iterationI, iteratorCallback)
		})
		i += 1
	}
	function iteratorCallback(err, iterationResult) {
		if (err) { return finish.call(ctx, err, null) }
		if (iterationResult != null || !filterNulls) {
			result.push(iterationResult)
		}
		next()
	}
	next()
}
