var sessionInfo = module.exports = {
	load:load,
	getClientUid:getClientUid,
	generateClientUids:generateClientUids,
	save:save,
	clear:clear,
	checkNewVersion:checkNewVersion,
	myAddress:myAddress
}

var sessionInfoDocument = null
var filename = 'DogoSessionInfo'
var properties = ['authToken', 'person', 'clientUidBlock', 'config']

function myAddress() {
	return { addressType:Addresses.types.dogo, addressId:sessionInfoDocument.person.personId }
}

function load(callback) {
	Documents.read(filename, function(err, document) {
		if (err) { return callback(err) }
		_setDocument(document)
		callback()
	})
}

function save(document, callback) {
	Documents.write(filename, document, function(err) {
		if (err) { return callback(err) }
		_setDocument(document)
		callback()
		events.fire('user.session', document)
	})
}

function clear(callback) {
	Documents.write(filename, {}, function(err) {
		if (err) { return callback(err) }
		_setDocument(null)
		callback()
	})
}

function getClientUid(callback) {
	bumpClientUids(1, callback)
}

function bumpClientUids(num, _callback) {
	function callback(err, firstClientUid) {
		bumpClientUids.bumping = false
		_callback(err, firstClientUid)
	}
	if (bumpClientUids.bumping) { return _callback("Already bumpin client UID") }
	bumpClientUids.bumping = true
	
	var oldUidBlock = copy(sessionInfoDocument.clientUidBlock)
	var uidBlock = sessionInfoDocument.clientUidBlock
	if (uidBlock.start + num >= uidBlock.end) {
		return callback("We're sorry, you must un-install and re-download Dogo. We've very sorry!")
	}
	
	var firstClientUid = uidBlock.start
	uidBlock.start = uidBlock.start + num
	Documents.write(filename, sessionInfoDocument, function(err) {
		if (err) {
			sessionInfoDocument.clientUidBlock = oldUidBlock
			callback(err)
		} else {
			callback(null, firstClientUid)
		}
	})
}

function generateClientUids(opts) {
	opts = options(opts, { withGenerator:null, onDone:null })
	var count = 0
	var released = false
	opts.withGenerator(function() {
		if (released) { throw new Error("Client UID generator called after release") }
		return sessionInfoDocument.clientUidBlock.start + (count++)
	})
	released = true
	bumpClientUids(count, opts.onDone)
}

function checkNewVersion() {
	// api.get('api/version/info', function(err, res) {
	// 	if (err || !res.url) { return }
	// 	bridge.command('version.download', { url:res.url, headers:api.getHeaders() }, function(err) {
	// 		if (err) { alert('upgrade failed ' + err) }
	// 		else { alert("upgrade done") }
	// 	})
	// })
}

function _setDocument(document) {
	sessionInfoDocument = document
	if (!document) { return }
	each(properties, function(key) {
		sessionInfo[key] = document[key]
	})
}
