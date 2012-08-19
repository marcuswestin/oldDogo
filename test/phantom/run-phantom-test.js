var system = require('system');
if (system.args.length === 1) {
	console.log('Try to pass some args when invoking this script!');
} else {
	system.args.forEach(function (arg, i) {
		console.log(i + ': ' + arg);
	});
}

var page = require('webpage').create();
page.onError = function(msg, trace) {
	console.error("Phantom error:", msg, trace)
	trace.forEach(function(item) {
		console.log('  ', item.file, ':', item.line);
	})
}
page.onConsoleMessage = function (msg) {
	console.log('console.log', JSON.stringify(msg))
}

var url = 'http://marcus.local:9000/app.html'
page.open(url, function (status) {
	page.includeJs('http://marcus.local:9000/require/src/client/dogo', function() {
		console.log("OPenened url", url)
		phantom.exit();
	})
});

page.onPrompt = function() {
	setTimeout(function() {
		page.evaluate(function() {
			$('#connectButton').click()
		})
	})
	return "Cool"
}