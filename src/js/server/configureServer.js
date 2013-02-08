module.exports = function configureServer(config) {
	gConfig = config
	
	var makeRouter = require('server/makeRouter')
	var sendEmail = require('server/fn/sendEmail')
	var sendSms = require('server/fn/sendSms')
	var pushService = require('server/PushService')
	var payloads = require('data/payloads')
	
	if (config.dev) {
		require('server/util/log').enableDebugLoggin()
	}
	
	db.configure(config.dbShards)
	payloadService.configure(config.aws)
	payloads.configure(config.aws.s3)
	sendEmail.configure(config.aws)
	sendSms.configure(config.twilio)
	pushService.configure(config.push)
	
	var router = makeRouter({ log:config.log, dev:config.dev })
	router.listen(config.port)
}

