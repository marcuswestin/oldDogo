var log = module.exports = {
	makeLog:makeLog,
	doLog:doLog
}

function makeLog(name) {
	return _.extend(function logInfo() { log.doLog(name, 'info', arguments) },
		{
			warn: function logWarn() { log.doLog(name, 'warn', arguments) },
			error: function logError() { log.doLog(name, 'error', arguments) }
		}
	)
}

function doLog(name, level, args) {
	console.log(name, level, ':', Array.prototype.join.call(args, ', '))
}
