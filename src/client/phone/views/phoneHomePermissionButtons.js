var documentName = 'HomeViewPermissionsAsked'

var permissionsAsked
module.exports = function renderPermissionButtons() {
	Documents.read(documentName, function(err, _permissionsAsked) {
		if (err) { return error(err) }
		permissionsAsked = _permissionsAsked || {}
		_updateButtons()
	})
	return div({ id:'permissionButtonsSpace' })
}

function _updateButtons() {
	var permissionButton
	var buttonSpace = 6 * unit
	var buttonStyle = style(unitPadding(1.15, 0, 1.35), unitMargin(.5), fixed(0, 8*unit), {
		display:'block', width:viewport.width()-unit*1, boxShadow:'0 1px 1px rgba(0,0,0,.5)'
	})
	if (!permissionButton && !permissionsAsked.pushNotifications) {
		permissionButton = div('button', buttonStyle, 'Enable Notifications', button(_enableNotifications))
	}
	if (!permissionButton && !permissionsAsked.addressBook) {
		permissionButton = div('button', buttonStyle, 'Add Address Book Contacts', button(_addPhoneContacts))
	}
	// if (!permissionButton && !permissionsAsked.facebookFriends) {
	// 	permissionButton = div('button', buttonStyle, 'Add Facebook Friends', button(_addFacebookFriends))
	// }
	$('#permissionButtonsSpace').empty()
	$('#permissionButton').remove()
	if (permissionButton) {
		$('#permissionButtonsSpace').append(div(style({ height:buttonSpace })))
		$('#centerFrame').append(div({ id:'permissionButton' }, permissionButton))
	}
	
}

function _enableNotifications() {
	ovarlay.show('Enabling notifications...')
	bridge.command('push.register', function(err, res) {
		if (err) { return error('Please enable notifications for Dogo in the Settings App') }
		api.post('api/pushAuth', { pushToken:res.pushToken, pushType:res.pushType }, function(err) {
			if (err) { return error(err) }
			_updatePermissions('pushNotifications')
		})
	})
}

function _addPhoneContacts() {
	Contacts.mergeInAddressBook(function(err) {
		if (err) { return error(err) }
		_updatePermissions('addressBook')
	})
}

function _addFacebookFriends() {
	Contacts.mergeInFacebookFriends(function(err) {
		if (err) { return error(err) }
		_updatePermissions('facebookFriends')
	})
}

function _updatePermissions(permission) {
	overlay.hide()
	permissionsAsked[permission] = new Date().getTime()
	Documents.write(documentName, permissionsAsked)
	_updateButtons(permissionsAsked)
}
