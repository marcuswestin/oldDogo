require('server/util/globals')
var cluster = require('cluster')
var numCPUs = Math.min(require('os').cpus().length - 1, 2)
var log = makeLog('Run')

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

var sms = require('server/sms')
sms.setConfig(config.twilio)

var minCpus = 1
var maxCpus = argv.config == 'dev' ? 2 : 3

if (numCPUs < minCpus) { numCPUs = minCpus }
if (numCPUs > maxCpus) { numCPUs = maxCpus }

var lastSendTime
var onBadDeath = function(exitCode) {
	if (lastSendTime && (new Date().getTime() - lastSendTime < 60000)) { return }
	lastSendTime = new Date().getTime()
	log.alert('Worker died with bad exit code: '+exitCode, 'Count: '+count)
}

if (cluster.isMaster) {
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
} else {
	log('starting', process.pid)
	require('./server').run(config)
}
