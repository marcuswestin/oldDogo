module.exports = {
	run:run
}

function run(config) {
	var database = require('./Database')
	var payloadService = require('./payloadService')
	var makeRouter = require('./makeRouter')
	
	if (config.dev) {
		require('server/util/log').enableDebugLoggin()
	}
	
	database.configure(config.dbShards)
	payloadService.configure(config.s3)
	
	var router = makeRouter({ log:config.log, dev:config.dev })
	router.listen(config.port)
}
