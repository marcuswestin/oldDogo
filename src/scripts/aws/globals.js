secrets = require('server/config/secrets').prod()
ec2 = require('aws2js').load('ec2', secrets.aws.accessKeyId, secrets.aws.accessKeySecret)
elb = require('aws2js').load('elb', secrets.aws.accessKeyId, secrets.aws.accessKeySecret)
each = require('std/each')
asyncEach = require('std/asyncEach')
map = require('std/map')
isArray = require('std/isArray')
find = require('std/find')
filter = require('std/filter')

log = console.log
// log = function(){} // ignore logging

check = function(err) {
	if (!err) { return }
	if (err.document) {
		each(err.document.Errors, function(Error) { console.log("AWS Error", Error) })
		if (err.document.Error) {
			console.log("AWS Error", err.document.Error)
		}
	} else {
		console.log("Error", err)
	}
	throw err
}

setItems = function(set) {
	// STUPID!!!
	var set = set.item || set.member
	return isArray(set) ? set : [set]
}

