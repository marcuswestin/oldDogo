require('./globals')
var spawn = require('child_process').spawn
var getInstanceInfos = require('./getInstanceInfos')

var numInstances = 1
log("Launch", numInstances, 'DogoWeb instances')
runInstances(numInstances, function(reservationId, instanceIds) {
	waitForPublicDns(reservationId, instanceIds, function(instanceInfos) {
		var instanceIds = map(instanceInfos, function(instanceInfo) { return instanceInfo.instanceId })
		var hostnames = map(instanceInfos, function(instanceInfo) { return instanceInfo.hostname })
		console.log("Waiting 45 seconds to let public DNS become available - not sure why this is neccesary, but without it the next step fails");
		setTimeout(function() { _setupInstances(instanceIds, hostnames) }, 45000)
	})
})

function _setupInstances(instanceIds, hostnames) {
	console.log('_setupInstances('+JSON.stringify(instanceIds)+','+JSON.stringify(hostnames)+')')
	console.log('Instances:', instanceIds.join(','))
	console.log('Hostnames:', hostnames.join(','))
	run('fab', ['-P', 'setup_dogo_web:HEAD', '-H', hostnames.join(',')], function() {
		run('./node', ['src/scripts/aws/addHostsToElb.js', instanceIds.join(',')], function() {
			console.log("All done!")
		})
	})
}

function runInstances(numInstances, callback) {
	var runInstancesParams = {
		'ImageId': 'ami-a29943cb',
		'MinCount': numInstances,
		'MaxCount': numInstances,
		'InstanceType': 't1.micro',
		'KeyName': 'DogoWeb',
		'Placement.AvailabilityZone': 'us-east-1a',
		'DisableApiTermination': false,
		'ClientToken': 'dogo-'+new Date().getTime()+'-'+Math.random() // random token for request idempotency
	}
	each(new Array(runInstancesParams.MinCount), function(_, i) {
		runInstancesParams['SecurityGroup.'+i] = 'DogoWeb'
	})

	log("RunInstances", runInstancesParams)
	ec2.request('RunInstances', runInstancesParams, function(err, res) {
		check(err)
		log('RunInstances response:', JSON.stringify(res))
		callback(res.reservationId, map(setItems(res.instancesSet), function(instance) { return instance.instanceId }))
	})
}

function waitForPublicDns(reservationId, instanceIds, callback) {
	_checkAddresses()
	function _checkAddresses() {
		getInstanceInfos(instanceIds, function(err, instanceInfos) {
			check(err)
			var instancesWithHostname = filter(instanceInfos, function(instanceInfo) { return instanceInfo.hostname })
			log("Instances with public DNS:", instancesWithHostname.length, 'out of', instanceIds.length)
			if (instancesWithHostname.length == instanceIds.length) {
				callback(instanceInfos)
			} else {
				log('Waiting to check again...')
				setTimeout(_checkAddresses, 5000)
			}
		})
	}
}

function run(command, args, callback) {
	console.log("Run:", command, args.join(' '))
	var running = spawn(command, args)
	running.stdout.on('data', function(data) { process.stdout.write(data) })
	running.stderr.on('data', function(data) { process.stderr.write(data) })
	running.on('exit', function(exitCode) {
		if (exitCode) { throw command + ' exit code ' + exitCode}
		callback()
	})
}
