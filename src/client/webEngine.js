module.exports = {
	start:start,
	notify:notify
}

var messageHandler
function notify(event, info) {
	messageHandler({ event:event, info:info })
}

function start() {
	after(100, loadFbSdk)
	
	WebViewJavascriptBridge = {
		init:initBridge,
		callHandler:callHandler
	}
	
	var readyEvent = document.createEvent('Events')
	readyEvent.initEvent('WebViewJavascriptBridgeReady')
	readyEvent.bridge = WebViewJavascriptBridge
	document.dispatchEvent(readyEvent)
	
	function initBridge(_messageHandler) {
		messageHandler = _messageHandler
		nextTick(function() {
			notify('app.start', {
				client:'0.98.0-browser',
				config: gConfig = {
					device: { platform:'Chrome' },
					protocol: 'http:',
					serverHost:location.hostname,
					serverUrl:'http://'+location.host
				}
			})
		})
	}

	function callHandler(command, data, callback) {
		if (!callback && typeof data == 'function') {
			callback = data
			data = null
		}
		if (!commandHandlers[command]) {
			return callback('Unknown command: '+command)
		}
		commandHandlers[command](data, function(error, responseData) {
			callback({ error:error, responseData:responseData })
		})
	}
}

function justRespond(data, callback) { callback && nextTick(callback) }

var db
var commandHandlers = {
	'app.show': function(data, callback) {
		console.log('SHOW APP')
	},
	'app.restart': function(data, callback) {
		nextTick(function() { window.top.location = window.top.location })
	},
	'BTFiles.writeJsonDocument': _writeJson,
	'BTFiles.writeJsonCache': _writeJson,
	'BTFiles.readJsonDocument': _readJson,
	'BTFiles.readJsonCache': _readJson,
	'BTFiles.clearAll': function(data, callback) {
		localStorage.clear();
		asyncEach(['contact', 'message'], {
			finish:callback,
			iterate:function(table, callback) {
				commandHandlers['BTSql.update']({ sql:'DROP TABLE IF EXISTS '+table }, callback)
			}
		})
	},
	
	'BTTextInput.setConfig':function(data, callback) { nextTick(callback) },
	
	'BTCamera.show': justRespond,
	'BTCamera.hide': justRespond,
	
	'BT.setStatusBar': function(data, callback) {
		if (data.animation == 'slide') { $('#devClientStatusBar').css(translate(32, data.visible ? 0 : -20, 350)) }
		else { $('#devClientStatusBar').css({ display:data.visible ? 'block' : 'none' }) }
		nextTick(callback)
	},
	
	'BTAddressBook.countAllEntries':function(params, callback) { nextTick(function() { callback(null, { count:2 }) }) },
	'BTAddressBook.getAllEntries':getAllAddressBookEntries,
	
	'BTFacebook.connect': function(data, callback) {
		var params = { scope:data.permissions.join(',') }
		if (!window.FB) { return callback('devBridge FB unavailable') }
		FB.login(function(response) { callback(null, { facebookSession:response.authResponse }) }, params)
	},
	'BTFacebook.request': function(data, callback) {
		if (!window.FB) { return callback('devBridge FB unavailable') }
		FB.api(data.path, function(response) { callback(null, response) })
	},
	'push.register': function(data, callback) { callback(null, { pushToken:'DEV_BRIDGE_FAKE_TOKEN', pushType:'DEV_FAKE' }) },
	'message.send': function(data, callback) {
		data.url = api.getUrl('api/messageDev')
		api.sendRequest(data, callback)
	},
	
	'BTSql.openDatabase': function(data, callback) {
		var dbSize = 20*1024*1024 // 20 mb
		db = window.openDatabase(data.name, '1.0', 'Dogo database', dbSize)
		callback(db ? null : "Could not create database", null)
	},
	'BTSql.query': function(data, _callback) {
		function callback(err, res) {
			if (err) { err = new Error(err.message + '. '+JSON.stringify(data)) }
			_callback(err, res)
		}
		db.readTransaction(function(tx) {
			tx.executeSql(data.sql, data.arguments, function(tx, dbResult) {
				var rows = []
				for (var i=0; i<dbResult.rows.length; i++) {
					rows.push(dbResult.rows.item(i))
				}
				callback(null, { rows:rows })
			}, function onError(tx, err) { return callback(err, null) })
		})
	},
	'BTSql.update': function(data, _callback) {
		function callback(err, res) {
			if (err) { err = new Error(err.message + '. '+JSON.stringify(data)) }
			_callback(err, res)
		}
		db.transaction(function(tx) {
			tx.executeSql(data.sql, data.arguments, onSuccess, onError)
			function onSuccess(tx) { callback(null, null) }
			function onError(tx, err) {
				if (err && data.ignoreDuplicates && err.code == SQL_CONSTRAINT_ERROR) { err = null }
				callback(err, null)
			}
		})
	},
    'BTSql.insertMultiple': function(data, _callback) {
		function callback(err, res) {
			if (err) { err = new Error(err.message + '. '+JSON.stringify(data)) }
			_callback(err, res)
		}
		
		db.transaction(function(tx) {
			var i = -1
			next()
			function next() {
				i += 1
				if (i >= data.argumentsList.length) { return callback(null, null) }
				tx.executeSql(data.sql, data.argumentsList[i], next, onError)
			}
			function onError(tx, err) {
				if (err && data.ignoreDuplicates && err.code == SQL_CONSTRAINT_ERROR) { return next() }
				callback(err, null)
			}
		})
	},
	
	
	'_':function(){}
	// 'push.register': function(data, callback) {
	// 	callback(null)
	// },
	// 'BTFacebook.request': function(data, callback) {
	// 	FB.api(data.path, function(response) {
	// 		callback(null, response)
	// 	})
	// },
	// 'BTFacebook.dialog': function(data, callback) {
	// 	var params = data.params
	// 	FB.ui({ method:data.dialog, message:params.message, data:params.data, title:params.title, to:parseInt(params.to) }, function(res) {
	// 		events.fire('BTFacebook.dialogCompleteWithUrl', { url:'fake_fbconnect://success?request='+res.request })
	// 	})
	// },
	// 'BTFacebook.clear': function(data, callback) {
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

var SQL_CONSTRAINT_ERROR = 6

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

function getAllAddressBookEntries(params, callback) {
	nextTick(function() {
		var entries = [
			{ recordId:'devBridge'+tags.id(), name:'Marcus Westin', emailAddresses:['narcvs@gmail.com','marcus.westin@gmail.com'], phoneNumbers:['+1 (412) 423-8669','415-601-5654'] },
			{ recordId:'devBridge'+tags.id(), name:'Ashley Baker', emailAddresses:['ashleynkbaker@gmail.com'], phoneNumbers:['6319651971'] }
		]
		callback(null, { entries:entries })
	})
}

function loadFbSdk() {
	$(document.body).append(div({ id:'fb-root' }))
	window.fbAsyncInit = function() {
		FB.init({
			appId      : '219049001532833', // App ID
			status     : false, // check login status
			cookie     : false, // enable cookies to allow the server to access the session
			xfbml      : false  // parse XFBML
		})
	};

	var d = document
	var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
	if (d.getElementById(id)) {return;}
	js = d.createElement('script'); js.id = id; js.async = true;
	js.src = "//connect.facebook.net/en_US/all.js";
	ref.parentNode.insertBefore(js, ref);
}
