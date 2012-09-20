var u = require('../1_test-utils.js')

var api = u.api
var check = u.check
var is = u.is

function sendMessage(body, callback) {
	api.get('conversations', function(err, res) {
		check(err)
		api.post('messages', { toAccountId:res.conversations[0].withAccountId, body:body, clientUid:u.clientUid() }, function(err, res) {
			check(err)
			callback(err, res)
		})
	})
}

describe('Conversations', function() {
	u.loadFbTestData()
	
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
