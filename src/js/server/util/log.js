var sendSms = require('server/fn/sendSms')

var log = module.exports = makeLog('Global')
log.disable = disable
log.makeLog = makeLog
log.enableDebugLoggin = enableDebugLoggin

var disabled = false
function disable() { disabled = true }

var logDebug = false
function enableDebugLoggin() { logDebug = true }

function makeLog(name) {
	var padLength = 20
	var pad = new Array(padLength-name.length).join(' ')+'-'+' '
	
	function logInfo() { doLog(pad, name, 'info'.blue, getArgsString(arguments)) }
	
	return _.extend(logInfo, {
		info: logInfo,
		debug: function logDebug() { logDebug && doLog(pad, name, 'dbug'.cyan, getArgsString(arguments).cyan) },
		warn: function logWarn() { doLog(pad, name, 'WARN'.pink, getArgsString(arguments), true) },
		error: function logError() { doLog(pad, name, 'ERRO'.red, getArgsString(arguments), true) },
		alert: function alert() {
			var message = getArgsString(arguments)
			doLog(pad, name.red, 'ALRT'.red, message.red, true)
			sendSms.alertAdmin(('ALERT! '+message).substr(0, 160))
		}
	})
}

function n(number) { return number < 10 ? '0'+number : number }
function doLog(pad, name, level, text, force) {
	if (disabled && !force) { return }
	var d = new Date()
	var time = n(d.getDate())+'/'+n(d.getMonth()+1)+'/'+n(d.getFullYear())+' '+n(d.getHours())+':'+n(d.getMinutes())+':'+n(d.getSeconds())
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
