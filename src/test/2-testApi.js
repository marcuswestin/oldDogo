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
	var testPerson = { name:'Joe Doe', color:1, password:'foobarcat', address:Addresses.email('foo@dogo.co') }
	var devVerificationUrl = null
	var picPath = null
	
	then('create image', function(done) {
		picPath = '/tmp/dogoTestPic-'+new Date().getTime()+'.jpg'
		// http://brunogirin.blogspot.com/2009/09/making-noise-with-imagemagick.html
		exec('convert -size 300x300 xc: +noise Random '+picPath, function(err, stderr, stdout) {
			check(err || stderr)
			done()
		})
	})
	then('request verification', function(done) {
		var picData = fs.readFileSync(picPath)
		api.jsonMultipart('api/address/verification', testPerson, { picture:picData }, function(err, res) {
			check(err)
			is(devVerificationUrl = res.devVerificationUrl)
			done()
		})
	})
	then('register with verification', function(done) {
		var verParams = url(devVerificationUrl).getSearchParams()
		api.post('api/register/withAddressVerification', { password:testPerson.password, verificationToken:verParams.t, verificationId:verParams.i }, function(err, res) {
			check(err)
			has(res.person, { name:testPerson.name, color:testPerson.color })
			done()
		})
	})
	then('login', function(done) {
		api.post('api/session', { address:testPerson.address, password:testPerson.password }, function(err, sessionInfo) {
			check(err)
			has(sessionInfo.person, { name:testPerson.name, color:testPerson.color })
			is(sessionInfo.authToken)
			is(sessionInfo.clientUidBlock)
			is(sessionInfo.config)
			done()
		})
	})
})
