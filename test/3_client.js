var phantom = require('phantom')

console.log('creating phantom...')
phantom.create(function(client) {
	client.createPage(function(page) {
		var url = 'http://marcus.local:9000/app.html'
		console.log('opening', url, '...')
		page.open(url, function(status) {
			console.log("opened site?", status)
			client.exit()
			process.nextTick(function() { process.exit() })
		})
	})
})
