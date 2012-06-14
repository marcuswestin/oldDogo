module.exports = {
	run:run
}

function run() {
	require('./util/globals')

	var Database = require('./Database'),
		AccountService = require('./AccountService'),
		SessionService = require('./SessionService'),
		PictureService = require('./PictureService'),
		MessageService = require('./MessageService'),
		PushService = require('./PushService'),
		Router = require('./Router')

	var argv = require('optimist').argv,
		merge = require('std/merge')

	if (!argv.config) { argv.config = 'dev' }

	var config = require('./config/'+argv.config)
	for (var key in config) {
		if (argv[key] == null) { continue }
		config[key] = (argv[key] == 'false' ? false : argv[key])
	}

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
