require('../globals')

window.onerror = function(e) { alert('error ' + e) }

var drawer = require('../ui/drawer')

var $buttons = $(div())
each([-180, -90, 0, 90, 180], function(deg) {
	$buttons.append(div(style({ padding:10 }), 'Rotate: ', deg, button(function() {
		events.fire('device.rotated', { deg:deg })
	})))
})
$('body').append($buttons)

$('body').append(div(
	drawer.render()
))//.find('.draw').css({ margin:'0 0 1200px 0' })


