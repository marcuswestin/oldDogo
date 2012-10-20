module.exports = {
	run:run
}

function run(config) {
	var Database = require('./Database')
	var AccountService = require('./AccountService')
	var SessionService = require('./SessionService')
	var PictureService = require('./PictureService')
	var MessageService = require('./MessageService')
	var PushService = require('./PushService')
	var makeRouter = require('./makeRouter')
	var devConfig = require('./config/dev')
	var prodConfig = require('./config/prod')
	
	var database = new Database(config.db)
	var accountService = new AccountService(database)
	var pushService = new PushService(database, devConfig.push, prodConfig.push)
	var sessionService = new SessionService(database, accountService)
	var pictureService = new PictureService(database, config.s3)
	var messageService = new MessageService(database, accountService, pushService, pictureService)

	var router = makeRouter(database, accountService, messageService, sessionService, pictureService, { log:config.log, dev:config.dev })

	config.db.password = config.db.password.replace(/[^\*]/g, '*')
	config.push.keyData = '******'
	config.push.certData = '******'
	log('starting server with config', config)
	router.listen(config.port)
}
