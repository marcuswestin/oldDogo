var getInstanceInfos = require('./getInstanceInfos')
log = function(){}

getInstanceInfos(null, function(err, instanceInfos) {
	check(err)
	console.log(instanceInfos)
})
