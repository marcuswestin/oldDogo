require('./globals')
var getInstanceInfos = require('./getInstanceInfos')

var instanceIds = process.argv.slice(2)

getInstanceInfos(instanceIds, function(err, instanceInfos) {
	var params = { 'LoadBalancerName':'DogoCoSsl' }
	each(instanceInfos, function(instanceInfo, i) {
		params['Instances.member.'+(i+1)+'.InstanceId'] = instanceInfo.instanceId
	})
	console.log("adding instances to DogoCoSsl Load Balancer:", params)
	elb.request('RegisterInstancesWithLoadBalancer', params, function(err, res) {
		check(err)
		console.log("Added instances", res)
		var instances = setItems(res.RegisterInstancesWithLoadBalancerResult.Instances)
		console.log("Instances:", instances)
	})
})
