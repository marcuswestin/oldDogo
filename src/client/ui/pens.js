var pens = module.exports

var basePen = {
	rgba: function(alpha) {
		return this.colorPicker.getColor(alpha)
	},
	handleDown:function(point) {
		this.down(this.ctx, point)
	},
	handleMove:function(point) {
		this.move(this.ctx, point)
	},
	handleUp:function(point) {
		this.up(this.ctx, point)
	},
	
	line: function(from, to) {
		if (from[0] == to[0] && from[1] == to[1]) { return }
		this.ctx.moveTo(from[0], from[1])
		this.ctx.lineTo(to[0], to[1])
	},
	
	distance: function(from, to) {
		var dx = to[0] - from[0]
		var dy = to[1] - from[1]
		return Math.sqrt(dx*dx + dy*dy)
	},
	slope: function(from, to) {
		var dx = to[0] - from[0]
		var dy = to[1] - from[1]
		return dy / dx
	},
	dot: function(pos, size) {
		if (size < 1) { size = 1 }
		var ctx = this.ctx
		ctx.beginPath()
		ctx.arc(pos[0], pos[1], size, 0, Math.PI*2, true)
		ctx.closePath()
		ctx.fill()
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
	},
	handleMove:function(point) {
		if (!this.points) { return }
		this.points.push(point)
		this.move(this.ctx, point, this.points)
	},
	handleUp:function(point) {
		if (!this.points) { return }
		this.points.push(point)
		this.up(this.ctx, point, this.points)
		this.points = null
	}
})

var initPen = function(opts) {
	this.colorPicker = opts.colorPicker
	this.ctx = opts.ctx
}

pens.pen = proto(collectPointsPen, initPen, {
	down: function(ctx, point, points) {
		ctx.lineWidth = 5
		ctx.strokeStyle = this.rgba()
		ctx.globalCompositeOperation = 'source-over'
		ctx.beginPath()
		ctx.moveTo(point[0], point[1])
	},
	move: function(ctx, point, points) {
		if (points.length > 2) {
			var pN2 = points[points.length - 3]
			var pN1 = points[points.length - 2]
			var interp = [(pN2[0] + pN1[0])/2, (pN2[1] + pN1[1])/2]
			ctx.quadraticCurveTo(pN2[0], pN2[1], interp[0], interp[1])
			ctx.stroke()
		}
	},
	up: function(ctx, point, points) {
		if (points.length == 2) {
			// dot
			ctx.fillStyle = ctx.strokeStyle
			ctx.arc(points[0][0], points[0][1], 4, 0, Math.PI*2, true)
			ctx.fill()
			ctx.closePath()
		} else if (points.length > 2) {
			var pN0 = points[points.length - 1]
			var pN1 = points[points.length - 2]
			ctx.quadraticCurveTo(pN0[0], pN0[1], pN1[0], pN1[1])
			ctx.stroke()
			ctx.closePath()
		}
	}
})

pens.zebra = proto(collectPointsPen, initPen, {
	down: function(ctx, point, points) {
		ctx.moveTo(point[0], point[1])
		ctx.strokeStyle = this.rgba()
		ctx.lineWidth = 10
		ctx.globalCompositeOperation = 'source-over'
	},
	move: function(ctx, point, points) {
		ctx.beginPath()
		// var dw = 10
		// ctx.lineWidth += Math.round((Math.random() * dw) - (dw/2 + .3))
		// if (ctx.lineWidth < 1) ctx.lineWidth = 1
		// if (ctx.lineWidth > 50) ctx.lineWidth = 50
		if (points.length > 2) {
			var pN2 = points[points.length - 3]
			var pN1 = points[points.length - 2]
			ctx.lineWidth = Math.floor(this.distance(pN1, pN2))
			var interp = [(pN2[0] + pN1[0])/2, (pN2[1] + pN1[1])/2]
			ctx.quadraticCurveTo(pN2[0], pN2[1], interp[0], interp[1])
			ctx.stroke()
		}
	},
	up: function(ctx, point, points) {
		if (points && points.length > 1) {
			var pN0 = points[points.length - 1]
			var pN1 = points[points.length - 2]
			ctx.quadraticCurveTo(pN0[0], pN0[1], pN1[0], pN1[1])
		}
	}
})

pens.marker = proto(collectPointsPen, initPen, {
	down: function(ctx, point, points) {
		ctx.lineWidth = 8
		ctx.strokeStyle = this.rgba(.05)
		ctx.globalCompositeOperation = 'darker'
		ctx.moveTo(point[0], point[1])
	},
	move: function(ctx, point, points) {
		if (points.length == 2) {
			ctx.beginPath()
		} else if (points.length > 2) {
			var pN2 = points[points.length - 3]
			var pN1 = points[points.length - 2]
			var interp = [(pN2[0] + pN1[0])/2, (pN2[1] + pN1[1])/2]
			ctx.quadraticCurveTo(pN2[0], pN2[1], interp[0], interp[1])
			ctx.stroke()
		}
	},
	up: function(ctx, point, points) {
		if (points && points.length > 1) {
			// curve through the last two points
			var pN0 = points[points.length - 1]
			var pN1 = points[points.length - 2]
			ctx.quadraticCurveTo(pN0[0], pN0[1], pN1[0], pN1[1])
		}
	}
})

pens.dots = proto(basePen, initPen, {
	down:function(ctx, point) {
		this.last = point
		this.i = 0
		ctx.globalCompositeOperation = 'source-over'
	},
	move:function(ctx, point) {
		if (!this.last || (this.i++ % 2 != 0)) { return }
		this.ctx.fillStyle = this.rgba()
		this.dot(point, 1 + this.distance(this.last, point) / 5)
		this.last = point
	},
	up:function() {
		this.last = null
	}
})

pens.pearls = proto(basePen, initPen, {
	down:function(ctx, point) {
		this.last = point
		ctx.globalCompositeOperation = 'source-over'
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
		
		ctx.fillStyle = this.rgba()
		
		for (var i=0; i<=num; i++) {
			this.dot([from[0] + stepX * i, from[1] + stepY*i], i / 3)
		}
		
		this.last = point
	},
	up:function(ctx, point) {
		this.last = null
	}
})

var points = []

var i = 0

pens.fill = proto(basePen, initPen, {
	down:function(ctx, point) {
		this.drawing = true
		this.p2 = point
		this.ctx.fillStyle = this.rgba()
		ctx.globalCompositeOperation = 'source-over'
		
		// points.push(point)
		// if (points.length == 3) {
		// 	this.doDraw(points[2], points[1], points[0])
		// 	
		// 	this.dot(points[2], 10)
		// 	this.dot(points[1], 10)
		// 	this.dot(points[0], 10)
		// 	this.dot(bezControlPt(points[0], points[1], points[2], 1/2), 15)
		// 	
		// 	points = []
		// }
		this.p0 = point
		this.minSize = this.lastSize = 2
		this.lastDistance = 0
		
		this.interval = setInterval(bind(this, this.drawNext), 1000 / 15)
	},
	move:function(ctx, point) {
		if (!this.drawing) { return }
		if (i++ % 30 != 0) { return }
		i = 0
		
		if (!this.p1) { this.p1 = point }
		else { this.p2 = point }
		
		
		// if (!(this.p0 && this.p1 && this.p2)) { return }
		// this.doDraw(this.p0, this.p1, this.p2)
	},
	up:function(ctx, point) {
		this.drawing = false
		this.p0 = this.p1 = this.p2 = null
		clearInterval(this.interval)
	},
	drawNext:function() {
		if (!this.p1 || !this.p2) { return }
		this.doDraw(this.p0, this.p1, this.p2)
		this.p0 = this.p1
		this.p1 = this.p2
		this.p2 = null
	},
	doDraw:function(p0, f, p2) {
		// infer bezier control point
		var u = 1/2 // calculate this based on the relative lengths of p01/p12. For now, assume it's just halfway
		var p1 = bezControlPt(p0, f, p2, u)
		
		var distance = this.distance(p1, p2)
		var startSize = this.lastSize
		var targetSize = distance / 8
		if (Math.abs(targetSize - startSize) > 1) {
			targetSize = startSize + (targetSize > startSize ? 1 : -1)
		}
		if (targetSize < this.minSize) {
			targetSize = this.minSize
		}
		this.lastDistance = distance
		
		var num = Math.ceil(distance) * 2
		var sizeStep = (targetSize - startSize) / num
		
		// Draw the second half of the bezier curve - the first half is already drawn by the previous stroke
		for (var i=num*u; i<=num; i++) {
			var t = i / num
			var x = bez(p0, p1, p2, t, 0)
			var y = bez(p0, p1, p2, t, 1)
			this.dot([x,y], this.lastSize=startSize + sizeStep*i)
			this.ctx.closePath()
		}
	}
})

// value_i of bezier curve with control points p0, p1, p2 at time t
var bez = function(p0, p1, p2, t, i) {
	var t2 = t*t
	var _t = 1-t
	var _t2 = _t*_t
	return _t2 * p0[i] + 2 * _t * t * p1[i] + t2 * p2[i]
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

// var lineWidth = this.lineWidth
// var dw = lineWidth.vary
// ctx.lineWidth += Math.round((Math.random() * dw) - (dw/2 + .3))
// ctx.strokeStyle = rgba()
// if (ctx.lineWidth < lineWidth.min) {
// 	ctx.lineWidth = lineWidth.min
// } else if (ctx.lineWidth > lineWidth.max) {
// 	ctx.lineWidth = lineWidth.max
// }
// lineWidth: {
// 	init:5,
// 	vary:3,
// 	max:7,
// 	min:1
// }

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
			ctx.globalCompositeOperation = 'source-over';
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
			
			this.ctx.strokeStyle = this.rgba(0.05 * BRUSH_PRESSURE)
			this.interval = setInterval(bind(this, this.update), 1000 / 30)
		},
		
		update:function() {
			if (!this.shouldDraw) { return }
			var scope = this
			var ctx = this.ctx

			for (var i = 0; i < scope.painters.length; i++) {
				ctx.beginPath()
				ctx.lineWidth = 1
				
				var from = [scope.painters[i].dx, scope.painters[i].dy]
				scope.painters[i].dx -= scope.painters[i].ax = (scope.painters[i].ax + (scope.painters[i].dx - scope.mouseX) * scope.painters[i].div) * scope.painters[i].ease;
				scope.painters[i].dy -= scope.painters[i].ay = (scope.painters[i].ay + (scope.painters[i].dy - scope.mouseY) * scope.painters[i].div) * scope.painters[i].ease;
				var to = [scope.painters[i].dx, scope.painters[i].dy]
				this.line(from, to)
				
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
