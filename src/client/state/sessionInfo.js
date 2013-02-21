var sessionInfo = module.exports = {
	load:load,
	getClientUid:getClientUid,
	save:save,
	clear:clear,
	checkNewVersion:checkNewVersion
}

var sessionInfoDocument = null
var filename = 'DogoSessionInfo'
var properties = ['authToken', 'person', 'clientUidBlock', 'config']

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
	var uidBlock = sessionInfoDocument.clientUidBlock
	if (uidBlock.start == uidBlock.end) {
		return callback("We're sorry, you must re-install the app to send more messages. Our bad!")
	}
	
	var newClientUid = uidBlock.start = uidBlock.start + 1
	Documents.write(filename, sessionInfoDocument, function(err) {
		if (err) { return callback(err) }
		callback(null, newClientUid)
	})
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
