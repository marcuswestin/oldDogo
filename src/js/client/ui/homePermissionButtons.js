var Conversations = require('client/conversations')

module.exports = function renderPermissionButtons() {
	gState.load('permissionsAsked', _updateButtons)
	return div({ id:'permissionButtons' })
}

function _updateButtons(permissionsAsked) {
	if (!permissionsAsked) { permissionsAsked = {} }
	var buttons = []
	var buttonStyle = style({ margin:3, padding:px(6, 8, 8), fontSize:16 })
	if (!permissionsAsked.facebookFriends) {
		buttons.push(div('button', buttonStyle, 'Add FB Friends', button(_addFacebookFriends(permissionsAsked))))
	}
	if (!permissionsAsked.addressBook) {
		buttons.push(div('button', buttonStyle, 'Add Phone Contacts', button(_addPhoneContacts(permissionsAsked))))
	}
	$('#permissionButtons').empty().append(div(style({ textAlign:'center', padding:4 }), buttons))
}

function _addPhoneContacts(permissionsAsked) {
	return function() {
		
	}
}

function _addFacebookFriends(permissionsAsked) {
	return function() {
		overlay.show('Fetching friends...')
		parallel(_fetchConversations, _fetchFacebookFriends, function(err, conversations, fbFriends) {
			if (err) { return error(err) }
			overlay.show('Adding friends...')
			var fbFriendsById = {}
			each(fbFriends, function(fbFriend) { fbFriendsById[fbFriend.id] = fbFriend })

			each(conversations, function(convo) {
				var soloPerson = (convo.people.length == 1 && convo.people[0])
				if (soloPerson && soloPerson.facebookId) { delete fbFriendsById[soloPerson.facebookId] }
			})

			var newAddresses = map(fbFriendsById, function(fbFriend) { return Addresses.facebook(fbFriend.id, fbFriend.name) })
			// newAddresses = newAddresses.slice(0,10) // for testing
			Conversations.addAddresses(newAddresses, function(err) {
				if (err) { return error(err) }
				permissionsAsked.facebookFriends = new Date().getTime()
				gState.set('permissionsAsked', permissionsAsked)
				_updateButtons(permissionsAsked)
				overlay.hide()
			})
		})

		function _fetchConversations(callback) {
			Conversations.fetch(function(err, conversations) {
				if (err) {
					error("I'm sorry, I am unable to fetch your conversations from my server.")
					return callback(err)
				}
				callback(null, conversations)
			})
		}

		function _fetchFacebookFriends(callback) {
			bridge.command('facebook.connect', { permissions:['friends_birthday'] }, function(err, data) {
				if (err) { return error(err) }
				bridge.command('facebook.request', { path:'/me/friends?fields=id,name,birthday' }, function(err, response) {
					if (err) {
						error("I'm sorry. I was unable to fetch your friends from Facebook.")
						return callback(err)
					}
					callback(null, response.data)
				})
			})
		}
	}
}
