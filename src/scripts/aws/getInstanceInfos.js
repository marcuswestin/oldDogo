require('./globals')

module.exports = function getInstanceInfos(instanceIds, callback) {
	var describeInstancesParams = {}
	each(instanceIds, function(instanceIds, i) { describeInstancesParams['InstanceId.'+i] = instanceIds })
	log('DescribeInstances', describeInstancesParams)
	ec2.request('DescribeInstances', describeInstancesParams, function(err, res) {
		if (err) { return callback(err) }
		log('DescribeInstances response:', JSON.stringify(res))
		
		var reservations = setItems(res.reservationSet)
		// if (reservationId) {
		// 	reservations = [find(reservations, function(reservation) { return reservation.reservationId == reservationId })]
		// }
		
		var instanceInfos = []
		each(reservations, function(reservation) {
			each(setItems(reservation.instancesSet), function(instance) {
				var hostname = (typeof instance.dnsName == 'string' ? instance.dnsName : null)
				instanceInfos.push({ instanceId:instance.instanceId, hostname:hostname })
			})
		})
		callback(null, instanceInfos)
	})
}