var documentName = 'HomeViewPermissionsAsked'

var permissionsAsked
module.exports = function renderPermissionButtons() {
	Documents.read(documentName, function(err, _permissionsAsked) {
		if (err) { return error(err) }
		// _permissionsAsked = {}
		permissionsAsked = _permissionsAsked || {}
		_updateButtons()
	})
	return div({ id:'permissionButtonsSpace' })
}

function _updateButtons() {
	var permissionButton
	var buttonSpace = 5.5 * unit
	var buttonStyle = style(unitPadding(1.15, 0, 1.35), unitMargin(.5), fixed(0, 8.5*unit), {
		display:'block', width:viewport.width()-unit*1, boxShadow:'0 1px 1px rgba(0,0,0,.5)'
	})
	if (!permissionButton && !permissionsAsked.pushNotifications) {
		permissionButton = div('button', buttonStyle, 'Enable Notifications', button(_enableNotifications))
	}
	if (!permissionButton && !permissionsAsked.facebookFriends) {
		permissionButton = div('button', buttonStyle, 'Add my Facebook Friends', button(_addFacebookFriends))
	}
	if (!permissionButton && !permissionsAsked.addressBook) {
		permissionButton = div('button', buttonStyle, 'Add Phone Contacts', button(_addPhoneContacts))
	}
	$('#permissionButtonsSpace').empty()
	$('#permissionButton').remove()
	if (permissionButton) {
		$('#permissionButtonsSpace').append(div(style({ height:buttonSpace })))
		$('#centerFrame').append(div({ id:'permissionButton' }, permissionButton))
	}
	
}

function _enableNotifications() {
	ovarlay.show('Enabling notifications...')
	bridge.command('push.register', function(err, info) {
		if (err) { return error('Please enable notifications for Dogo in the Settings App') }
		api.post('api/pushAuth', { pushToken:info.deviceToken, pushType:'ios' }, function(err) {
			if (err) { return error(err) }
			_updatePermissions('pushNotifications')
			overlay.hide()
		})
	})
}

function _addPhoneContacts() {
	overlay.show('Reading address book...')
	parallel(_fetchConversations, _readAddressBook, function(err, conversations, entries) {
		if (err) { return error(err) }
		overlay.show('Processing entries...')
		
		var knownPhones = {}
		var knownEmails = {}
		each(conversations, function(convo) {
			if (convo.people.length != 1) { return }
			var person = convo.people[0]
			if (Addresses.isPhone(person)) {
				var normalizedPhone = Addresses.normalizePhone(person.addressId)
				knownPhones[normalizedPhone] = true
			} else if (Addresses.isEmail(person)) {
				var normalizedEmail = Addresses.normalizeEmail(person.addressId)
				knownEmails[normalizedEmail] = true
			}
		})
		
		var newAddresses = []
		each(entries, function(entry) {
			if (!entry.firstName || !entry.lastName) { return }
			var name = entry.firstName + ' ' + entry.lastName
			each(entry.phones, function(phone) {
				var normalizedPhone = Addresses.normalizePhone(phone)
				if (knownPhones[normalizedPhone]) { return }
				newAddresses.push(Addresses.phone(normalizedPhone, name))
			})
			each(entry.emails, function(email) {
				var normalizedEmail = Addresses.normalizeEmail(email)
				if (knownEmails[normalizedEmail]) { return }
				newAddresses.push(Addresses.email(normalizedEmail, name))
			})
		})
		// newAddresses = newAddresses.slice(0, 3) // for testing
		Conversations.addAddresses(newAddresses, function(err) {
			if (err) { return error(err) }
			_updatePermissions('addressBook')
			overlay.hide()
		})
	})
	
	function _readAddressBook(callback) {
		bridge.command('BTAddressBook.getAllEntries', function(err, data) {
			if (err) { return callback(err) }
			callback(null, data.entries)
		})
	}
}

function _addFacebookFriends() {
	overlay.show('Fetching friends...')
	parallel(_fetchConversations, _fetchFacebookFriends, function(err, conversations, fbFriends) {
		if (err) { return error(err) }
		overlay.show('Adding friends...')
		var fbFriendsById = {}
		each(fbFriends, function(fbFriend) { fbFriendsById[fbFriend.id] = fbFriend })

		each(conversations, function(convo) {
			if (convo.people.length != 1) { return }
			var person = convo.people[0]
			if (Addresses.isFacebook(person)) {
				delete fbFriendsById[person.addressId]
			}
		})

		var newAddresses = map(fbFriendsById, function(fbFriend) { return Addresses.facebook(fbFriend.id, fbFriend.name) })
		// newAddresses = newAddresses.slice(0,3) // for testing
		Conversations.addAddresses(newAddresses, function(err) {
			if (err) { return error(err) }
			_updatePermissions('facebookFriends')
			overlay.hide()
		})
	})

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

function _fetchConversations(callback) {
	Conversations.fetch(function(err, conversations) {
		if (err) { return callback("I'm sorry, I am unable to fetch your conversations from my server.") }
		callback(null, conversations)
	})
}

function _updatePermissions(permission) {
	permissionsAsked[permission] = new Date().getTime()
	Documents.write(documentName, permissionsAsked)
	_updateButtons(permissionsAsked)
}
