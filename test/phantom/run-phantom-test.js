var system = require('system');
if (system.args.length === 1) {
	console.log('Try to pass some args when invoking this script!');
} else {
	system.args.forEach(function (arg, i) {
		console.log(i + ': ' + arg);
	});
}

var page = require('webpage').create();

var url = 'http://marcus.local:9000/app.html'
page.open(url, function (status) {
	page.includeJs('http://marcus.local:9000/require/src/client/dogo', function() {
		console.log("OPenened url", url)
		page.evaluate(function() {
			document.addEventListener('PhantomStartTest', function() {
				function waitFor(selector, callback) {
					console.log("WAITFOR", window, typeof window.$)
					var test = function() {
						var $res = $(selector)
						console.log("Test", selector, $res.length)
						if ($res.length) { callback($res) }
						else { setTimeout(test, 50) }
					}
					test()
				}
				
				waitFor('.home', function() {
					prompt("DONE")
				})
			})
		})
	})
})

var red = '\033[31m'
var green = '\033[32m'
var reset = '\033[0m'
var gray = '\033[1;30m'
page.onError = function(msg, trace) {
	console.error(red, "Phantom error:", msg, trace)
	trace.forEach(function(item) {
		console.log('  ', item.file, ':', item.line);
	})
	console.log(reset)
	phantom.exit()
}

page.onConsoleMessage = function (msg) {
	console.log(gray, 'console.log', JSON.stringify(msg), reset)
}

page.onPrompt = function() {
	console.log(green, "\nAll phantom tests passed", reset)
	phantom.exit()
}
