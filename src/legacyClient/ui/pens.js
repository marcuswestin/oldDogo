var splines = require('./pens/splines')

var pens = module.exports

var basePen = {
	rgba: function(alpha) {
		return this.colorPicker.getColor(alpha)
	},
	handleDown:function(point) {
		this.down(point)
		return this
	},
	handleMove:function(point) {
		this.move(point)
		return this
	},
	handleUp:function(point) {
		this.up(point)
		return this
	},
	distance: function(p1, p2) {
		var dx = p1[0] - p2[0]
		var dy = p1[1] - p2[1]
		return Math.sqrt(dx*dx + dy*dy)
	},
	slope: function(from, to) {
		var dx = to[0] - from[0]
		var dy = to[1] - from[1]
		return dy / dx
	},
	sub: function(p1, p2) {
		return [p1[0] - p2[0], p1[1] - p2[1]]
	},
	add: function(p1, p2) {
		return [p1[0] + p2[0], p1[1] + p2[1]]
	},
	dot:function(p,t) {
		this.paint.beginPath().dot(p, t).fill()
	},
	line:function(p1,p2,thickness) {
		this.paint.beginPath().lineWidth(thickness || 1).line(p1,p2).stroke()
	}
}

var collectPointsPen = create(basePen, {
	handleDown:function(point) {
		this.points = [point]
		this.down(point, this.points)
		return this
	},
	handleMove:function(point) {
		if (!this.points) { return }
		this.points.push(point)
		this.move(point, this.points)
		return this
	},
	handleUp:function(point) {
		if (!this.points) { return }
		this.points.push(point)
		this.up(point, this.points)
		this.points = null
		return this
	}
})

var initPen = function(opts) {
	this.colorPicker = opts.colorPicker
	this.paint = opts.paint
}

var fillIn = proto(collectPointsPen, initPen, {
	
	down:function(point) {
		this.paint.lineCap('round').style(this.rgba(1))
		this.dot(point, 2)
	},
	
	move:function(point, points) {
		this.line(points[points.length-2], points[points.length-1], 4)
	},
	
	up:function(point, points) {
		if (points.length < 2) { return } // we should have at least a down and an up
		var layer = this.paint.createLayer()
		this.paint.lineCap(layer, 'round').style(layer, this.rgba(.85)).lineWidth(layer, 3).globalCompositeOperation(layer, 'source-over')
		this.paint.popLayer().pushLayer(layer)
		if (points.length == 2) {
			// one down, one up. Just a dot
			this.paint.dot(layer, point, 3).fill()
		} else if (points.length == 3) {
			// one down, one move, one up. A line
			this.paint.line(layer, points[0], points[2]).stroke().fill()
		} else {
			// lots of points. Draw a smooth curve. iPhone 4S has much higher resolution than older phones. 
			var everyNthPoint = gConfig.device.platform == 'iPhone 4S' ? 3 : 2
			// the pruning could be made much more intelligent
			var prunedPoints = points.length < 6 ? points : filter(points, function(point, i) {
				return i % everyNthPoint == 0
			})
			prunedPoints.push(point) // always include the last point
			splines.drawSpline(layer, flatten(prunedPoints), 0.5)
		}
	}
	
})

var fillSmooth = proto(basePen, initPen, {
	u:0.6,
	dt:0.10,
	rate:10,
	down:function(point) {
		this.p0 = point
		this.thickness = 4
		// this.paint.style(this.rgba(.05)) // - watercolor
		this.paint.style(this.rgba(1)).lineWidth(this.thickness).globalCompositeOperation('source-over')
		this.interval = setInterval(bind(this, this.onInterval), this.rate)
	},
	move:function(point) {
		if (!this.interval) { return }
		this.nextPoint = point
	},
	up:function(point) {
		clearInterval(this.interval)
		this.interval = null
		this.drawing = false
		if (this.drew) {
			this.completeLine()
		} else {
			this.dot(point, this.thickness * 2.5)
		}
		this.p0 = this.f = this.nextPoint = this.drew = null
	},
	onInterval:function() {
		if (!this.f) { return this.f = this.nextPoint }
		var res = this.draw(this.p0, this.f, this.nextPoint)
		this.p0 = res.p0_delta
		this.f = res.f_delta
	},
	draw:function(p0, f, p2) {
		// p1 is the bezier control point which gives us a 2nd degree bezier curve through point f
		var p1 = bezControlPt(p0, f, p2, this.u)
		// f_delta is the point at "time" (u + dt) along the bezier curve (i.e. right after f)
		var f_delta = bez(p0, p1, p2, this.u + this.dt)
		var p0_delta = bez(p0, p1, p2, 0 + this.dt)
		// distance is the number of pixels to draw this iteration
		var distance = Math.ceil(this.distance(f, f_delta) / 2)
		// tStep is the amount of "time" to travel per draw-loop in this iteration
		var tStep = distance ? (this.dt / distance) : 1
		
		// var pixel = this.paint.createImageData(onePixel)
		
		if (!this.drew) {
			this.drew = true
			var firstPoint = bez(p0, p1, p2, this.u)
			this.line(this.p0, firstPoint, this.thickness * 2)
		}
		for (var i=0; i<=distance; i++) {
			var point = bez(p0, p1, p2, this.u + i*tStep)
			this.dot(point, this.thickness)
		}
		
		return {
			// move p0 up by dt along the bezier curve
			p0_delta: bez(p0, p1, p2, 0 + this.dt),
			// and f as well
			f_delta: f_delta
		}
	},
	completeLine:function() {
		var p0 = this.p0
		var f = this.f
		var p2 = this.nextPoint
		while (p0 && p2 && this.distance(p0, p2) > .5) {
			var res = this.draw(p0, f, p2, true)
			p0 = res.p0_delta
			f = res.f_delta
		}
	}
})

pens.fill = fillSmooth

// pens.line = proto(collectPointsPen, initPen, {
// 	down: function(ctx, point, points) {
// 		ctx.lineWidth(5).style(this.rgba()).globalCompositeOperation('source-over').beginPath().moveTo(point)
// 	},
// 	move: function(ctx, point, points) {
// 		if (points.length > 2) {
// 			var pN2 = points[points.length - 3]
// 			var pN1 = points[points.length - 2]
// 			var interp = [(pN2[0] + pN1[0])/2, (pN2[1] + pN1[1])/2]
// 			ctx.quadraticCurveTo(pN2, interp).stroke()
// 		}
// 	},
// 	up: function(ctx, point, points) {
// 		if (points.length == 2) {
// 			// dot
// 			ctx.dot(points[0], 4).fill().closePath()
// 		} else if (points.length > 2) {
// 			var pN0 = points[points.length - 1]
// 			var pN1 = points[points.length - 2]
// 			ctx.quadraticCurveTo(pN0, pN1).stroke().closePath()
// 		}
// 	}
// })

pens.mark = proto(collectPointsPen, initPen, {
	down: function(point, points) {
		this.paint.lineWidth(8).strokeStyle(this.rgba(.05)).globalCompositeOperation('darker').moveTo(point)
	},
	move: function(point, points) {
		if (points.length == 2) {
			this.paint.beginPath()
		} else if (points.length > 2) {
			var pN2 = points[points.length - 3]
			var pN1 = points[points.length - 2]
			var interp = [(pN2[0] + pN1[0])/2, (pN2[1] + pN1[1])/2]
			this.paint.quadraticCurveTo(pN2, interp).stroke()
		}
	},
	up: function(point, points) {
		if (points && points.length > 1) {
			// curve through the last two points
			var pN0 = points[points.length - 1]
			var pN1 = points[points.length - 2]
			this.paint.quadraticCurveTo(pN0, pN1)
		}
	}
})

pens.zebra = proto(collectPointsPen, initPen, {
	down: function(point, points) {
		this.paint.moveTo(point).lineWidth(10).globalCompositeOperation('source-over')
	},
	move: function(point, points) {
		this.paint.beginPath()
		// var dw = 10
		// this.paint.lineWidth += Math.round((Math.random() * dw) - (dw/2 + .3))
		// if (this.paint.lineWidth < 1) ctx.lineWidth = 1
		// if (this.paint.lineWidth > 50) ctx.lineWidth = 50
		this.paint.strokeStyle(this.rgba(.8))
		if (points.length > 2) {
			var pN2 = points[points.length - 3]
			var pN1 = points[points.length - 2]
			var interp = [(pN2[0] + pN1[0])/2, (pN2[1] + pN1[1])/2]
			this.paint.lineWidth(Math.floor(this.distance(pN1, pN2))).quadraticCurveTo(pN2, interp).stroke()
		}
	},
	up: function(point, points) {
		if (points && points.length > 1) {
			var pN0 = points[points.length - 1]
			var pN1 = points[points.length - 2]
			this.paint.quadraticCurveTo(pN0, pN1)
		}
	}
})

pens.dots = proto(basePen, initPen, {
	down:function(point) {
		this.last = point
		this.i = 0
		this.paint.globalCompositeOperation('source-over').lineWidth(1)
	},
	move:function(point) {
		if (!this.last) { return }
		this.paint.beginPath().style(this.rgba(.9)).dot(point, Math.round(this.distance(this.last, point) / 2.5)).fill()
		this.last = point
	},
	up:function() {
		this.last = null
	}
})

pens.pearl = proto(basePen, initPen, {
	down:function(point) {
		this.last = point
		this.paint.globalCompositeOperation('source-over').lineWidth(1)
	},
	move:function(point) {
		if (!this.last) { return }
		
		var from = point
		var to = this.last
		var distance = Math.ceil(this.distance(from, to))
		var dx = to[0] - from[0]
		var dy = to[1] - from[1]
		var num = distance
		var stepX = dx / num
		var stepY = dy / num
		
		this.paint.fillStyle(this.rgba())
		
		for (var i=0; i<=num; i++) {
			this.paint.beginPath().dot([from[0] + stepX * i, from[1] + stepY*i], i / 2).fill()
		}
		
		this.last = point
	},
	up:function(point) {
		this.last = null
	}
})


// value_i of bezier curve with control points p0, p1, p2 at time t
function bez(p0, p1, p2, t) {
	var coord = function(i) {
		var t2 = t*t
		var _t = 1-t
		var _t2 = _t*_t
		return _t2 * p0[i] + 2 * _t * t * p1[i] + t2 * p2[i]
	}
	return [coord(0), coord(1)]
}

// we know the three points p0, f, and p2 that we want the bezier curve to go through.
// the question is, what's the control point p1 that gives us the curve that goes through f at t=u?
// 
function bezControlPt(p0, f, p2, u) {
	var coord = function(i) {
		return f[i]/(2*(1-u)*u) - (1-u)*p0[i]/(2*u) - u*p2[i]/(2*(1-u))
	}
	return [coord(0), coord(1)]
}

// pens.simple = proto(basePen, initPen, {
// 	down:function(ctx, point) {
// 		this.last = point
// 	},
// 	move:function(ctx, point) {
// 		if (!this.last) { return }
// 		ctx.beginPath()
// 		ctx.strokeStyle = this.rgba()
// 		ctx.lineWidth = Math.floor(this.distance(this.last, point))
// 		this.line([this.last[0], this.last[1]], [point[0], point[1]])
// 		ctx.stroke()
// 		this.last = point
// 	},
// 	up:function() {
// 		this.last = null
// 	}
// })

SCREEN_WIDTH = null
SCREEN_HEIGHT = null
BRUSH_SIZE = 2
COLOR = [100, 50, 20]
BRUSH_PRESSURE = 1

pens.silk = proto(basePen,
	function(opts) {
		initPen.apply(this, arguments)
		this.init(opts.width, opts.height)
	}, {
		mouseX: null, mouseY: null,
		painters: null,
		interval: null,
		
		down:function(point) { this.strokeStart(point[0], point[1]) },
		move:function(point) { this.stroke(point[0], point[1]) },
		up:function(point) { this.strokeEnd() },
		
		init: function( SCREEN_WIDTH, SCREEN_HEIGHT ) {
			var ctx = this.paint
			ctx.globalCompositeOperation('source-over')
			// ctx.strokeStyle = this.rgba()
			this.mouseX = SCREEN_WIDTH / 2;
			this.mouseY = SCREEN_HEIGHT / 2;

			this.painters = []

			for (var i = 0; i < 50; i++) {
				this.painters.push({
					dx: SCREEN_WIDTH / 2,
					dy: SCREEN_HEIGHT / 2,
					ax: 0,
					ay: 0,
					div: 0.1,
					ease: Math.random() * 0.2 + 0.6 
				});
			}
		},

		strokeStart: function( mouseX, mouseY ) {
			this.mouseX = mouseX;
			this.mouseY = mouseY

			for (var i = 0; i < this.painters.length; i++) {
				this.painters[i].dx = mouseX;
				this.painters[i].dy = mouseY;
			}

			this.shouldDraw = true;
			
			this.paint.strokeStyle(this.rgba(0.1 * BRUSH_PRESSURE))
			this.interval = setInterval(bind(this, this.draw), 1000 / 30)
		},
		
		draw:function() {
			if (!this.shouldDraw) { return }
			var scope = this
			var ctx = this.paint

			for (var i = 0; i < scope.painters.length; i++) {
				ctx.beginPath().lineWidth(1)
				
				var from = [scope.painters[i].dx, scope.painters[i].dy]
				scope.painters[i].dx -= scope.painters[i].ax = (scope.painters[i].ax + (scope.painters[i].dx - scope.mouseX) * scope.painters[i].div) * scope.painters[i].ease;
				scope.painters[i].dy -= scope.painters[i].ay = (scope.painters[i].ay + (scope.painters[i].dy - scope.mouseY) * scope.painters[i].div) * scope.painters[i].ease;
				var to = [scope.painters[i].dx, scope.painters[i].dy]
				ctx.line(from, to).stroke()
			}
		},

		stroke: function( mouseX, mouseY ) {
			this.mouseX = mouseX;
			this.mouseY = mouseY;
		},

		strokeEnd: function() {
			this.shouldDraw = false
			clearInterval(this.interval)
		}
	}
)

pens.byName = {}
pens.list = map(Object.keys(pens), function(name) {
	var pen = { path:'pen-'+name, create:pens[name] }
	pens.byName[name] = pen
	return pen
})
