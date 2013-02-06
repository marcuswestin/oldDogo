require('./globals')

var config = require('server/config/test/testConfig')

;(function(){
	for (var i=0, arg; arg=process.argv[i]; i++) {
		if (arg == '--dogo-test-offline=true') {
			require('./enableOfflineMode')
		}
		if (arg == '--dogo-test-verbose=false') {
			log.disable()
		}
		if (arg == '--dogo-test-time=false') {
			require('server/util/makeTimer').disable()
		}
	}
}())

process.nextTick(function() {
	tinyTest.run({
		onTestStart:function(stack) { console.log("Test:".white, stack.join(' | ').white) },
		onTestDone: function(stack, duration) {
			var durationStr = duration < 50 ? (duration+'ms').greenLight
				: duration < 200 ? (duration+'ms').yellowLight
				: (duration+'ms').redLight
			console.log('Done: '.white, durationStr)
		},
		onTestFail: function(stack, err) { console.error("ERROR".red, stack.join(' | ').red, err) },
		onAllDone: function(duration) {
			console.log("All Done:".green, (duration+'ms').greenLight)
			process.exit(0)
		}
	})
})

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

// function checkConnectionLeaks(done) {
// 	var db = u.database
// 	assert.equal(db._queue.length, 0, 'There are still queries in the queue')
// 	assert.equal(db._pool.length, db._poolSize, (db._poolSize - db._pool.length) + ' connection(s) leaked!!')
// 	done()
// }
