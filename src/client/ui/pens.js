var pens = module.exports

var basePen = {
	rgba: function(alpha) {
		return this.colorPicker.getColor()
		var colors = []
		for(var i = 0; i< 3; i++) {
			colors.push(Math.floor(Math.random() * 255))
		}
		if (alpha) {
			colors.push(alpha)
			return 'rgba('+colors.join(',')+')'
		} else {
			return 'rgb('+colors.join(',')+')'
		}
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

pens.smooth = proto(collectPointsPen, initPen, {
	down: function(ctx, point, points) {
		ctx.lineWidth = 2
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
		var dw = 10
		ctx.lineWidth += Math.round((Math.random() * dw) - (dw/2 + .3))
		if (ctx.lineWidth < 1) ctx.lineWidth = 1
		if (ctx.lineWidth > 50) ctx.lineWidth = 50
		if (points.length > 2) {
			var pN2 = points[points.length - 3]
			var pN1 = points[points.length - 2]
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

pens.glow = proto(collectPointsPen, initPen, {
	down: function(ctx, point, points) {
		ctx.lineWidth = 10
		ctx.strokeStyle = this.rgba(.01)
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
		this.drawing = true
	},
	move:function(ctx, point) {
		if (!this.drawing) { return }
		ctx.beginPath()
		ctx.fillStyle = this.rgba()
		ctx.arc(point[0], point[1], 5, 0, Math.PI*2, true)
		ctx.closePath()
		ctx.fill()
	},
	up:function() {
		this.drawing = false
	}
})

pens.simple = proto(basePen, initPen, {
	down:function(ctx, point) {
		this.last = point
	},
	move:function(ctx, point) {
		if (!this.last) { return }
		ctx.beginPath()
		ctx.strokeStyle = this.rgba()
		ctx.lineWidth = 2
		this.line([this.last[0], this.last[1]], [point[0], point[1]])
		ctx.stroke()
		this.last = point
	},
	up:function() {
		this.last = null
	}
})

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

pens.ribbon = proto(basePen,
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
			this.ctx.globalCompositeOperation = 'source-over';
			this.ctx.strokeStyle = "rgba(" + COLOR[0] + ", " + COLOR[1] + ", " + COLOR[2] + ", " + 0.05 * BRUSH_PRESSURE + ")";
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
			this.update()
		},

		strokeEnd: function() {
			this.shouldDraw = false
		}
	}
)
