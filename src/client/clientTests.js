var tinyTest = require('tinyTest/tinyTest')
var describe = tinyTest.describe
var then = tinyTest.then
var is = tinyTest.is
var waitFor = tinyTest.waitFor
var tap = tinyTest.tap
var count = tinyTest.count

module.exports = {
	runConnectTests:runConnectTests,
	runUsageTests:runUsageTests
}

$.expr[":"].text = function(obj, index, meta, stack) {
	return (obj.textContent || obj.innerText || $(obj).text() || "").toLowerCase() == meta[3].toLowerCase()
}

function runUsageTests() {
	
	describe('Sending a message', function() {
		then('tap the first conversation', function(done) {
			tap('.homeView .conversations .conversation:first', function() {
				done()
			})
		})
		var numMessages
		then('count the number of messages', function(done) {
			count('.conversationView .messageBubble', function(_numMessages) {
				numMessages = _numMessages
				done()
			})
		})
		var messageBody = 'Hi there '+new Date().getTime()+'!'
		then('send a text message', function(done) {
			tap('.composer .button.write', function() {
				setTimeout(function() {
					events.fire('textInput.return', { text:messageBody })
				}, 100)
				waitFor('.conversationView .messageBubble .textContent:text("'+messageBody+'")', function() {
					count('.conversationView .messageBubble', function(newNumMessages) {
						is(numMessages + 1, newNumMessages)
						done()
					})
				})
			})
		})
		then('close the text input tool', function(done) {
			tap('.composer .closeTextInput', function() {
				done()
			})
		})
	})
	
	run()
}

function runConnectTests() {

	describe('Connect:', function() {
		then('click connect button', function(done) {
			tap('.connect.button', function() {
				events.on('app.connected', done)
			})
		})
		then('click no notifications link', function(done) {
			tap('.noNotifications.link', done)
		})
	})
	
	run()
}

function run() {
	disableAlerts()
	tinyTest.run({
		onTestStart:function(name) { console.log("Test:", name) },
		onTestDone: function(name, duration) { console.log(duration+'ms') },
		onTestFail: function(name, err) { console.log("ERROR", name, err) },
		onAllDone: function(duration) {
			console.log("Done:", duration+'ms')
			disableAlerts.reset()
		}
	})
}

function disableAlerts() {
	disableAlerts.oldAlert = window.alert
	disableAlerts.oldConfirm = window.confirm
	// window.alert = function(arg) { console.log('alert:', arg) }
	window.confirm = function() { return true }
}
disableAlerts.reset = function() {
	window.alert = disableAlerts.oldAlert
	window.confirm = disableAlerts.oldConfirm
}
