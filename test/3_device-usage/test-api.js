var u = require('../1_test-utils.js')

var api = u.api
var check = u.check
var is = u.is

function sendMessage(body, callback) {
	api.get('api/conversations', function(err, res) {
		check(err)
		var conv = res.conversations[0]
		api.post('api/message', { toConversationId:conv.id, toPersonId:conv.person.id, body:body, clientUid:u.clientUid() }, function(err, res) {
			check(err)
			callback(err, res)
		})
	})
}

describe('Conversations', function() {
	it('should be possible to get messages by person id', function(done) {
		api.get('api/conversations', function(err, res) {
			api.get('api/messages', { conversationId:res.conversations[0].id }, function(err, res) {
				check(err)
				is(res.messages.length)
				done()
			})
		})
	})
	it('should be possible to send to an person id', function(done) {
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
