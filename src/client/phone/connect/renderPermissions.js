module.exports = renderPermissions

function renderPermissions(view) {

	switch (view.permissionStep) {
		case 'addressBook': return nextTick(requestAddressBookPermission)
		case 'pushNotifications': return nextTick(requestPushNotificationPermission)
		default: return error("Unknown permission step")
	}

	return div(id('permissions'), div('info', 'Loading...'))
}

function requestAddressBookPermission() {
	bridge.command('BTAddressBook.getAuthorizationStatus', function(err, res) {
		if (err) { return error(err) }
		if (res != 'not determined') {
			// we have already asked
			return gScroller.setCurrent(merge(view, { permissionStep:'pushNotifications' }))
		}
		$('#permissions').empty().append(div(
			div('title', 'Add contacts to Dogo')
			ul(
				'Message any contact in your address book',
				'Access all your contacts from any device'
			),
			div('button', 'Add Contacts', function() {
				Contacts.mergeInAddressBook(function(err) {
					if (err) { return error(err) }
					gScroller.push(merge(view, { permissionStep:'pushNotifications' }))
				})
			})
		))
	})
}

function requestPushNotificationPermission() {
	
}