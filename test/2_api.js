var u = require('./1_utils'),
	is = u.is,
	check = u.check,
	Router = require('../src/server/Router'),
	request = require('request'),
	url = require('url'),
	qs = require('querystring')

var port = 9090,
	router = new Router(u.accountService, u.messageService, u.sessionService, { log:false, dev:true })

var api = {
	post: function(path, params, callback) { api.send('post', path, params, callback) },
	get: function(path, params, callback) {
		if (!callback) {
			callback = params
			delete params
		}
		api.send('get', path, params, callback)
	},
	send: function(method, path, params, callback) {
		if (!callback) {
			callback = params
			params = {}
		}

		var auth = api.authToken ? (api.authToken + '@') : ''
		var url = 'http://'+auth+'localhost:'+port+'/api/'+path
		if (method == 'GET') {
			var body = params ? JSON.stringify(params) : ''
			var qs = null
		} else {
			var body = ''
			var qs = params
		}
		var headers = { 'Content-Type':'application/json', 'Content-Length':body.length }
		request[method]({ url:url, headers:headers, body:body, qs:qs }, function(err, res) {
			if (err) { return callback(err) }
			if (res.statusCode != 200) { return callback(new Error('Non-200 status code: '+res.statusCode+'. '+url)) }
			try { var data = JSON.parse(res.body) }
			catch(e) { return callback(e, null) }
			callback(null, data)
		})
	}
}

before(u.setupDatabase)

describe('API', function() {
	it('should start', function(done) {
		router.listen(port)
		done()
	})
	it('should be reachable', function(done) {
		api.get('ping', done)
	})
})

describe('Facebook connect', function() {
	it('should allow creating an FB app access token', function(done) {
		if (u.fbAppAccessToken) { return done() }
		// https://developers.facebook.com/docs/authentication/applications/
		var params = { client_id:u.fbAppId, client_secret:u.fbAppSecret, grant_type:'client_credentials' }
		request.post({ url:'https://graph.facebook.com/oauth/access_token', qs:params }, function(err, res) {
			check(err)
			appAccessToken = qs.parse(res.body).access_token
			is(appAccessToken)
			done()
		})
	})
	
	it('should allow creating a test FB user', function(done) {
		if (true) { return done() }
		this.timeout(10000)
		var params = { installed:true, name:'John Cowp', local:'en_US', permissions:'read_stream', method:'post', access_token:u.fbAppAccessToken }
		request.post({ url:'https://graph.facebook.com/'+u.fbAppId+'/accounts/test-users', qs:params }, function(err, res) {
			check(err)
			var user = JSON.parse(res.body)
			is(user.id)
			done()
		})
	})

	it('should let you list the current test FB users', function(done) {
		if (u.fbTestUsers) { return done() }
		var params = { access_token:u.fbAppAccessToken }
		request.get({ url:'https://graph.facebook.com/'+u.fbAppId+'/accounts/test-users', qs:params }, function(err, res) {
			check(err)
			var fbTestUsers = JSON.parse(res.body).data
			is(fbTestUsers.length)
			u.setFbTestUsers(fbTestUsers)
			done()
		})
	})
	
	it('should let you create a session', function(done) {
		var fbUser = u.fbTestUsers[0]
		this.timeout(5000)
		api.post('sessions', { facebookAccessToken:fbUser.access_token }, function(err, res) {
			check(err)
			is(res.authToken)
			is(res.account)
			is(res.account.facebookId, fbUser.id)
			api.authToken = res.authToken
			done()
		})
	})
})

describe('Sessions', function() {
	it('should let you access conversations', function(done) {
		api.get('conversations', function(err, res) {
			check(err)
			is(!res.conversations.length)
			done()
		})
	})
	it('should let you send a message', function(done) {
		var fbFriend = u.fbTestUsers[1]
		api.post('messages', { toFacebookId:fbFriend.id, body:'Hi' }, function(err, res) {
			check(err)
			is(res.message.id)
			is(res.message.body, 'Hi')
			done()
		})
	})
})

sendMessage = function(body, callback) {
	api.get('conversations', function(err, res) {
		check(err)
		api.post('messages', { toAccountId:res.conversations[0].withAccountId, body:body }, function(err, res) {
			check(err)
			callback(err, res)
		})
	})
}

describe('Conversations', function() {
	it('should be created when a new message is sent to a facebook id', function(done) {
		api.get('conversations', function(err, res) {
			var convoCount = res.conversations.length
			var firstConvo = res.conversations[0]
			is(firstConvo)
			var newFbFriend = u.fbTestUsers[2]
			api.post('messages', { toFacebookId:newFbFriend.id, body:'Ho' }, function(err, res) {
				var message = res.message
				api.get('conversations', function(err, res) {
					is(res.conversations.length, convoCount + 1)
					is(firstConvo.id, res.conversations[1].id) // the new conversation should now appear first
					done()
				})
			})
		})
	})
	it('should be possible to get messages by facebook id', function(done) {
		api.get('conversations', function(err, res) {
			api.get('messages', { withFacebookId:u.fbTestUsers[2].id }, function(err, res) {
				check(err)
				is(res.messages.length)
				done()
			})
		})
	})
	it('should be possible to get messages by account id', function(done) {
		api.get('conversations', function(err, res) {
			api.get('messages', { withAccountId:res.conversations[0].withAccountId }, function(err, res) {
				check(err)
				is(res.messages.length)
				done()
			})
		})
	})
	it('should be possible to send to an account id', function(done) {
		var body = 'Hi there'
		sendMessage(body, function(err, res) {
			is(res.message.body, body)
			done()
		})
	})
})

describe('Push', function() {
	it('should have been sent when a message is sent', function(done) {
		var before = u.pushService.testCount
		sendMessage("foo", function(err, res) {
			is(u.pushService.testCount, before + 1)
			done()
		})
	})
})
