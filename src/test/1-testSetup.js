require('server/globals')
require('./globals')

var config = require('server/config/test/testConfig')

;(function(){
	for (var i=0, arg; arg=process.argv[i]; i++) {
		if (arg == '--dogo-test-online=false') {
			require('test/enableOfflineMode')
		}
		if (arg == '--dogo-test-verbose=false') {
			require('server/util/log').doLog = function() { /* ignore */ }
		}
		if (arg == '--dogo-test-time=false') {
			require('server/util/makeTimer').disable()
		}
	}
}())

setup('Example test', function() {
	then('run it', function(done) {
		check(null)
		is(true)
		done()
	})
})

setup('API server', function() {
	then('start it', function(done) {
		require('server/configureServer')(config)
		done()
	})
	then('ping it', function(done) {
		api.get('api/ping', done)
	})
})

process.nextTick(function() {
	tinyTest.run({
		onTestStart:function(stack) { console.log("Test:".white, stack.join(' | ').cyan) },
		onTestDone: function(stack, duration) { console.log('Done: '.white, (duration+'ms').greenLight) },
		onTestFail: function(stack, err) { console.error("ERROR".red, stack.join(' | ').red, err) },
		onAllDone: function(duration) {
			console.log("All Done:".green, (duration+'ms').greenLight)
			process.exit(0)
		}
	})
})

// function checkConnectionLeaks(done) {
// 	var db = u.database
// 	assert.equal(db._queue.length, 0, 'There are still queries in the queue')
// 	assert.equal(db._pool.length, db._poolSize, (db._poolSize - db._pool.length) + ' connection(s) leaked!!')
// 	done()
// }
