require('lib/jquery-1.7.2')
require('lib/raphael-2.1.0')
require('tags')
style = require('tags/style')
slice = require('std/slice')

tags.expose('div')

Raphael.fn.colorPickerIcon = function (x, y, r) {
	var pi = Math.PI;
    var segments = pi * r * 2 / Math.min(r / 8, 4);
    var a = pi / 2 - pi * 2 / segments * 1.5,
        path = ["M", x, y - r, "A", r, r, 0, 0, 1, r * Math.cos(a) + x, y - r * Math.sin(a), "L", x, y, "z"].join();
    for (var i = 0; i < segments; i++) {
        this.path(path).attr({
            stroke: "none",
            fill: "hsb(" + (segments - i) * (255 / segments) / 255 + ", 1, 1)",
            transform: "r" + [90 + (360 / segments) * i, x, y]
        });
    }
    return this.circle(x, y, r).attr({
        fill: "r#fff-#fff",
        "fill-opacity": 0,
        "stroke-width": Math.round(r * .03),
        stroke: "#fff"
    });
};

function fontSize(size) {
	return style({ fontSize:size })
}

function abs(top, left) {
	return style({ position:'absolute', top:top, left:left })
}

function graphic(w, h, content) {
	return div(
		div('subtitle', w,'x',h),
		div(style({ position:'relative', width:w, height:h, border:'3px solid blue', margin:10 }),
			content
		)
	)
}

function section(className, title /*, content ... */) {
	return div('section ' + className,
		div('title', title),
		slice(arguments, 2)
	)
}

function svg(w, h, callback) {
	return graphic(w, h, function($tag) {
		var paper = Raphael(0, 0, w, h)
		callback(paper)
		return paper.canvas
	})
}

$(function() {
	
	$('.sections').append(
		section('icons red-linen', 'Icons',
			graphic(57, 57,
				div('logo', 'Dogo', fontSize(27), abs(7, 0))
			),
			graphic(114, 114,
				div('logo', 'Dogo', fontSize(54), abs(15, 0))
			),
			div('title', 'Splash Screens'),
			graphic(320,480,
				div('logo', 'Dogo', fontSize(135), abs(122, 21))
			),
			graphic(640,960,
				div('logo', 'Dogo', fontSize(280), abs(196, 30))
			)
		),
		section('pickers', 'Pickers',	
			div('subtitle', 'Multi-color'),
			svg(100, 100, function(paper) {
				paper.colorPickerIcon(50, 50, 50)
			})
		)
	)
})
