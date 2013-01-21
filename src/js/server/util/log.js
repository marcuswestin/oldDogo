var log = module.exports = {
	makeLog:makeLog,
	doLog:doLog
}

var padLength = 18
function makeLog(name) {
	var pad = new Array(padLength-name.length).join(' ')+'-'+' '
	return _.extend(function logInfo() { log.doLog(pad, name, 'info'.blue, arguments) },
		{
			info: function logInfo() { log.doLog(pad, name, 'info'.blue, arguments) },
			warn: function logWarn() { log.doLog(pad, name, 'WARN'.pink, arguments) },
			error: function logError() { log.doLog(pad, name, 'EROR'.red, arguments) }
		}
	)
}

function doLog(pad, name, level, args) {
	console.log(level+' '+getTime()+' '+name+pad, Array.prototype.join.call(map(args, function(arg) {
		if (arg == null) { return arg }
		if (typeof arg == 'string' || typeof arg == 'number') { return arg }
		if (arg.stack) { return arg.stack }
		return JSON.stringify(arg)
	}), ' | '))
}

function getTime() {
	var d = new Date()
	// return d.getFullYear()+'/'+d.getMonth()+'/'+d.getDate()+'-'+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()
	return d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()
}
