require('./util/globals')

var Database = require('./Database'),
	AccountService = require('./AccountService'),
	SessionService = require('./SessionService'),
	MessageService = require('./MessageService'),
	Router = require('./Router')

var argv = require('optimist').argv,
	merge = require('std/merge')

var opts = { log:true, dev:false, port:9090, dbPassword:'' }
for (var key in opts) {
	if (argv[key] == null) { continue }
	opts[key] = (argv[key] == 'false' ? false : argv[key])
}

var database = new Database('localhost', 'dogo', 'dogo_rw', opts.dbPassword),
	accountService = new AccountService(database),
	sessionService = new SessionService(accountService),
	messageService = new MessageService(database, accountService),
	router = new Router(accountService, messageService, sessionService, { log:opts.log, dev:opts.dev })

router.listen(opts.port)

console.log('started server with opts', opts)
