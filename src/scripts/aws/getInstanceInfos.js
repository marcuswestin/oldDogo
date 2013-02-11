module.exports = function getInstanceInfos(instanceIds, callback) {
	var describeInstancesParams = {}
	each(instanceIds, function(instanceIds, i) { describeInstancesParams['InstanceId.'+i] = instanceIds })
	log('DescribeInstances', describeInstancesParams)
	ec2.request('DescribeInstances', describeInstancesParams, function(err, res) {
		if (err) { return callback(err) }
		log('DescribeInstances response:', JSON.stringify(res))
		
		var reservation = find(setItems(res.reservationSet), function(reservation) { return reservation.reservationId == reservationId })
		var instanceInfos = map(setItems(reservation.instancesSet), function(instance) {
			var hostname = (instance.dnsName == 'string' ? instance.dnsName : null)
			return { instanceId:instance.instanceId, hostname:hostname }
		})
		callback(null, instanceInfos)
	})
}