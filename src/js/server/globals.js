require('HandyHelpers/Array+Util')
require('node-color/color')

_ = require('underscore')

proto = require('std/proto')
create = require('std/create')
each = require('std/each')
map = require('std/map')
bind = require('std/bind')
slice = require('std/slice')
options = require('std/options')
filter = require('std/filter')
asyncMap = require('std/asyncMap')
asyncEach = require('std/asyncEach')
parallel = require('std/parallel')
curry = require('std/curry')
time = require('std/time')
trim = require('std/trim')

Addresses = require('data/Addresses')

makeTimer = require('server/util/makeTimer')
log = require('server/util/log')
makeLog = log.makeLog

db = require('server/db')

jsonList = function(jsonProperty) { return jsonProperty ? JSON.parse(jsonProperty) : [] }
remove = function(obj, prop) { var val = obj[prop]; delete obj[prop]; return val }

makeAlert = function() { return { args:arguments, alert:true } }
logError = logErr = function logError(err, callback /* , args ... */) {
	var args = slice(arguments, 2)
	log.error('Error:', args, err.stack || err.message || err)
	if (typeof callback == 'function') {
		callback(err, null)
	} else {
		log.error("SHIT SHIT SHIT, logErr callback stack hanging!!!")
	}
}
