module.exports = {
	run:run
}

function run(config) {
	var database = require('./Database')
	var accountService = require('./AccountService')
	var sessionService = require('./SessionService')
	var pictureService = require('./PictureService')
	var messageService = require('./MessageService')
	var pushService = require('./PushService')
	var makeRouter = require('./makeRouter')
	
	database.configure(config.shards)
	pictureService.configure(config.s3)
	
	var router = makeRouter({ log:config.log, dev:config.dev })
	router.listen(config.port)
}
