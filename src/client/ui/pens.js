var pens = module.exports

var basePen = {
	rgba: function(alpha) {
		return this.colorPicker.getColor(alpha)
	},
	handleDown:function(point) {
		this.down(this.ctx, point)
		return this
	},
	handleMove:function(point) {
		this.move(this.ctx, point)
		return this
	},
	handleUp:function(point) {
		this.up(this.ctx, point)
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
	}
}

var collectPointsPen = create(basePen, {
	handleDown:function(point) {
		this.points = [point]
		this.down(this.ctx, point, this.points)
		return this
	},
	handleMove:function(point) {
		if (!this.points) { return }
		this.points.push(point)
		this.move(this.ctx, point, this.points)
		return this
	},
	handleUp:function(point) {
		if (!this.points) { return }
		this.points.push(point)
		this.up(this.ctx, point, this.points)
		// console.log(JSON.stringify(this.points))
		this.points = null
		return this
	}
})

var initPen = function(opts) {
	this.colorPicker = opts.colorPicker
	this.ctx = opts.paint
}

pens.fill = proto(basePen, initPen, {
	u:1/2,
	dt:0.1,
	rate:1000 / 100,
	down:function(ctx, point) {
		this.nextPoint = point
		this.thickness = 2
		// ctx.style(this.rgba(.05)) // - watercolor
		ctx.style(this.rgba(1)).lineWidth(this.thickness).globalCompositeOperation('source-over')
		this.interval = setInterval(bind(this, this.draw), this.rate)
	},
	move:function(ctx, point) {
		if (!this.interval) { return }
		this.nextPoint = point
	},
	up:function(ctx, point) {
		clearInterval(this.interval)
		this.interval = null
		this.drawing = false
		this.p0 = this.f = this.nextPoint = null
	},
	draw:function() {
		if (!this.p0) { return this.p0 = this.nextPoint }
		if (!this.f) { return this.f = this.nextPoint }
		
		var c = this.ctx
		var p0 = this.p0
		var f = this.f
		var p2 = this.nextPoint
		var u = this.u
		var deltaT = this.dt
		var p1 = bezControlPt(p0, f, p2, u)
		
		var p0_delta = bez(p0, p1, p2, 0 + deltaT)
		var f_delta = bez(p0, p1, p2, u + deltaT)
		
		var distance = Math.ceil(this.distance(f, f_delta) / 2)

		var thickness0 = this.thickness
		var thicknessTarget = distance // should be something else
		var thicknessDelta = thicknessTarget - thickness0
		var thicknessStep = thicknessDelta / distance

		var tStep = distance ? (deltaT / distance) : 1
		// var pixel = ctx.createImageData(onePixel)

		// c.fillStyle(this.rgba())
		for (var i=0; i<=distance; i++) {
			var point = bez(p0, p1, p2, u + i*tStep)
			c.beginPath().dot(point, (thickness0 + i*thicknessStep)).stroke().fill()
		}
		
		this.p0 = p0_delta
		this.f = f_delta
		this.thickness = thicknessTarget
	}
})

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
	down: function(ctx, point, points) {
		ctx.lineWidth(8).strokeStyle(this.rgba(.05)).globalCompositeOperation('darker').moveTo(point)
	},
	move: function(ctx, point, points) {
		if (points.length == 2) {
			ctx.beginPath()
		} else if (points.length > 2) {
			var pN2 = points[points.length - 3]
			var pN1 = points[points.length - 2]
			var interp = [(pN2[0] + pN1[0])/2, (pN2[1] + pN1[1])/2]
			ctx.quadraticCurveTo(pN2, interp).stroke()
		}
	},
	up: function(ctx, point, points) {
		if (points && points.length > 1) {
			// curve through the last two points
			var pN0 = points[points.length - 1]
			var pN1 = points[points.length - 2]
			ctx.quadraticCurveTo(pN0, pN1)
		}
	}
})

pens.zebra = proto(collectPointsPen, initPen, {
	down: function(ctx, point, points) {
		ctx.moveTo(point).lineWidth(10).globalCompositeOperation('source-over')
	},
	move: function(ctx, point, points) {
		ctx.beginPath()
		// var dw = 10
		// ctx.lineWidth += Math.round((Math.random() * dw) - (dw/2 + .3))
		// if (ctx.lineWidth < 1) ctx.lineWidth = 1
		// if (ctx.lineWidth > 50) ctx.lineWidth = 50
		ctx.strokeStyle(this.rgba(.8))
		if (points.length > 2) {
			var pN2 = points[points.length - 3]
			var pN1 = points[points.length - 2]
			var interp = [(pN2[0] + pN1[0])/2, (pN2[1] + pN1[1])/2]
			ctx.lineWidth(Math.floor(this.distance(pN1, pN2))).quadraticCurveTo(pN2, interp).stroke()
		}
	},
	up: function(ctx, point, points) {
		if (points && points.length > 1) {
			var pN0 = points[points.length - 1]
			var pN1 = points[points.length - 2]
			ctx.quadraticCurveTo(pN0, pN1)
		}
	}
})

pens.dots = proto(basePen, initPen, {
	down:function(ctx, point) {
		this.last = point
		this.i = 0
		ctx.globalCompositeOperation('source-over').lineWidth(1)
	},
	move:function(ctx, point) {
		if (!this.last) { return }
		ctx.beginPath().style(this.rgba(.9)).dot(point, Math.round(this.distance(this.last, point) / 2.5)).fill()
		this.last = point
	},
	up:function() {
		this.last = null
	}
})

pens.pearl = proto(basePen, initPen, {
	down:function(ctx, point) {
		this.last = point
		ctx.globalCompositeOperation('source-over').lineWidth(1)
	},
	move:function(ctx, point) {
		if (!this.last) { return }
		
		var from = point
		var to = this.last
		var distance = Math.ceil(this.distance(from, to))
		var dx = to[0] - from[0]
		var dy = to[1] - from[1]
		var num = distance
		var stepX = dx / num
		var stepY = dy / num
		
		ctx.fillStyle(this.rgba())
		
		for (var i=0; i<=num; i++) {
			ctx.beginPath().dot([from[0] + stepX * i, from[1] + stepY*i], i / 2).fill()
		}
		
		this.last = point
	},
	up:function(ctx, point) {
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
		
		down:function(ctx, point) { this.strokeStart(point[0], point[1]) },
		move:function(ctx, point) { this.stroke(point[0], point[1]) },
		up:function(ctx, point) { this.strokeEnd() },
		
		init: function( SCREEN_WIDTH, SCREEN_HEIGHT ) {
			var ctx = this.ctx
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
			
			this.ctx.strokeStyle(this.rgba(0.1 * BRUSH_PRESSURE))
			this.interval = setInterval(bind(this, this.draw), 1000 / 30)
		},
		
		draw:function() {
			if (!this.shouldDraw) { return }
			var scope = this
			var ctx = this.ctx

			for (var i = 0; i < scope.painters.length; i++) {
				ctx.beginPath().lineWidth(1)
				
				var from = [scope.painters[i].dx, scope.painters[i].dy]
				scope.painters[i].dx -= scope.painters[i].ax = (scope.painters[i].ax + (scope.painters[i].dx - scope.mouseX) * scope.painters[i].div) * scope.painters[i].ease;
				scope.painters[i].dy -= scope.painters[i].ay = (scope.painters[i].ay + (scope.painters[i].dy - scope.mouseY) * scope.painters[i].div) * scope.painters[i].ease;
				var to = [scope.painters[i].dx, scope.painters[i].dy]
				ctx.line(from, to)
				
				ctx.stroke()
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
