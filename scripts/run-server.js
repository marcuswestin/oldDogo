require('../src/globals')

var Database = require('../src/server/Database'),
	AccountService = require('../src/server/AccountService'),
	SessionService = require('../src/server/SessionService'),
	MessageService = require('../src/server/MessageService'),
	Router = require('../src/server/Router')

var argv = require('fun/node_modules/optimist').argv,
	merge = require('fun/node_modules/std/merge')

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
