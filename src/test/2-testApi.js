var u = require('../1_test-utils')
var is = u.is
var check = u.check
var url = require('url')
var qs = require('querystring')
var fs = require('fs')
var request = require('request')
var facebook = require('server/util/facebook')
var makeTimer = require('server/util/makeTimer')

var api = u.api

// makeTimer.disable()

describe('Waitlist', function() {
	var emailAddress = 'narcvs@gmail.com'
	var waitlistedTime
	it('should be possible to sign up', function(done) {
		api.post('api/waitlist', { emailAddress:emailAddress }, function(err, res) {
			check(err)
			is(waitlistedTime = res.person.waitlistedTime)
			done()
		})
	})
	it('should detect that the email address has already been waitlisted', function(done) {
		api.post('api/waitlist', { emailAddress:emailAddress }, function(err, res) {
			check(err)
			is(res.waitlistedSince)
			is(res.person.waitlistedTime, waitlistedTime)
			done()
		})
	})
})

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
		var timer = makeTimer('create session').start('postSession')
		api.post('api/session', { facebookAccessToken:fbUser.access_token }, function(err, res) {
			timer.stop('postSession').report()
			check(err)
			is(res.authToken)
			is(res.person)
			is(res.person.facebookId, fbUser.id)
			
			api.authToken = res.authToken
			
			done()
		})
	})
	
	describe('First session', function() {
		var convId
		var accId
		it('should have 0 conversations with a message', function(done) {
			api.get('api/conversations', function(err, res) {
				check(err)
				each(res.conversations, function(conv) {
					is(!conv.lastMessageId)
				})
				convId = res.conversations[0].id
				accId = res.conversations[0].person.id
				done()
			})
		})
		it('should let you send a first message', function(done) {
			var clientUid = u.clientUid()
			api.post('api/message', { toConversationId:convId, toPersonId:accId, body:'Hi', clientUid:clientUid }, function(err, res) {
				check(err)
				is(res.message.clientUid)
				is(res.message.body, 'Hi')
				done()
			})
		})
		it('should then have one conversation, & messaging a 2nd friend should create a 2nd conversation', function(done) {
			api.get('api/conversations', function(err, res) {
				var convoCount = res.conversations.length
				var secondConvo = res.conversations[1]
				is(secondConvo)
				is(numConversationsWithMessages(res.conversations), 1)
				api.post('api/message', { toConversationId:secondConvo.id, toPersonId:secondConvo.person.id, body:'Ho', clientUid:u.clientUid() }, function(err, res) {
					is(res.message)
					api.get('api/conversations', function(err, res) {
						is(numConversationsWithMessages(res.conversations), 2)
						is(secondConvo.id, res.conversations[0].id) // the new conversation should now appear first, and the old conversation second
						done()
					})
				})
			})
		})
	})
})

function numConversationsWithMessages(conversations) {
	return _.reduce(conversations, function(memo, conv) { return memo + (conv.lastMessage ? 1 : 0) }, 0)
}


// var u = require('../1_test-utils.js')
// 
// var api = u.api
// var check = u.check
// var is = u.is
// 
// function sendMessage(body, callback) {
// 	api.get('api/conversations', function(err, res) {
// 		check(err)
// 		var conv = res.conversations[0]
// 		api.post('api/message', { toConversationId:conv.id, toPersonId:conv.person.id, body:body, clientUid:u.clientUid() }, function(err, res) {
// 			check(err)
// 			callback(err, res)
// 		})
// 	})
// }
// 
// describe('Conversations', function() {
// 	it('should be possible to get messages by person id', function(done) {
// 		api.get('api/conversations', function(err, res) {
// 			api.get('api/messages', { conversationId:res.conversations[0].id }, function(err, res) {
// 				check(err)
// 				is(res.messages.length)
// 				done()
// 			})
// 		})
// 	})
// 	it('should be possible to send to an person id', function(done) {
// 		var body = 'Hi there'
// 		sendMessage(body, function(err, res) {
// 			is(res.message.body, body)
// 			done()
// 		})
// 	})
// })
// 
// describe('Push', function() {
// 	it('should have been sent when a message is sent', function(done) {
// 		var before = u.pushService.testCount
// 		sendMessage("foo", function(err, res) {
// 			is(u.pushService.testCount, before + 1)
// 			done()
// 		})
// 	})
// })