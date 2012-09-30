require('color')

module.exports = makeTimer

function makeTimer(name) { return doMakeTimer(name) }

var doMakeTimer = function(name) {
	return {
		name:name,
		t0:now(),
		timers:{},
		start:start,
		stop:stop,
		report:report
	}
}

makeTimer.dummy = { start:nop, stop:nop, report:nop }

makeTimer.disable = function() {
	doMakeTimer = function() { return makeTimer.dummy }
}

function now() { return new Date().getTime() }

function start(name) {
	var timers = this.timers
	if (!timers[name]) {
		timers[name] = { total:0, count:0 }
	}
	timers[name].start = now()
	timers[name].count += 1
	return this
}

function stop(name) {
	var timers = this.timers
	timers[name].total += now() - timers[name].start
	delete timers[name].start
	return this
}

function report() {
	console.log('\nTimer report:', this.name)
	console.log('Total time:', now() - this.t0+'ms')
	for (var name in this.timers) {
		var timer = this.timers[name]
		console.log('\t', name+':', timer.total+'ms', timer.count > 1 ? '('+timer.count+' times)' : '')
	}
}

