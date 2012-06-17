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
		PushService = require('./PushService'),
		Router = require('./Router')

	var devConfig = require('./config/dev'),
		prodConfig = require('./config/prod')

	var database = new Database(config.dbHost, 'dogo', 'dogo_rw', config.dbPassword),
		accountService = new AccountService(database),
		pushService = new PushService(database, devConfig.push, prodConfig.push),
		sessionService = new SessionService(accountService),
		pictureService = new PictureService(database),
		messageService = new MessageService(database, accountService, pushService, pictureService),
		router = new Router(accountService, messageService, sessionService, pictureService, { log:config.log, dev:config.dev })

	config.dbPassword = config.dbPassword.replace(/[^\*]/g, '*')
	config.push.keyData = '******'
	config.push.certData = '******'
	console.log('starting server with config', config)
	router.listen(config.port)
}
