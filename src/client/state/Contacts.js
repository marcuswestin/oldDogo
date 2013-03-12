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
		var sql = 'SELECT contactUid, addressType, addressId, createdTime, name, pictureUploadedTime, localId, hasLocalImage FROM contact'
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
			'SELECT addressType, addressId, createdTime, name, pictureUploadedTime, localId, hasLocalImage',
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
			sessionInfo.generateClientUids({
				withGenerator:function(generateUid) {
					console.log("HERE")
					each(fbFriends, function(fbFriend) {
						_collectNewContacts(generateUid, newContacts, knownAddresses, Addresses.types.facebook, [fbFriend.id], fbFriend.name, createdTime, null, 0)
					})
				},
				onDone: function(err) {
					if (err) { return callback(err) }
					_storeNewContacts(newContacts, callback)
				}
			})
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
			sessionInfo.generateClientUids({
				withGenerator:function(generateUid) {
					each(addressBookRes.entries, function(entry) {
						console.log("HERE", entry.hasImage)
						_collectNewContacts(generateUid, newContacts, knownAddresses, Addresses.types.phone, map(entry.phoneNumbers, Addresses.normalizePhone), entry.name, createdTime, entry.recordId, entry.hasImage)
						_collectNewContacts(generateUid, newContacts, knownAddresses, Addresses.types.email, map(entry.emailAddresses, Addresses.normalizeEmail), entry.name, createdTime, entry.recordId, entry.hasImage)
					})
				},
				onDone:function(err) {
					if (err) { return callback(err) }
					_storeNewContacts(newContacts, callback)
				}
			})
		})
	})
	
	function _getAddressBookEntries(callback) {
		bridge.command('BTAddressBook.getAllEntries', callback)
	}
}

function _collectNewContacts(generateUid, newContacts, knownAddresses, addressType, addressIds, name, createdTime, localId, hasLocalImage) {
	var knownAddressesByType = knownAddresses[addressType]
	each(addressIds, function(addressId) {
		if (knownAddressesByType[addressId]) { return }
		knownAddressesByType[addressId] = true
		newContacts.push({ contactUid:generateUid(), addressType:addressType, addressId:addressId, createdTime:createdTime, name:name, localId:localId, hasLocalImage:hasLocalImage })
	})
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

function _storeNewContacts(newContacts, _callback) {
	function callback(err) {
		overlay.hide()
		_callback(err)
	}
	
	if (!newContacts.length) { return callback() }
	overlay.show('Storing ' + newContacts.length + ' new contacts in cloud...')
	
	var contactsList = map(newContacts, _getContactAsList)
	api.post('api/contacts', { contactsList:contactsList }, function(err, res) {
		if (err) { return callback(err) }
		overlay.show('Storing contacts locally...')
		bridge.command('BTSql.insertMultiple', { sql:insertContactSql, argumentsList:contactsList }, callback)
	})
}

var insertContactSql = 'INSERT INTO contact (contactUid, addressType, addressId, createdTime, name, pictureUploadedTime, localId, hasLocalImage) VALUES (?,?,?,?,?,?,?,?)'
function _getContactAsList(c) {
	return [c.contactUid, c.addressType, c.addressId, c.createdTime, c.name, c.pictureUploadedTime || null, c.localId || null, c.hasLocalImage || null]
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

function _insertContactsFromServer(serverResponse, _callback) {
	function callback(err) {
		if (err) { return _callback(err) }
		Documents.set('ContactsMeta', { lastUpdatedTime:serverResponse.readTime }, _callback)
	}
	
	if (serverResponse.contacts.length == 0) { return callback() }
	var argumentsList = map(serverResponse.contacts, _getContactAsList)
	bridge.command('BTSql.insertMultiple', { sql:insertContactSql, argumentsList:argumentsList, ignoreDuplicates:true }, callback)
}

var initializeQueue = []
function _whenInitialized(callback) {
	if (!initializeQueue) { return callback() }
	initializeQueue.push(callback)
}
function _onInitialized() {
	console.log('Contacts initialized')
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



