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
		var sql = 'SELECT * FROM contact'
		bridge.command('BTSql.query', { sql:sql }, function(err, res) {
			callback(err, err ? null : res.rows)
		})
	})
}

function lookupByPrefix(prefix, opts, callback) {
	opts = options(opts, { limit:null })
	_whenInitialized(function() {
		var limit = (typeof opts.limit == 'number' ? 'LIMIT '+opts.limit : '')
		var sql = 'SELECT * FROM contact WHERE addressId LIKE ? OR name LIKE ? '+limit
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
			var now = time.now()
			sessionInfo.generateClientUids({
				withGenerator:function(generateUid) {
					each(fbFriends, function(fbFriend) {
						_collectNewContacts(generateUid, newContacts, knownAddresses, Addresses.types.facebook, [fbFriend.id], fbFriend.name, now, null, 0)
					})
				},
				onDone: function(err) {
					if (err) { return callback(err) }
					overlay.show('Storing '+newContacts.length+' contacts ...')
					_storeNewContacts(newContacts, callback)
				}
			})
		})
	})
	
	
	function _getFbFriends(callback) {
		bridge.command('BTFacebook.connect', { permissions:['friends_birthday'] }, function(err, data) {
			if (err) { return callback(err) }
			bridge.command('BTFacebook.request', { path:'/me/friends?fields=id,name,birthday' }, function(err, response) {
				if (err) { return callback("I'm sorry. I was unable to fetch your friends from Facebook.") }
				callback(null, response.data)
			})
		})
	}
}

function mergeInAddressBook(_callback) {
	var done = false
	function callback(err, res) {
		if (done) { return }
		done = true
		_callback(err, res)
	}
	overlay.show('')
	bridge.command('BTAddressBook.countAllEntries', function(err, res) {
		if (err) { return callback(err) }
		var index = 0
		var count = res.count
		var limit = 350
		var now = time.now()
		var seenError = null
		overlay.show('Syncing with cloud...')
		_updateFromServer(function(err) {
			if (err) { return callback(err) }
			_getKnownAddresses(function(err, knownAddresses) {
				if (err) { return callback(err) }
				var chunks = []
				readNextChunk(0)
				function readNextChunk(index) {
					var progress = ' (' + Math.min(index, count) + '/' + count+') ...'
					overlay.show('Reading address book'+progress)
					bridge.command('BTAddressBook.getAllEntries', { index:index, limit:limit }, function(err, addressBookRes) {
						if (err) { return callback(err) }
						if (done) { return }
						chunks = chunks.concat(addressBookRes.entries)
						var isLast = (index >= count)
						processChunks(isLast)
						if (!isLast) { readNextChunk(index + limit) }
					})
				}
				function processChunks(isLast) {
					if (!isLast) { overlay.show('Detecting duplicates ...') }
					var newChunks = chunks
					var newContacts = []
					chunks = []
					sessionInfo.generateClientUids({
						withGenerator:function(generateUid) {
							each(newChunks, function(entry) {
								_collectNewContacts(generateUid, newContacts, knownAddresses, Addresses.types.phone, map(entry.phoneNumbers, Addresses.normalizePhone), entry.name, now, entry.recordId, entry.hasImage)
								_collectNewContacts(generateUid, newContacts, knownAddresses, Addresses.types.email, map(entry.emailAddresses, Addresses.normalizeEmail), entry.name, now, entry.recordId, entry.hasImage)
							})
						},
						onDone:function(err) {
							if (err) { return callback(err) }
							if (isLast) {
								overlay.show('Storing new contacts ...')
							}
							_storeNewContacts(newContacts, function(err, res) {
								if (err) { return callback(err) }
								if (isLast) { return callback() }
							})
						}
					})
				}
			})
		})
	})
}

function _collectNewContacts(generateUid, newContacts, knownAddresses, addressType, addressIds, name, now, localId, hasLocalImage) {
	var knownAddressesByType = knownAddresses[addressType]
	each(addressIds, function(addressId) {
		if (knownAddressesByType[addressId]) { return }
		knownAddressesByType[addressId] = true
		newContacts.push({ contactUid:generateUid(), addressType:addressType, addressId:addressId, createdTime:now, name:name, localId:localId, hasLocalImage:hasLocalImage })
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

function _storeNewContacts(newContacts, callback) {
	if (!newContacts.length) { return callback() }
	
	var contactsList = map(newContacts, _getContactAsList)
	parallel(_storeInCloud, _storeLocally, callback)
	
	function _storeInCloud(callback) {
		api.post('api/contacts', { contactsList:contactsList }, callback)
	}
	function _storeLocally(callback) {
		bridge.command('BTSql.insertMultiple', { sql:insertContactSql, argumentsList:contactsList }, callback)
	}
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



