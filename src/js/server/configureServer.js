module.exports = function configureServer(config) {
	gConfig = config
	
	var makeRouter = require('server/makeRouter')
	var sendEmail = require('server/fn/sendEmail')
	var sendSms = require('server/fn/sendSms')
	
	if (config.dev) {
		require('server/util/log').enableDebugLoggin()
	}
	
	db.configure(config.dbShards)
	payloadService.configure(config.aws)
	sendEmail.configure(config.aws)
	sendSms.configure(config.twilio)
	
	var router = makeRouter({ log:config.log, dev:config.dev })
	router.listen(config.port)
}

