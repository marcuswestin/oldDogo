require('./globals')
var getInstanceHostnames = require('./getInstanceHostnames')

var instanceIds = process.argv.slice(2)

getInstanceInfos(instanceIds, function(err, instanceInfos) {
	var params = { 'LoadBalancerName':'DogoCoSsl' }
	each(instanceInfos, function(instanceInfo, i) {
		params['Instances.member.'+i] = instanceInfo.instanceId
	})
	console.log("adding instances to DogoCoSsl Load Balancer:", instanceInfos)
	elb.request('RegisterInstancesWithLoadBalancer', params, function(err, res) {
		check(err)
		console.log("GOT", res)
		console.log("JSON", JSON.stringify(res))
	})
})
