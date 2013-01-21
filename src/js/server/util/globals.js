proto = require('std/proto')
create = require('std/create')
each = require('std/each')
map = require('std/map')
bind = require('std/bind')
slice = require('std/slice')
options = require('std/options')
_ = require('underscore')
filter = require('std/filter')
serialMap = require('std/serialMap')

ListPromise = require('std/ListPromise')

makeTimer = require('./makeTimer')
makeLog = require('./log').makeLog
log = makeLog('Global')

getId = function(model) {
	return typeof model == 'number' ? model : model.id
}

logError = logErr = function logError(err, callback /* , args ... */) {
	var args = slice(arguments, 2)
	log.error('Error:', args, err.stack || err.message || err)
	if (typeof callback == 'function') {
		callback(err, null)
	} else {
		log.error("SHIT SHIT SHIT, logErr callback stack hanging!!!")
	}
}

// https://gist.github.com/3428346
;(function colorizeNode(){
	var colors = { red:31, green:32, blue:34, yellow:33, pink:35, cyan:36, black:30, white:37 }
	var colorResetNum = 39
	var styles = { underline:[4,24], inverse:[7,27] }
	for (var colorName in colors) {
		addPrototypeProperty(colorName, colors[colorName], colorResetNum)
	}
	for (var styleName in styles) {
		addPrototypeProperty(styleName, styles[styleName][0], styles[styleName][1])
	}
	function getCode(num) { return '\033['+num+'m' }
	function addPrototypeProperty(name, startNum, resetNum) {
		Object.defineProperty(String.prototype, name, {
			get: function() {
				return getCode(startNum) + this + getCode(resetNum)
			}
		})
	}
	// // Test
	// for (var colorName in colors) { console.log(colorName[colorName], 'reset')
	// 	for (var styleName in styles) { console.log((colorName+'+'+styleName)[colorName][styleName], 'reset') }
	// }
}())
