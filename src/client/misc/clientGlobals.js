require('lib/jquery-1.8.1')
require('client/misc/events')

options = require('std/options')
create = require('std/create')
proto = require('std/proto')
map = require('std/map')
bind = require('std/bind')
each = require('std/each')
slice = require('std/slice')
curry = require('std/curry')
filter = require('std/filter')
flatten = require('std/flatten')
parseUrl = require('std/url')
clip = require('std/clip')
find = require('std/find')
trim = require('std/trim')
merge = require('std/merge')
nextTick = require('std/nextTick')
delayed = require('std/delayed')
parallel = require('std/parallel')
rand = require('std/rand')
sum = require('std/sum')
time = require('std/time')
now = function() { return Math.floor(time.now() / time.second) }
isArray = require('std/isArray')
inverse = require('std/inverse')
copy = require('std/copy')
asyncEach = require('std/asyncEach')
asyncMap = require('std/asyncMap')
repeat = require('std/repeat')
last = require('std/last')

Documents = require('client/state/Documents')
Caches = require('client/state/Caches')
sessionInfo = require('client/state/sessionInfo')
Conversations = require('client/state/Conversations')
Contacts = require('client/state/Contacts')

api = require('client/misc/api')
bridge = require('client/misc/bridge')
face = require('client/misc/face')
paint = require('client/misc/paint')
error = require('client/misc/error')
markFirstCall = require('./markFirstCall')
px = require('client/misc/px')
gradient = require('client/misc/gradient')
BT = require('client/misc/BT')
graphics = require('client/misc/graphics')
graphic = graphics.graphic

toggleUnitGrid = require('./dev/toggleUnitGrid')
clearState = require('./dev/clearState')

Addresses = require('data/Addresses')
Payloads = require('data/Payloads')
DogoText = require('data/DogoText')
Messages = require('data/Messages')
Colors = require('data/Colors')
Colors.exposeGlobals()

tags = require('tags')
require('tags/jquery-tags')
button = require('tags/button')
makeList = require('tags/list')
style = require('tags/style')
makeScroller = require('tags/scroller')
draggable = require('tags/draggable')
overlay = ovarlay = require('tags/overlay')
tooltip = require('tags/tooltip')
viewport = require('tags/viewport')
link = require('tags/link')
link.defaultTarget = '_blank'

div = tags('div')
span = tags('span')
a = tags('a')
input = tags('input')
img = tags('img')
canvas = tags('canvas')
label = tags('label')
br = tags.br
html = tags.html

translate = style.translate
transition = style.transition
scrollable = style.scrollable
absolute = function(left, top) { return { position:'absolute', left:left, top:top } }
fixed = function(left, top) { return { position:'fixed', left:left, top:top } }

bold = { fontWeight:'bold' }
italic = { fontStyle:'italic' }
underline = { textDecoration:'underline' }
radius = function() { return { borderRadius:px.apply(this, arguments) } }
floatLeft = { 'float':'left' }
floatRight = { 'float':'right' }
unitPadding = function() { return { padding:px.apply(this, map(arguments, function(p) { return p*unit })) } }
unitMargin = function() { return { margin:px.apply(this, map(arguments, function(p) { return p*unit })) } }
fullHeight = fillHeight = { height:'100%' }
fullWidth = fillWidth = { width:'100%' }

var ulTag = tags('ul')
var liTag = tags('li')
ul = function() { return ulTag(map(arguments, function(content) { return liTag('tags-ul-li', content) })) }

spacing = 8
remove = function(obj, prop) { var val = obj[prop]; delete obj[prop]; return val }
after = function(duration, fn) { setTimeout(fn, duration) }
gConfigure = function(config) { payloads.configure(config.payloads) }

listMenuIcon = function(graphicName) {
	return graphic(graphicName, 20, 20, translate.y(2), { 'float':'left', margin:px(0,unit/2) })
}
listMenuContent = function(graphicName, label) {
	return [ listMenuIcon(graphicName), listMenuArrow, span(style({ paddingLeft:unit }), label) ]
}

events.on('app.start', function() {
	viewport.element = $('#viewport')
	
	listMenuArrow = div(graphic('listMenuArrow', 16, 16), style({ 'float':'right' }, translate(0, 3)))
	connectButton = [style({ display:'block', padding:px(unit*1.5), margin:px(2*unit, 4*unit), border:'1px solid rgba(255,255,255,.5)' }), listMenuArrow]

	events.on('app.error', function(info) {
		api.post('api/log/app/error', info, function(){})
	})
	var oldLog = console.log
	console.log = function() {
		oldLog.apply(console, arguments)
		api.post('api/log/app/console', { args:slice(arguments, 0) }, function(){})
	}
})
