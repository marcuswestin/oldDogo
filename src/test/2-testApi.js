require('./1-testSetup')
var url = require('std/url')

setup('Ping', function() {
	then('ping it', function(done) {
		api.post('api/ping', done)
	})
})
