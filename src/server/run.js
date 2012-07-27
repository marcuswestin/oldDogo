var cluster = require('cluster')
var numCPUs = Math.min(require('os').cpus().length - 1, 2)

var sms = require('./sms')

var argv = require('optimist').argv

if (!argv.config) { argv.config = 'dev' }

var config = require('./config/'+argv.config)
for (var key in config) {
	if (argv[key] == null) { continue }
	config[key] = (argv[key] == 'false' ? false : argv[key])
}

var minCpus = 1
var maxCpus = argv.config == 'dev' ? 2 : 3

if (numCPUs < minCpus) { numCPUs = minCpus }
if (numCPUs > maxCpus) { numCPUs = maxCpus }

sms.setConfig(config.twilio)
var lastSendTime
var onBadDeath = function(exitCode) {
	if (lastSendTime && (new Date().getTime() - lastSendTime < 60000)) { return }
	lastSendTime = new Date().getTime()
	sms.send('+14156015654', "Worker died with bad exit code:"+exitCode+'. Count:'+count)
}

if (cluster.isMaster) {
	for (var i = 0; i < numCPUs; i++) {
		cluster.fork()
	}
	var count = 0
	cluster.on('death', function(worker) {
		console.log(worker.pid, 'died')
		if (worker.exitCode) {
			onBadDeath(worker.exitCode)
			console.log("WARNING bad worker exit code", worker.exitCode)
		}
		count++
		setTimeout(function() {
			console.log('forking again')
			cluster.fork()
		}, 1000)
	})
} else {
	console.log('starting', process.pid)
	require('./server').run(config)
}
