var log = module.exports = {
	makeLog:makeLog,
	doLog:doLog
}

var padLength = 14
function makeLog(name) {
	var pad = new Array(padLength-name.length).join(' ')+'-'+' '
	return _.extend(function logInfo() { log.doLog(pad, name, 'info', arguments) },
		{
			warn: function logWarn() { log.doLog(pad, name, 'warn', arguments) },
			error: function logError() { log.doLog(pad, name, 'error', arguments) }
		}
	)
}

function doLog(pad, name, level, args) {
	console.log(level+' '+getTime()+' '+name+pad, Array.prototype.join.call(map(args, function(arg) {
		return (typeof arg == 'string' || typeof arg == 'number' ? arg : JSON.stringify(arg))
	}), ' | '))
}

function getTime() {
	var d = new Date()
	// return d.getFullYear()+'/'+d.getMonth()+'/'+d.getDate()+'-'+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()
	return d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()
}
