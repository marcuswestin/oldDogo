module.exports = {
	setup:setupDevBridge
}

function setupDevBridge() {
	bridge.command = function onBridgeCommand(command, data, callback) {
		if (!callback && typeof data == 'function') {
			callback = data
			data = null
		}
		if (!commandHandlers[command]) {
			return console.log("WARN", 'Unknown bridge command', command)
		}
		commandHandlers[command](data, callback)
	}
}

function justRespond(data, callback) { callback && nextTick(callback) }

var commandHandlers = {
	'app.show': function(data, callback) {
		console.log('SHOW APP')
	},
	'app.restart': function(data, callback) {
		nextTick(function() { location.reload() })
	},
	'BTFiles.writeJsonDocument': _writeJson,
	'BTFiles.writeJsonCache': _writeJson,
	'BTFiles.readJsonDocument': _readJson,
	'BTFiles.readJsonCache': _readJson,
	'BTFiles.clearAll': function(data, callback) { localStorage.clear(); nextTick(callback) },
	
	'BTCamera.show': justRespond,
	'BTCamera.hide': justRespond,
	
	'BTAddressBook.getAllEntries':function(data, callback) {
		nextTick(function() { callback(null, { entries:[] }) })
	},
	
	'facebook.connect': function(data, callback) {
		var params = { scope:data.permissions.join(',') }
		FB.login(function(response) { callback(null, { facebookSession:response.authResponse }) }, params)
	},
	'facebook.request': function(data, callback) {
		FB.api(data.path, function(response) { callback(null, response) })
	},
	'push.register': function(data, callback) { callback(null, { deviceToken:'DEV_BRIDGE_FAKE_TOKEN' }) },
	'text.send': function(data, callback) {
		data.url = api.getUrl('api/messageDev')
		api.sendRequest(data, callback)
	},
	
	'_':function(){}
	// 'push.register': function(data, callback) {
	// 	callback(null)
	// },
	// 'facebook.request': function(data, callback) {
	// 	FB.api(data.path, function(response) {
	// 		callback(null, response)
	// 	})
	// },
	// 'facebook.dialog': function(data, callback) {
	// 	var params = data.params
	// 	FB.ui({ method:data.dialog, message:params.message, data:params.data, title:params.title, to:parseInt(params.to) }, function(res) {
	// 		events.fire('facebook.dialogCompleteWithUrl', { url:'fake_fbconnect://success?request='+res.request })
	// 	})
	// },
	// 'facebook.clear': function(data, callback) {
	// 	callback(null)
	// },
	// 'app.restart': function(data, callback) {
	// 	location.reload()
	// },
	// 'state.clear': function(data, callback) {
	// 	setTimeout(function() {
	// 		localStorage.clear()
	// 		callback()
	// 	})
	// },
	// 'index.build': function(data, callback) {
	// 	index.build(data)
	// },
	// 'index.lookup': function(data, callback) {
	// 	index.lookup(data, callback)
	// },
	// 'textInput.show': function(data, callback) {
	// 	textInput.show(data)
	// },
	// 'textInput.animate': function(data, callback) {
	// 	textInput.animate(data)
	// },
	// 'textInput.set': function(data, callback) {
	// 	textInput.set(data)
	// },
	// 'textInput.hide': function(data, callback) {
	// 	textInput.hide()
	// },
	// 'net.request': function(data, callback) {
	// 	api.sendRequest({ url:data.path, params:data.params, method:data.method, headers:data.headers, callback:callback })
	// },
	// 'textInput.hideKeyboard': function(data, callback) {
	// 	textInput.hideKeyboard()
	// },
	// 'viewport.putOverKeyboard': function(data, callback) {
	// 	$('#fakeIPhoneKeyboard').hide()
	// },
	// 'viewport.putUnderKeyboard': function(data, callback) {
	// 	$('#fakeIPhoneKeyboard').show()
	// },
	// 'text.send': function(data, callback) {
	// 	data.url = api.getUrl('api/messageDev')
	// 	api.sendRequest(data, callback)
	// }
}

function _writeJson(data, callback) {
	nextTick(function() {
		localStorage[data.filename] = JSON.stringify(data.jsonValue)
		callback && callback()
	})
}
function _readJson(data, callback) {
	nextTick(function() {
		var jsonValue
		try { jsonValue = JSON.parse(localStorage[data.filename]) } catch(e) { jsonValue = null }
		callback(null, jsonValue)
	})
}
