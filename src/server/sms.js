var request = require('request')

module.exports = {
	setConfig:setConfig,
	send:send
}

var url = null
var from = null
function setConfig(conf) {
	if (conf.disabled) { return }
	url = 'https://'+conf.accountSid+':'+conf.authToken+'@api.twilio.com/2010-04-01/Accounts/'+conf.accountSid+'/SMS/Messages.json'
	from = conf.from
}

function send(to, text, callback) {
	if (!url) {
		console.log("Ignoring send sms", to, text)
		return
	}
	var params = { From:from, To:to, Body:text }
	console.log("Sending SMS", to, text)
	request.post({ url:url, form:params }, function(err, res) {
		// if (err) { console.log("Error sending SMS", err) }
		// else { console.log("Sent SMS") }
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
// 	console.log("HERE", err, res)
// })