module.exports = sendEmail
sendEmail.configure = configure

var ses
function configure(s3conf) {
	ses = require('aws2js').load('ses', s3conf.accessKeyId, s3conf.accessKeySecret)
}

function sendEmail(fromEmail, toEmail, subject, text, html, callback) {
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
	
	ses.request('SendEmail', args, callback)
}
