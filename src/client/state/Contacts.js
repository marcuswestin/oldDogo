module.exports = {
	mergeInAddressBook:mergeInAddressBook,
	mergeInFacebookFriends:mergeInFacebookFriends,
	
	// fetchFromServer:fetchFromServer,
	// mergeFacebookFriends:mergeFacebookFriends,
	lookupByPrefix:lookupByPrefix,
	all:all
}

function all(callback) {
	_whenInitialized(function() {
		var sql = 'SELECT addressType, addressId, createdTime, name, localId, hasLocalImage, pictureUploadedTime FROM contact'
		bridge.command('BTSql.query', { sql:sql }, function(err, res) {
			callback(err, err ? null : res.rows)
		})
	})
}

function lookupByPrefix(prefix, opts, callback) {
	opts = options(opts, { limit:null })
	_whenInitialized(function() {
		var limit = (typeof opts.limit == 'number' ? 'LIMIT '+opts.limit : '')
		var sql = [
			'SELECT addressType, addressId, createdTime, name, localId, hasLocalImage, pictureUploadedTime',
			'FROM contact WHERE addressId LIKE ? OR name LIKE ? '+limit
		].join('\n')
		bridge.command('BTSql.query', { sql:sql, arguments:[prefix+'%', prefix+'%'] }, function(err, res) {
			if (err) { return callback(err) }
			callback(null, res.rows)
		})
	})
}

function mergeInFacebookFriends(callback) {
	_updateFromServer(function(err) {
		if (err) { return callback(err) }
		overlay.show('Fetching friends from Facebook...')
		parallel(_getFbFriends, _getKnownAddresses, function(err, fbFriends, knownAddresses) {
			if (err) { return callback(err) }
			overlay.show('Detecting duplicates...')
			var newContacts = []
			var createdTime = now()
			each(fbFriends, function(fbFriend) {
				_collectNewContacts(newContacts, knownAddresses, Addresses.types.facebook, [fbFriend.id], fbFriend.name, createdTime, null, 0)
			})
			_storeNewContacts(newContacts, callback)
		})
	})
	
	
	function _getFbFriends(callback) {
		bridge.command('facebook.connect', { permissions:['friends_birthday'] }, function(err, data) {
			if (err) { return callback(err) }
			bridge.command('facebook.request', { path:'/me/friends?fields=id,name,birthday' }, function(err, response) {
				if (err) { return callback("I'm sorry. I was unable to fetch your friends from Facebook.") }
				callback(null, response.data)
			})
		})
	}
}

function mergeInAddressBook(callback) {
	_updateFromServer(function(err) {
		if (err) { return callback(err) }
		overlay.show('Reading contacts from address book...')
		parallel(_getAddressBookEntries, _getKnownAddresses, function(err, addressBookRes, knownAddresses) {
			if (err) { return callback(err) }
			overlay.show('Detecting duplicates...')
			var newContacts = []
			var createdTime = now()
			each(addressBookRes.entries, function(entry) {
				_collectNewContacts(newContacts, knownAddresses, Addresses.types.phone, map(entry.phoneNumbers, Addresses.normalizePhone), entry.name, createdTime, entry.recordId, entry.hasImage)
				_collectNewContacts(newContacts, knownAddresses, Addresses.types.email, map(entry.emailAddresses, Addresses.normalizeEmail), entry.name, createdTime, entry.recordId, entry.hasImage)
			})
			_storeNewContacts(newContacts, callback)
		})
	})
	
	function _getAddressBookEntries(callback) {
		bridge.command('BTAddressBook.getAllEntries', callback)
	}
}

function _getKnownAddresses(callback) {
	bridge.command('BTSql.query', { sql:'SELECT addressType, addressId FROM contact' }, function(err, res) {
		if (err) { return callback(err) }
		var knownAddresses = { count: res.rows.length }
		knownAddresses[Addresses.types.phone] = {}
		knownAddresses[Addresses.types.email] = {}
		knownAddresses[Addresses.types.facebook] = {}
		each(res.rows, function(row) { knownAddresses[row.addressType][row.addressId] = true })
		callback(null, knownAddresses)
	})
}

function _storeNewContacts(contactsList, callback) {
	if (!contactsList.length) { return onDone() }
	overlay.show('Storing ' + contactsList.length + ' new contacts in cloud...')
	api.post('api/contacts', { contactsList:contactsList }, function(err, res) {
		if (err) { return callback(err) }
		overlay.show('Storing contacts locally...')
		var sql = 'INSERT INTO contact (addressType, addressId, createdTime, name, localId, hasLocalImage) VALUES (?,?,?,?,?,?)'
		bridge.command('BTSql.insertMultiple', { sql:sql, argumentsList:contactsList }, onDone)
	})
	function onDone(err) {
		overlay.hide()
		callback(err)
	}
}

function _collectNewContacts(newContacts, knownAddresses, addressType, addressIds, name, createdTime, localId, hasLocalImage) {
	var knownAddressesByType = knownAddresses[addressType]
	each(addressIds, function(addressId) {
		if (knownAddressesByType[addressId]) { return }
		knownAddressesByType[addressId] = true
		newContacts.push([addressType, addressId, createdTime, name, localId, hasLocalImage])
	})
}

function _updateFromServer(callback) {
	overlay.show('Syncronizing with server...')
	_whenInitialized(function() {
		Documents.get('ContactsMeta', 'lastUpdatedTime', function(err, lastUpdatedTime) {
			if (err) { return callback(err) }
			api.get('api/contacts', { createdSince:lastUpdatedTime }, function(err, res) {
				if (err) { return callback(err) }
				_insertContactsFromServer(res, callback)
			})
		})
	})
}

function _insertContactsFromServer(serverResponse, callback) {
	if (serverResponse.contacts.length == 0) { return onDone() }
	var sql = 'INSERT INTO contact (addressType, addressId, createdTime, name) VALUES (?,?,?,?)'
	var argumentsList = map(serverResponse.contacts, function(c) { return [c.addressType, c.addressId, c.createdTime, c.name] })
	bridge.command('BTSql.insertMultiple', { sql:sql, argumentsList:argumentsList, ignoreDuplicates:true }, onDone)
	
	function onDone(err) {
		if (err) { return callback(err) }
		Documents.set('ContactsMeta', { lastUpdatedTime:serverResponse.readTime }, callback)
	}
}

var initializeQueue = []
function _whenInitialized(callback) {
	if (!initializeQueue) { return callback() }
	initializeQueue.push(callback)
}
function _onInitialized() {
	console.log('onInitialized')
	var callbacks = initializeQueue
	initializeQueue = null
	each(callbacks, function(callback) { callback() })
}
events.on('app.start', function() {
	Documents.get('ContactsMeta', 'lastUpdatedTime', function(err, lastUpdatedTime) {
		if (err) { return error(err) }
		if (lastUpdatedTime) { _onInitialized() }
	})
})
events.on('user.session', function() {
	if (!initializeQueue) { return }
	_initializeFromServer()
})
function _initializeFromServer() {
	api.get('api/contacts', function(err, res) {
		if (err) { return error(err) }
		_insertContactsFromServer(res, function(err) {
			if (err) { return error(err) }
			_onInitialized()
		})
	})
}



