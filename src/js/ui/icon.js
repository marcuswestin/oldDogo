var graphic = require('./graphic')

module.exports = graphic

function graphic(name, width, height, paddingTop, paddingRight, paddingBottom, paddingLeft) {
	if (paddingTop == null) { paddingTop = 0 }
	if (paddingRight == null) { paddingRight = 0 }
	if (paddingBottom == null) { paddingBottom = paddingTop }
	if (paddingLeft == null) { paddingLeft = paddingRight }
	return div('icon', style({
		width:width,
		height:height,
		background:'transparent '+px(paddingLeft, paddingTop)+' no-repeat',
		backgroundImage:graphic.background(name, width, height),
		backgroundSize:px(width, height),
		padding:px(paddingTop, paddingRight, paddingBottom, paddingLeft)
	}))
}

// icon.preload = function preloadIcon(icons) {
// 	var result = {}
// 	var cache = {}
// 	events.on('appScroller.rendered', function() {
// 		if (!$('#preloadDiv')[0]) {
// 			$('#dogoApp').append(div({ id:'preloadDiv' }, style({ position:'absolute', top:-9999, left:-9999 })))
// 		}
// 		each(icons, function(iconArgs, name) {
// 			cache[name] = icon.apply(this, iconArgs)
// 			$('#preloadDiv').append(cache[name])
// 			result[name] = function() {
// 				var id = tags.id()
// 				setTimeout(function() {
// 					$('#'+id).replaceWith(cache[name])
// 				})
// 				return div('icon', { id:id })
// 			}
// 		})
// 	})
// 	return result
// }
