var log = module.exports = makeLog('Global')
log.disable = disable
log.makeLog = makeLog

var disabled = false
function disable() { disabled = true }

function makeLog(name) {
	var padLength = 20
	var pad = new Array(padLength-name.length).join(' ')+'-'+' '
	
	function logDebug() { doLog(pad, name, 'dbug'.cyan, getArgsString(arguments).cyan) }
	
	return _.extend(logDebug, {
		info: function logInfo() { doLog(pad, name, 'info'.blue, getArgsString(arguments)) },
		debug: logDebug,
		warn: function logWarn() { doLog(pad, name, 'WARN'.pink, getArgsString(arguments).pink, true) },
		error: function logError() { doLog(pad, name, 'ERRO'.red, getArgsString(arguments).red, true) },
		alert: function alert() {
			var message = getArgsString(arguments)
			doLog(pad, name.red, 'ALRT'.red, message.red, true)
			require('server/fn/sendSms').alertAdmin(('ALERT! '+message).substr(0, 160))
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
		if (arg.document) {
			if (arg.document.Error) { return 'AWS Error: '+JSON.stringify(arg.document.Error) }
			if (arg.document.Errors) { return 'AWS Errors: '+JSON.stringify(arg.document.Errors) }
		}
		return JSON.stringify(arg)
	}
}
