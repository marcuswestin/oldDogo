var documents = require('./documents')

var sessionInfoDocument = null
var filename = 'DogoSessionInfo'

var sessionInfo = module.exports = {
	load:load,
	getClientUid:getClientUid,
	save:save,
	checkNewVersion:checkNewVersion
}

function load(callback) {
	Documents.read(filename, function(err, document) {
		sessionInfoDocument = document
		for (var key in document) { sessionInfo[key] = document[key] }
		callback(err, null)
	})
}

function save(sessionInfoObj, callback) {
	Documents.write(filename, sessionInfoObj, function(err) {
		callback && callback(err)
		if (err) { return error(err) }
		events.fire('user.session', sessionInfoObj)
	})
}

function getClientUid(callback) {
	var uidBlock = sessionInfoDocument.clientUidBlock
	if (uidBlock.start == uidBlock.end) {
		return callback("We're sorry, you must re-install the app to send more messages. Our bad!")
	}
	
	var newClientUid = uidBlock.start = uidBlock.start + 1
	Documents.write(filename, sessionInfoDocument, function(err) {
		callback(err, newClientUid)
	})
}

function checkNewVersion() {
	api.get('api/version/info', function(err, res) {
		if (err || !res.url) { return }
		bridge.command('version.download', { url:res.url, headers:api.getHeaders() }, function(err) {
			if (err) { alert('upgrade failed ' + err) }
			else { alert("upgrade done") }
		})
	})
}
