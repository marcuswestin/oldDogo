var log = require('server/util/log').makeLog('sendSms')
var request = require('request')

module.exports = sendSms
sendSms.configure = configure
sendSms.alertAdmin = alertAdmin

var url = null
var from = null
function configure(twilioConf) {
	if (twilioConf.disable) { return disable() }
	url = 'https://'+twilioConf.accountSid+':'+twilioConf.authToken+'@api.twilio.com/2010-04-01/Accounts/'+twilioConf.accountSid+'/SMS/Messages.json'
	from = twilioConf.from
}

var disabled = false
function disable() { disabled = true }

function alertAdmin(text) {
	sendSms('+14156015654', text)
}

function sendSms(to, text, callback) {
	log.debug('send sms', to, text)
	if (disabled) { return log.debug('(disabled - skipping send sms)') }
	var params = { From:from, To:to, Body:text }
	request.post({ url:url, form:params }, function(err, res) {
		// if (err) { log.error("Error sending SMS", err) }
		// else { log("Sent SMS") }
		callback && callback(err, res)
	})
}

// var accountSid = 'ABC'
// var authToken = 'XYZ'
// var twilioSandbox = 'QWE'
// var yourPhone = 'ASD'
// var text = 'Test'
// 
// var url = 'https://'+accountSid+':'+authToken+'@api.twilio.com/2010-04-01/Accounts/'+accountSid+'/SMS/Messages.json'
// var params = { From: twilioSandbox, To: yourPhone, Body: text }
// request.post({ url:url, form:params }, function(err, res) {
// 	console.log("SENT SMS", err, res)
// })