var getInstanceInfos = require('./getInstanceInfos')
log = function(){}

getInstanceInfos(null, function(err, instanceInfos) {
	check(err)
	console.log(filter(map(instanceInfos, function(info) { return info.hostname })).join(','))
})
