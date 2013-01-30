var request = require('request')

var sms = module.exports = {
	setConfig:setConfig,
	send:send,
	alertAdmin:alertAdmin
}

var url = null
var from = null
function setConfig(conf) {
	if (conf.disabled) { return }
	url = 'https://'+conf.accountSid+':'+conf.authToken+'@api.twilio.com/2010-04-01/Accounts/'+conf.accountSid+'/SMS/Messages.json'
	from = conf.from
}

function alertAdmin(text) {
	sms.send('+14156015654', text)
}

function send(to, text, callback) {
	if (!url) {
		return
	}
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