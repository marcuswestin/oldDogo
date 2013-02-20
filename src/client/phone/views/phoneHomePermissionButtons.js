var documentName = 'HomeViewPermissionsAsked'

module.exports = function renderPermissionButtons() {
	Documents.read(documentName, function(err, permissionsAsked) {
		if (err) { return error(err) }
		_updateButtons(permissionsAsked)
	})
	return div({ id:'permissionButtonsSpace' })
}

function _updateButtons(permissionsAsked) {
	if (!permissionsAsked) { permissionsAsked = {} }
	var permissionButton
	var buttonSpace = 5.5 * unit + 1
	var buttonStyle = style(unitPadding(1.15, 0, 1.35), unitMargin(.5), fixed(0, 8*unit), {
		display:'block', width:viewport.width()-unit*1, boxShadow:'0 1px 1px rgba(0,0,0,.5)'
	})
	if (!permissionButton && !permissionsAsked.pushNotifications) {
		permissionButton = div('button', buttonStyle, 'Enable Notifications', button(_enableNotifications(permissionsAsked)))
	}
	if (!permissionButton && !permissionsAsked.facebookFriends) {
		permissionButton = div('button', buttonStyle, 'Add my Facebook Friends', button(_addFacebookFriends(permissionsAsked)))
	}
	// if (!permissionsAsked.addressBook) {
	// 	buttons.push(div('button', buttonStyle, 'Add Phone Contacts', button(_addPhoneContacts(permissionsAsked))))
	// }
	$('#permissionButtonsSpace').empty()
	$('#permissionButton').remove()
	if (permissionButton) {
		$('#permissionButtonsSpace').append(div(style({ height:buttonSpace })))
		$('#centerFrame').append(div({ id:'permissionButton' }, permissionButton))
	}
	
}

function _enableNotifications(permissionsAsked) {
	return function() {
		ovarlay.show('Enabling notifications...')
		bridge.command('push.register', function(err, info) {
			if (err) { return error('Please enable notifications for Dogo in the Settings App') }
			api.post('api/pushAuth', { pushToken:info.deviceToken, pushType:'ios' }, function(err) {
				if (err) { return error(err) }
				permissionsAsked.pushNotifications = new Date().getTime()
				Documents.write(documentName, permissionsAsked)
				_updateButtons(permissionsAsked)
				overlay.hide()
			})
		})
	}
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
				
				if (soloPerson && Addresses.isFacebook(soloPerson)) { delete fbFriendsById[soloPerson.addressId] }
			})

			var newAddresses = map(fbFriendsById, function(fbFriend) { return Addresses.facebook(fbFriend.id, fbFriend.name) })
			newAddresses = newAddresses.slice(0,3) // for testing
			Conversations.addAddresses(newAddresses, function(err) {
				if (err) { return error(err) }
				permissionsAsked.facebookFriends = new Date().getTime()
				Documents.write(documentName, permissionsAsked)
				_updateButtons(permissionsAsked)
				overlay.hide()
			})
		})

		function _fetchConversations(callback) {
			Conversations.fetch(function(err, conversations) {
				if (err) { return callback("I'm sorry, I am unable to fetch your conversations from my server.") }
				callback(null, conversations)
			})
		}

		function _fetchFacebookFriends(callback) {
			bridge.command('facebook.connect', { permissions:['friends_birthday'] }, function(err, data) {
				if (err) { return error(err) }
				bridge.command('facebook.request', { path:'/me/friends?fields=id,name,birthday' }, function(err, response) {
					if (err) { return callback("I'm sorry. I was unable to fetch your friends from Facebook.") }
					callback(null, response.data)
				})
			})
		}
	}
}
