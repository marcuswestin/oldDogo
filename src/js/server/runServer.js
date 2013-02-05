require('server/globals')

var cluster = require('cluster')
var log = makeLog('Run')

var config = getConfig()
if (cluster.isMaster) { runMaster(config) }
else { runServer(config) }

function getConfig() {
	var argv = require('optimist').argv
	if (!argv.config) { argv.config = 'dev' }
	
	var configFiles = {
		dev:'config/dev/devConfig',
		prod:'config/prod/prodConfig',
		test:'config/test/testConfig'
	}
	var config = require('./'+configFiles[argv.config])
	for (var key in config) {
		if (argv[key] == null) { continue }
		config[key] = (argv[key] == 'false' ? false : argv[key])
	}
	if (argv.config == 'dev') { config.dev = true }
	return config
}

function runMaster(config) {
	var numCPUs = Math.min(require('os').cpus().length - 1, 2)
	var minCpus = 1
	var maxCpus = config.dev ? 2 : 3
	if (numCPUs < minCpus) { numCPUs = minCpus }
	if (numCPUs > maxCpus) { numCPUs = maxCpus }
	
	var lastSendTime
	var onBadDeath = function(exitCode) {
		if (lastSendTime && (new Date().getTime() - lastSendTime < 60000)) { return }
		lastSendTime = new Date().getTime()
		log.alert('Worker died with bad exit code: '+exitCode, 'Count: '+count)
	}
	
	require('server/fn/sendSms').configure(config.twilio) // log.alert depends on sendSms
	
	for (var i = 0; i < numCPUs; i++) {
		cluster.fork()
	}
	var count = 0
	cluster.on('death', function(worker) {
		log(worker.pid, 'died')
		if (worker.exitCode) {
			onBadDeath(worker.exitCode)
			log.warn("bad worker exit code", worker.exitCode)
		}
		count++
		setTimeout(function() {
			log('forking again')
			cluster.fork()
		}, 1000)
	})
}

function runServer(config) {
	log('starting', process.pid)
	var payloadService = require('server/payloadService')
	var makeRouter = require('server/makeRouter')
	var sendEmail = require('server/fn/sendEmail')
	var sendSms = require('server/fn/sendSms')
	
	if (config.dev) {
		require('server/util/log').enableDebugLoggin()
	}
	
	db.configure(config.dbShards)
	payloadService.configure(config.s3)
	sendEmail.configure(config.s3)
	sendSms.configure(config.s3)
	
	var router = makeRouter({ log:config.log, dev:config.dev })
	router.listen(config.port)
}
