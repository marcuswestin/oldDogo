var system = require('system');

if (system.args.length === 1) {
	console.log('Try to pass some args when invoking this script!');
} else {
	system.args.forEach(function (arg, i) {
		console.log(i + ': ' + arg);
	});
}

var page = require('webpage').create();

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
	page.render('phantom-screen.png');
	phantom.exit()
}

var url = 'http://marcus.local:9000/app.html'
page.open(url, function (status) {
	page.includeJs('http://marcus.local:9000/require/src/client/dogo', function() {
		console.log("OPenened url", url)
		page.evaluate(function() {
			document.addEventListener('PhantomStartTest', function() {
				/* TEST UTILS
				 ************/
				function waitFor(selector, callback) {
					var test = function() {
						var $res = $(selector)
						if ($res.length) { callback($res) }
						else { setTimeout(test, 50) }
					}
					test()
				}
				function onDone() {
					prompt("DONE")
				}
				function is(a, b) {
					if (arguments.length == 1) {
						if (!a) { throw new Error('is check failed') }
					} else {
						if (a != b) { throw new Error('is check failed: ' + a + ' != ' + b) }
					}
				}
				
				/* TESTS
				 *******/
				waitFor('.home .conversations', function($conversations) {
					is($conversations.length)
					setTimeout(function() {
						var $event = jQuery.Event("touchstart");
						$event.originalEvent = { touches: [{ fakePhantomTouchEvent:true }] }
						$($conversations.find('.list-item')[0]).trigger($event).trigger('touchend')
						waitFor('.conversation', function($conversation) {
							onDone()
						})
					}, 100)
				})
			})
		})
	})
})
