// Also see https://gist.github.com/pguillory/729616
var output = require('fs').createWriteStream('output-'+process.pid+'.log', { flags:'w' })
process.stdout.write = process.stderr.write = function(data, encoding) {
	output.write(data)
}

require('server/globals')

var log = makeLog('Run')

startup()

function startup() {
	var config = getConfig()
	if (config.debug) {
		log.debug('running in debug mode')
		runServer(config)
		return
	}
	
	var cluster = require('cluster')
	if (cluster.isMaster) {
		runMaster(config, cluster)
	} else {
		runServer(config)
	}
}

function getConfig() {
	var argv = require('optimist').argv
	if (!argv.config) { argv.config = 'dev' }
	
	var configFiles = {
		dev:'config/devConfig',
		prod:'config/prodConfig',
		test:'config/testConfig'
	}
	var config = require('./'+configFiles[argv.config])
	for (var key in config) {
		if (argv[key] == null) { continue }
		config[key] = (argv[key] == 'false' ? false : argv[key])
	}
	if (argv.config == 'dev' || argv.config == 'test') { config.dev = true }
	if (argv.debug) { config.debug = true }
	return config
}

function runMaster(config, cluster) {
	var clip = require('std/clip')
	var maxForks = config.dev ? 2 : 8
	var numForks = clip(require('os').cpus().length, 1, maxForks)
	
	var lastSendTime
	var onBadDeath = function(exitCode) {
		if (lastSendTime && (new Date().getTime() - lastSendTime < 60000)) { return }
		lastSendTime = new Date().getTime()
		log.alert('Worker died with bad exit code: '+exitCode, 'Count: '+count)
	}
	
	require('server/fn/sendSms').configure(config.twilio) // log.alert depends on sendSms
	
	for (var i = 0; i < numForks; i++) {
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
	log.info('starting', process.pid)
	require('server/configureServer')(config)
}
