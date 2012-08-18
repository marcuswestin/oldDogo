module.exports = {
	run:run
}

function run(config) {
	require('./util/globals')

	var Database = require('./Database'),
		AccountService = require('./AccountService'),
		SessionService = require('./SessionService'),
		PictureService = require('./PictureService'),
		MessageService = require('./MessageService'),
		PushService = require('./PushService')
	
	var makeRouter = require('./makeRouter')

	var devConfig = require('./config/dev'),
		prodConfig = require('./config/prod')
	
	var database = new Database(config.db),
		accountService = new AccountService(database),
		pushService = new PushService(database, devConfig.push, prodConfig.push),
		sessionService = new SessionService(database, accountService),
		pictureService = new PictureService(database, config.s3),
		messageService = new MessageService(database, accountService, pushService, pictureService)

	var router = makeRouter(accountService, messageService, sessionService, pictureService, { log:config.log, dev:config.dev })

	config.db.password = config.db.password.replace(/[^\*]/g, '*')
	config.push.keyData = '******'
	config.push.certData = '******'
	console.log('starting server with config', config)
	router.listen(config.port)
}
