var sendSms = require('server/fn/sendSms')

var log = module.exports = {
	log:makeLog('Global'),
	disable:disable,
	makeLog:makeLog,
	enableDebugLoggin:enableDebugLoggin
}

var disabled = false
function disable() { disabled = true }

var logDebug = false
function enableDebugLoggin() { logDebug = true }

function makeLog(name) {
	var padLength = 18
	var pad = new Array(padLength-name.length).join(' ')+'-'+' '
	return _.extend(function logInfo() { logDebug && doLog(pad, name, 'info'.blue, getArgsString(arguments)) },
		{
			debug: function logDebug() { doLog(pad, name, 'debug'.cyan, getArgsString(arguments).cyan) },
			info: function logInfo() { doLog(pad, name, 'info'.blue, getArgsString(arguments)) },
			warn: function logWarn() { doLog(pad, name, 'WARN'.pink, getArgsString(arguments), true) },
			error: function logError() { doLog(pad, name, 'ERRO'.red, getArgsString(arguments), true) },
			alert: function alert() {
				var message = getArgsString(arguments)
				doLog(pad, name.red, 'ALRT'.red, message.red, true)
				sendSms.alertAdmin(('ALERT! '+message).substr(0, 160))
			}
		}
	)
}

function doLog(pad, name, level, text, force) {
	if (disabled && !force) { return }
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
