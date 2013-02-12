var log = makeLog('sendEmail')

module.exports = sendEmail
sendEmail.configure = configure

var ses
function configure(awsConf) {
	if (awsConf.ses.disable) { return disable() }
	ses = require('aws2js').load('ses', awsConf.accessKeyId, awsConf.accessKeySecret)
}

var disabled = false
function disable() {
	disabled = true
}

function sendEmail(fromEmail, toEmail, subject, text, html, callback) {
	log.debug('send email', fromEmail, toEmail, subject)
	if (disabled) { log.debug('(disabled - skipping send email)'); return callback(null, null) }
	
	var args = {
		'Message.Body.Text.Charset': 'UTF-8',
		'Message.Body.Text.Data': text,
		'Message.Body.Html.Charset': 'UTF-8',
		'Message.Body.Html.Data': html,
		'Message.Subject.Charset': 'UTF-8',
		'Message.Subject.Data': subject,
		'Source': fromEmail
	}
	
	each(isArray(toEmail) ? toEmail : [toEmail], function(email, index) {
		args['Destination.ToAddresses.member.'+(index+1)] = email
	})
	
	ses.request('SendEmail', args, function(err) {
		if (err) {
			each(err.document.Errors, function(Error) { console.log("AWS Error", Error) })
			if (err.document.Error) {
				console.log("AWS Error", err.document.Error)
			}
		}
		callback(err)
	})
}
