require('./globals')
var getInstanceInfos = require('./getInstanceInfos')

var numInstances = 2
log("Launch", numInstances, 'DogoWeb instances')
runInstances(numInstances, function(reservationId, instanceIds) {
	waitForPublicDns(reservationId, instanceIds, function(instanceInfos) {
		var instanceIds = map(instanceInfos, function(instanceInfo) { return instanceInfo.instanceId })
		var hostnames = map(instanceInfos, function(instanceInfo) { return instanceInfo.hostname })
		console.log('Instances:', instanceIds.join(','))
		console.log('Hostnames:', hostnames.join(','))
		process.exit(0)
	})
})

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
			console.log("GOT", instanceInfos, filter(instanceInfos, function(instanceInfo) { return instanceInfo.hostname }))
			var instancesWithHostname = filter(instanceInfos, function(instanceInfo) { return instanceInfo.hostname })
			log("Instances with public DNS:", instancesWithHostname.length, 'out of', instanceIds.length)
			if (instancesWithHostname.length == instanceIds.length) {
				callback(instanceInfos)
			} else {
				log('Waiting to check again...')
				setTimeout(_checkAddresses, 6000)
			}
		})
	}
}
