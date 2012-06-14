var cluster = require('cluster')
var numCPUs = Math.min(require('os').cpus().length - 1, 2)

if (cluster.isMaster) {
	for (var i = 0; i < numCPUs; i++) {
		cluster.fork()
	}
	var count = 0
	cluster.on('death', function(worker) {
		console.log(worker.pid, 'died')
		if (worker.exitCode) {
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
	require('./server').run()
}
