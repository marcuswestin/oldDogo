var u = require('../1_test-utils')
var is = u.is
var check = u.check
var url = require('url')
var qs = require('querystring')
var fs = require('fs')
var request = require('request')
var facebook = require('../../src/server/util/facebook')

var api = u.api

describe('Setup with Facebook Connect', function() {
	it('should allow creating an FB app access token', function(done) {
		this.timeout(0)
		// https://developers.facebook.com/docs/authentication/applications/
		var params = { client_id:u.fbAppId, client_secret:u.fbAppSecret, grant_type:'client_credentials' }
		facebook.post('/oauth/access_token', params, function(err, res) {
			check(err)
			api.accessToken = res.access_token
			is(api.accessToken)
			done()
		})
	})
	
	it('should allow creating a test FB user', function(done) {
		if (true) { return done() }
		this.timeout(0)
		var params = { installed:true, name:'John Cowp', local:'en_US', permissions:'read_stream', method:'post', access_token:api.accessToken }
		facebook.post('/'+u.fbAppId+'/accounts/test-users', params, function(err, user) {
			check(err)
			is(user.id)
			done()
		})
	})

	var fbUsers
	it('should let you list the current test FB users', function(done) {
		this.timeout(0)
		var params = { access_token:api.accessToken }
		facebook.get('/'+u.fbAppId+'/accounts/test-users', params, function(err, res) {
			check(err)
			fbUsers = res.data
			is(fbUsers.length)
			done()
		})
	})
	
	it('should let you create a session', function(done) {
		var fbUser = fbUsers[0]
		this.timeout(0)
		api.post('sessions', { facebookAccessToken:fbUser.access_token }, function(err, res) {
			check(err)
			is(res.authToken)
			is(res.account)
			is(res.account.facebookId, fbUser.id)
			
			api.authToken = res.authToken
			
			done()
		})
	})
	
	describe('First session', function() {
		it('should have 0 conversations', function(done) {
			api.get('conversations', function(err, res) {
				check(err)
				is(!res.conversations.length)
				done()
			})
		})
		it('should let you send a first message', function(done) {
			var fbFriend = u.fbTestData.users[1]
			api.post('messages', { toFacebookId:fbFriend.id, body:'Hi', clientUid:u.clientUid() }, function(err, res) {
				check(err)
				is(res.message.id)
				is(res.message.body, 'Hi')
				done()
			})
		})
		it('should then have one conversation, and sending a message to another friend should create a second conversation', function(done) {
			api.get('conversations', function(err, res) {
				var convoCount = res.conversations.length
				var firstConvo = res.conversations[0]
				is(firstConvo)
				is(res.conversations.length, 1)
				var newFbFriend = u.fbTestData.users[2]
				api.post('messages', { toFacebookId:newFbFriend.id, body:'Ho', clientUid:u.clientUid() }, function(err, res) {
					var message = res.message
					api.get('conversations', function(err, res) {
						is(res.conversations.length, convoCount + 1)
						is(firstConvo.id, res.conversations[1].id) // the new conversation should now appear first, and the old conversation second
						done()
					})
				})
			})
		})
	})
})
