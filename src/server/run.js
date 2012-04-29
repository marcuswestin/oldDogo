require('./util/globals')

var Database = require('./Database'),
	AccountService = require('./AccountService'),
	SessionService = require('./SessionService'),
	MessageService = require('./MessageService'),
	Router = require('./Router')

var argv = require('optimist').argv,
	merge = require('std/merge')

if (!argv.config) { argv.config = 'dev' }

var config = require('./config/'+argv.config)
for (var key in config) {
	if (argv[key] == null) { continue }
	config[key] = (argv[key] == 'false' ? false : argv[key])
}

var database = new Database(config.dbHost, 'dogo', 'dogo_rw', config.dbPassword),
	accountService = new AccountService(database),
	sessionService = new SessionService(accountService),
	messageService = new MessageService(database, accountService),
	router = new Router(accountService, messageService, sessionService, { log:config.log, dev:config.dev })

config.dbPassword = config.dbPassword.replace(/[^\*]/g, '*')
console.log('starting server with config', config)
router.listen(config.port)

