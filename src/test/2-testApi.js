require('./1-testSetup')
var url = require('std/url')
var exec = require('child_process').exec
var fs = require('fs')

setup('Ping', function() {
	then('ping it', function(done) {
		api.post('api/ping', done)
	})
})

setup('Email registration', function() {
	var userInfo = { name:'Joe Doe', color:1, password:'foobarcat', address:Addresses.email('foo@dogo.co') }
	var devVerificationUrl = null
	var picPath = null
	
	then('create image', function(done) {
		picPath = '/tmp/dogoTestPic-'+new Date().getTime()+'.jpg'
		exec('convert -size 300x300 xc: +noise Random '+picPath, function(err, stderr, stdout) {
			check(err || stderr)
			done()
		})
	})
	then('request verification', function(done) {
		var picData = fs.readFileSync(picPath)
		api.jsonMultipart('api/address/verification', userInfo, { picture:picData }, function(err, res) {
			check(err)
			is(devVerificationUrl = res.devVerificationUrl)
			done()
		})
	})
	then('verify address', function(done) {
		params = url(devVerificationUrl).getSearchParams()
		api.post('api/register/withAddressVerification', { password:userInfo.password, verificationToken:params.t, verificationId:params.i }, function(err, res) {
			check(err)
			done()
		})
	})
	// then('login', function(done) {
	// 	
	// })
})
