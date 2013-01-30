var log = module.exports = {
	makeLog:makeLog,
	doLog:doLog,
	enableDebugLoggin:enableDebugLoggin
}

var logDebug = false
var padLength = 18
function makeLog(name) {
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
				require('server/sms').alertAdmin(('ALERT! '+message).substr(0, 160))
			}
		}
	)
}

function enableDebugLoggin() {
	logDebug = true
}

function doLog(pad, name, level, text) {
	console.log(level+' '+getTime()+' '+name+pad, text)
}

function getTime() {
	var d = new Date()
	// return d.getFullYear()+'/'+d.getMonth()+'/'+d.getDate()+'-'+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()
	return d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()
}

function getArgsString(args) {
	return Array.prototype.join.call(map(args, _getArgString), ' | ')
}

function _getArgString(arg) {
	if (arg == null) { return arg }
	if (typeof arg == 'string' || typeof arg == 'number') { return arg }
	if (arg.stack) { return arg.stack }
	return JSON.stringify(arg)
}
