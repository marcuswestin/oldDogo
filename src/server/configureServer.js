module.exports = function configureServer(config) {
	gConfig = config
	
	var makeRouter = require('server/makeRouter')
	var sendEmail = require('server/fn/sendEmail')
	var sendSms = require('server/fn/sendSms')
	var pushService = require('server/PushService')
	var Payloads = require('data/Payloads')
	
	db.configure(config.dbShards)
	payloadService.configure(config.aws)
	Payloads.configure(config.aws.s3)
	sendEmail.configure(config.aws)
	sendSms.configure(config.twilio)
	pushService.configure(config.push)
	
	makeRouter({ log:config.log, dev:config.dev }).listen(config.port)
}

