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
		commandHandlers[command](data, callback || function(){})
	}
}

function justRespond(data, callback) { callback && nextTick(callback) }

var db

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
	'BTFiles.clearAll': function(data, callback) {
		localStorage.clear();
		commandHandlers['BTSql.update']({ sql:'DROP TABLE contact' }, function(err) { callback(err) })
	},
	
	'BTTextInput.setConfig':function(data, callback) { nextTick(callback) },
	
	'BTCamera.show': justRespond,
	'BTCamera.hide': justRespond,
	
	'BT.setStatusBar': function(data, callback) {
		if (data.animation == 'slide') { $('#devClientStatusBar').css(translate(32, data.visible ? 0 : -20, 350)) }
		else { $('#devClientStatusBar').css({ display:data.visible ? 'block' : 'none' }) }
		nextTick(callback)
	},
	
	'BTAddressBook.getAllEntries':getAllAddressBookEntries,
	
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
	
	'BTSql.openDatabase': function(data, callback) {
		var dbSize = 20*1024*1024 // 20 mb
		db = window.openDatabase(data.name, '1.0', 'Dogo database', dbSize)
		callback(db ? null : "Could not create database", null)
	},
	'BTSql.query': function(data, callback) {
		db.readTransaction(function(tx) {
			console.log("HERE", data.sql, data.arguments)
			tx.executeSql(data.sql, data.arguments, function(tx, dbResult) {
				var rows = []
				for (var i=0; i<dbResult.rows.length; i++) {
					rows.push(dbResult.rows.item(i))
				}
				callback(null, { rows:rows })
			}, function onError(tx, err) { return callback(err, null) })
		})
	},
	'BTSql.update': function(data, callback) {
		db.transaction(function(tx) {
			tx.executeSql(data.sql, data.arguments, onSuccess, onError)
			function onSuccess(tx) { callback(null, null) }
			function onError(tx, err) { callback(err, null) }
		})
	},
    'BTSql.insertMultiple': function(data, callback) {
		var CONSTRAINT_ERR = 6
		db.transaction(function(tx) {
			var i = -1
			next()
			function next() {
				i += 1
				if (i >= data.argumentsList.length) { return callback(null, null) }
				tx.executeSql(data.sql, data.argumentsList[i], next, onError)
			}
			function onError(tx, err) {
				if (err && data.ignoreDuplicates && err.code == CONSTRAINT_ERR) { return next() }
				callback(err, null)
			}
		})
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

function getAllAddressBookEntries(data, callback) {
	nextTick(function() {
		var entries = [
			{ name:'Marcus Westin', emailAddresses:['narcvs@gmail.com','marcus.westin@gmail.com'], phoneNumbers:['+1 (412) 423-8669','415-601-5654'] },
			{ name:'Ashley Baker', emailAddresses:['ashleynkbaker@gmail.com'], phoneNumbers:['6319651971'] }
		]
		callback(null, { entries:entries })
	})
}
