var tinyTest = require('tinyTest/tinyTest')
var describe = tinyTest.describe
var then = tinyTest.then
var is = tinyTest.is
var waitFor = tinyTest.waitFor
var tap = tinyTest.tap

module.exports = {
	run:run
}

describe('Connect:', function() {
	then('click connect button', function(done) {
		tap('.connect.button', done)
	})
	then('click no notifications link', function(done) {
		tap('.noNotifications.link', done)
	})
})

function run() {
	tinyTest.run({
		onTestStart:function(name) { console.log("Test:", name) },
		onTestDone: function(name, duration) { console.log(duration+'ms') },
		onTestFail: function(name, err) { console.log("ERROR", name, err) },
		onAllDone: function(duration) { console.log("Done:", duration+'ms') }
	})
}
