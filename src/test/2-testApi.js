require('./1-testSetup')
var url = require('std/url')
var exec = require('child_process').exec
var fs = require('fs')
var facebook = require('server/util/facebook')

setup('Ping', function() {
	then('ping it', function(done) {
		api.post('api/ping', done)
	})
})

setup('Email registration', function() {
	var testPerson = { name:'Joe Doe', color:1, password:'foobarcat', address:Addresses.email('test@dogo.co') }
	var devVerifyLink = null
	var picPath = null
	
	then('upload picture', function(done) {
		picPath = '/tmp/dogoTestPic-'+new Date().getTime()+'.jpg'
		// http://brunogirin.blogspot.com/2009/09/making-noise-with-imagemagick.html
		var size = 640
		exec('convert -size '+size+'x'+size+' xc: +noise Random '+picPath, function(err, stderr, stdout) {
			check(err || stderr)
			var picData = fs.readFileSync(picPath)
			api.jsonMultipart('api/address/verification/picture', { width:size, height:size }, { picture:picData }, function(err, res) {
				check(err)
				is(testPerson.pictureSecret = res.pictureSecret)
				done()
			})
		})
	})
	then('request verification', function(done) {
		api.post('api/address/verification', testPerson, function(err, res) {
			check(err)
			is(devVerifyLink = res.devVerifyLink)
			done()
		})
	})
	then('register with verification', function(done) {
		var verParams = url(devVerifyLink).getSearchParams()
		api.post('api/register/withAddressVerification', { password:testPerson.password, verificationToken:verParams.t, verificationId:verParams.i }, function(err, res) {
			check(err)
			has(res.person, { name:testPerson.name, color:testPerson.color })
			done()
		})
	})
	then('login', function(done) {
		api.post('api/session', { address:testPerson.address, password:testPerson.password }, function(err, res) {
			check(err)
			var sessionInfo = res.sessionInfo
			has(sessionInfo.person, { name:testPerson.name, color:testPerson.color })
			is(sessionInfo.authToken)
			is(sessionInfo.clientUidBlock)
			is(sessionInfo.config)
			done()
		})
	})
})

setup('Facebook registration', function() {
	var fbSession
	var fbMe
	var password = '123123'
	var color = 1
	then('check that register with changed email fails', function(done) {
		facebook.get('/oauth/access_token', {}, function(err, _fbSession) {
			check(err)
			fbSession = _fbSession
			facebook.get('/me?fields=id,birthday,email', {}, function(err, _fbMe) {
				check(err)
				fbMe = _fbMe
				api.post('api/register/withFacebookSession', { name:fbMe.name, color:color, password:password, address:Addresses.email('spoofed@gmail.com'), fbSession:fbSession }, function(err, res) {
					is(err)
					done()
				})
			})
		})
	})
	then('register with fb session', function(done) {
		api.post('api/register/withFacebookSession', { name:fbMe.name, color:color, password:password, address:Addresses.email(fbMe.email), fbSession:fbSession }, function(err, res) {
			has(res.person, { name:fbMe.name, color:color })
			done()
		})
	})
	then('login', function(done) {
		api.post('api/session', { address:Addresses.email(fbMe.email), password:password }, function(err, res) {
			check(err)
			var sessionInfo = res.sessionInfo
			has(sessionInfo.person, { name:fbMe.name, color:color })
			is(sessionInfo.authToken)
			is(sessionInfo.clientUidBlock)
			is(sessionInfo.config)
			done()
		})
	})
})
