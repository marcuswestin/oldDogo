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

function waitOn(opts, fn) {
	var count = opts.count
	var checkErrors = (opts.checkErrors !== false)
	var didFail = false
	return function release(err) {
		if (didFail) { return }
		if (checkErrors && err) {
			didFail = true
			return fn(err)
		}
		count -= 1
		if (count < 0) { return console.log("WARNING: waitOn release function called too many times!") }
		if (count) { return }
		fn(null)
	}
}

var events = tags.isTouch
	? { start:'touchstart', move:'touchmove', end:'touchend' }
	: { start:'mousedown', move:'mousemove', end:'mouseup' }

function draw(selector, points, fn) {
	var $el = $(selector)

	function makeEvent(pos, type) {
		var $event = $.Event(type)
		var coords = $event.originalEvent = {}
		if (tags.isTouch) {
			$event.originalEvent = {
				changedTouches: [{ pageX:pos[0], pageY:pos[1] }]
			}
		} else {
			var offset = $el.offset()
			$event.originalEvent = { pageX:offset.left+pos[0], pageY:offset.top+pos[1] }
		}
		return $event
	}
	
	var $event0 = makeEvent(points.shift(), events.start)
	$el.trigger($event0)
	nextPoint()
	function nextPoint() {
		if (!points.length) { return fn() }
		var type = points.length > 1 ? events.move : events.end
		$el.trigger(makeEvent(points.shift(), type))
		setTimeout(nextPoint, 50)
	}
}

function runUsageTests() {
	
	var numMessages = 0
	describe('Pick a conversation', function() {
		then('tap the first conversation', function(done) {
			tap('.homeView .conversations .conversation:first', function() {
				done()
			})
		})
		then('count the number of messages', function(done) {
			count('#conversationView .messageBubble', function(_numMessages) {
				numMessages = _numMessages
				done()
			})
		})
	})
	describe('Send a text message', function() {
		var messageBody = 'Hi there '+new Date().getTime()+'!'
		then('write and send', function(done) {
			tap('#composer .button.write', function() {
				var release = waitOn({ count:2, checkErrors:false }, done)
				events.fire('textInput.return', { text:messageBody })
				events.once('message.sent', release)
				waitFor('#conversationView .messageBubble .textContent:text("'+messageBody+'")', function() {
					count('#conversationView .messageBubble', function(newNumMessages) {
						is(numMessages + 1, newNumMessages)
						numMessages = newNumMessages
						release()
					})
				})
			})
		})
		then('close the text input', function(done) {
			tap('#composer .closeTextInput', function() {
				done()
			})
		})
	})
	describe('Send a drawing', function() {
		then('draw something', function(done) {
			this.timeout = 0
			tap('#composer .draw.button', function() {
				draw('.drawer .paint', [[10,10], [40,40], [200,10], [500,300], [100,100], [25,300], [150,50]], done)
			})
		})
		then('send it', function(done) {
			tap('.drawer .controls .send.button', function() {
				count('#conversationView .messageBubble', function(newNumMessages) {
					is(numMessages + 1, newNumMessages)
					numMessages = newNumMessages
					var size = getSize('#conversationView .messageBubble .pictureContent:last')
					is(size[0] > 100)
					is(size[1] > 100)
					done()
				})
			})
		})
	})
	
	run()
}

function runConnectTests() {

	describe('Connect:', function() {
		then('click connect button', function(done) {
			this.timeout = 0
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
		onTestStart:function(name) { console.warn("Test:", name) },
		onTestDone: function(name, duration) { console.warn(duration+'ms') },
		onTestFail: function(name, err) { console.error("ERROR", name, err) },
		onAllDone: function(duration) {
			console.warn("Done:", duration+'ms')
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
