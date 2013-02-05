var sendSms = require('server/fn/sendSms')

var log = module.exports = {
	makeLog:makeLog,
	doLog:doLog,
	enableDebugLoggin:enableDebugLoggin
}

function enableDebugLoggin() { logDebug = true }
var logDebug = false

function makeLog(name) {
	var padLength = 18
	var pad = new Array(padLength-name.length).join(' ')+'-'+' '
	return _.extend(function logInfo() { logDebug && log.doLog(pad, name, 'info'.blue, getArgsString(arguments)) },
		{
			debug: function logDebug() { log.doLog(pad, name, 'debug'.cyan, getArgsString(arguments).cyan) },
			info: function logInfo() { log.doLog(pad, name, 'info'.blue, getArgsString(arguments)) },
			warn: function logWarn() { log.doLog(pad, name, 'WARN'.pink, getArgsString(arguments)) },
			error: function logError() { log.doLog(pad, name, 'ERRO'.red, getArgsString(arguments)) },
			alert: function alert() {
				var message = getArgsString(arguments)
				log.doLog(pad, name.red, 'ALRT'.red, message.red)
				sendSms.alertAdmin(('ALERT! '+message).substr(0, 160))
			}
		}
	)
}

function doLog(pad, name, level, text) {
	var d = new Date()
	var time = d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()
	console.log(level+' '+time+' '+name+pad, text)
}

function getArgsString(args) {
	return Array.prototype.join.call(map(args, _getArgString), ' | ')
	function _getArgString(arg) {
		if (arg == null) { return arg }
		if (typeof arg == 'string' || typeof arg == 'number') { return arg }
		if (arg.stack) { return arg.stack }
		return JSON.stringify(arg)
	}
}
