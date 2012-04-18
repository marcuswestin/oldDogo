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
	get: function(path, callback) { api.send('get', path, null, callback) },
	send: function(method, path, params, callback) {
		if (!callback) {
			callback = params
			params = {}
		}

		var auth = api.session ? (api.session + '@') : ''
		var url = 'http://'+auth+'localhost:'+port+'/api/'+path
		var body = params ? JSON.stringify(params) : ''
		var headers = { 'Content-Type':'application/json', 'Content-Length':body.length }
		request[method]({ url:url, headers:headers, body:body }, function(err, res) {
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
		request.get({ url:'https://graph.facebook.com/oauth/access_token', qs:params }, function(err, res) {
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
			console.log('Created user', user)
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
		api.post('session', { fb_access_token:fbUser.access_token }, function(err, res) {
			check(err)
			is(res.session)
			is(res.account)
			is(res.account.facebook_id, fbUser.id)
			api.session = res.session
			done()
		})
	})
})

describe('Session', function() {
	it('should let you create a conversation', function(done) {
		var fbFriend = u.fbTestUsers[1]
		api.post('conversation', { with_fb_account_id:fbFriend.id }, function(err, res) {
			check(err)
			is(res && res.id)
			done()
		})
	})
})
