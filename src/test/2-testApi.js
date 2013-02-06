require('./1-testSetup')
var url = require('std/url')

setup('Ping', function() {
	then('ping it', function(done) {
		api.post('api/ping', done)
	})
})

setup('Email registration', function() {
	var userInfo = { name:'Joe Doe', color:1, password:'foobarcat', address:Addresses.email('foo@dogo.co') }
	var devVerificationUrl
	then('request verification', function(done) {
		api.post('api/address/verification', userInfo, function(err, res) {
			check(err)
			is(devVerificationUrl = res.devVerificationUrl)
			done()
		})
	})
	then('verify address', function(done) {
		params = url(devVerificationUrl).getSearchParams()
		api.post('api/register/withAddressVerification', { password:userInfo.password, verificationToken:params.t, verificationId:params.i }, function(err, res) {
			check(err)
			console.log("HERE", res)
			done()
		})
	})
	// then('login', function(done) {
	// 	
	// })
})
