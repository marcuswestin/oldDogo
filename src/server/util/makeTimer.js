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
	if (!timers[name]) { console.log("WARNING timer.stop:", name); return this }
	timers[name].total += now() - timers[name].start
	delete timers[name].start
	return this
}

function report() {
	return 'Time:'+(now() - this.t0)+'ms (' + map(this.timers, function(timer, name) {
		return name + '*' + timer.count + ':' + timer.total + 'ms'
	}).join(', ')+')'
}

