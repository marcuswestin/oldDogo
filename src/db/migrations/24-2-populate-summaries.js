/*
	Populate each conversation participation with a summary:
	- the people in the conversation
	- the 3 recent messages
	- the 6 most recent pictures
	
	This migration should be non-descructive, as it only updates previously un-existing fields.
*/

var util = require('./util')
var config = require('server/config/dev')
var db = util.makeDatabase(config.db)
var Messages = require('data/Messages')
var sql = require('server/util/sql')

selectParticipations(function(participations) {
	updateParticipations(participations, function() {
		console.log("All done!")
	})
})

function selectParticipations(done) {
	console.log("Select participants")
	var sql = [
		"SELECT p.*, a.full_name, a.facebook_id, a.id as with_account_id",
		"FROM conversation_participation p INNER JOIN conversation c ON c.id=p.conversation_id ",
		"INNER JOIN account a ON a.id=(CASE c.account_1_id WHEN p.account_id THEN c.account_2_id ELSE c.account_1_id END)"].join('\n')
	db.select(this, sql, [], function(err, participations) {
		check(err)
		console.log("Selected", participations.length, 'participations')
		done(participations)
	})
}

var selectMessage = sql.selectFrom('message', {
	id:'id',
	senderDogoId:'sender_account_id',
	clientUid:'client_uid',
	conversationId:'conversation_id',
	type:'type',
	sentTime:'sent_time',
	payloadJson:'payloadJson'
})

function updateParticipations(participations, done) {
	console.log('selecting recent text and picture messages')
	serialMap(participations, {
		iterate:function(participation, next, i) {
			console.log('updating', participation.id, '('+i+' out of '+participations.length+')')
			if (participation.payloadJson) {
				console.log('skipping', participation.id)
				return next()
			}
			var waiting = waitFor(2, doUpdateParticipation)
			db.select(this, selectMessage+" WHERE conversation_id=? ORDER BY id DESC LIMIT 3", [participation.conversation_id], function(err, recent) {
				each(recent, parseMessagePayload)
				participation.recent = recent
				waiting(err)
			})
			db.select(this, selectMessage+" WHERE conversation_id=? AND type=2 ORDER BY id DESC LIMIT 6", [participation.conversation_id], function(err, pictures) {
				each(pictures, parseMessagePayload)
				participation.pictures = pictures
				waiting(err)
			})
			function parseMessagePayload(message) {
				message.type = Messages.types.reverse[message.type]
				message.payload = JSON.parse(message.payloadJson)
				delete message.payloadJson
			}
			function doUpdateParticipation(err) {
				if (err) { throw err }
				if (!participation.recent) { participation.recent = [] }
				var lastMessage = participation.recent[participation.recent.length - 1]
				var lastMessageTime = lastMessage ? lastMessage.sentTime : null
				var lastReceivedTime = null
				var lastReadTime = null
				if (participation.last_received_message_id) {
					lastReceivedTime = db.time() // it's ok to manufacture this
					if (participation.last_read_message_id) {
						var fudge = participation.last_received_message_id > participation.last_read_message_id ? 1 : -1
						lastReadTime = lastReceivedTime + fudge
					}
				}
				var summary = {
					people:[{
						name:participation.full_name,
						dogoId:participation.with_account_id,
						facebookId:participation.facebook_id
					}],
					recent:participation.recent,
					pictures:participation.pictures
				}

				db.updateOne(this,
					'UPDATE conversation_participation SET lastMessageTime=?, lastReceivedTime=?, lastReadTime=?, summaryJson=? WHERE id=?',
					[lastMessageTime, lastReceivedTime, lastReadTime, JSON.stringify(summary), participation.id],
					function(err) { next(err) }
				)
			}
		},
		finish:function(err) {
			console.log("Done selecting recent messages")
			check(err)
			done()
		}
	})
}

