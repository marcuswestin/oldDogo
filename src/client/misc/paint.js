;(function(global) {
	
	function paint(dim, pixelRatio) { return new PaintContext(dim, pixelRatio) }

	function PaintContext(dim, pixelRatio) {
		this.pixelRatio = pixelRatio || window.devicePixelRatio || 1
		this.dim = dim
		this.el = this.create('div', true)
		this.bg = this.addCanvas(this.el)
		this.fg = this.addCanvas(this.el)
		this.buf = this.el.appendChild(this.create('div'))
		this.filter = this.addCanvas(this.el)
		this.frame = this.addCanvas(this.el)
	}
	
	PaintContext.prototype = {
		/* Regular canvas functions
		 **************************/
		moveTo:ctxFunction(function(ctx, p) {
			if (!checkNum(p)) { return }
			ctx.moveTo(p[0], p[1])
		}),
		lineTo:ctxFunction(function(ctx, p) {
			if (!checkNum(p)) { return }
			ctx.lineTo(p[0], p[1])
		}),
		stroke:ctxFunction(function(ctx) { ctx.stroke() }),
		fill:ctxFunction(function(ctx) { ctx.fill() }),
		beginPath:ctxFunction(function(ctx) { ctx.beginPath() }),
		closePath:ctxFunction(function(ctx) { ctx.closePath() }),
		arc:ctxFunction(function(ctx, p, r, angle, clockwise) {
			if (!r) { return }
			if (!checkNum(p, angle)) { return }
			ctx.arc(p[0], p[1], r, angle[0], angle[1], !!clockwise)
		}),
		strokeStyle:ctxFunction(function(ctx, strokeStyle) { ctx.strokeStyle = strokeStyle }),
		fillStyle:ctxFunction(function(ctx, fillStyle) { ctx.fillStyle = fillStyle }),
		scale:ctxFunction(function(ctx, d) {
			if (!checkNum(d)) { return }
			ctx.scale(d[0], d[1])
		}),
		fillRect:ctxFunction(function(ctx, p, d) {
			if (!checkNum(p, d)) { return }
			ctx.fillRect(p[0], p[1], d[0], d[1])
		}),
		clearRect:ctxFunction(function(ctx, p, d) {
			if (!checkNum(p, d)) { return }
			ctx.clearRect(p[0], p[1], d[0], d[1])
		}),
		rotate:ctxFunction(function(ctx, rad) { ctx.rotate(rad) }),
		translate:ctxFunction(function(ctx, p) {
			if (!checkNum(p)) { return }
			ctx.translate(p[0], p[1])
		}),
		globalCompositeOperation:ctxFunction(function(ctx, operation) { ctx.globalCompositeOperation = operation }),
		quadraticCurveTo:ctxFunction(function(ctx, p1, p2) {
			if (!checkNum(p1, p2)) { return }
			ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1])
		}),
		lineWidth:ctxFunction(function(ctx, lineWidth) { ctx.lineWidth = lineWidth }),
		lineCap:ctxFunction(function(ctx, lineCapStyle) { ctx.lineCap = lineCapStyle }),
		save:ctxFunction(function(ctx) { ctx.save() }),
		restore:ctxFunction(function(ctx) { ctx.restore() }),
		drawImage:ctxFunction(function(ctx, img, p, d) {
			var args = [is2dContext(img) ? img.canvas : img]
			if (p) { 
				if (!checkNum(p)) { return }
				args = args.concat(p)
			} else {
				args = args.concat([0, 0]) // default to origin
			}
			if (d) {
				// drawImage doesn't like undefined width/height arguments
				args = args.concat([d[0], d[1]])
				if (!checkNum(d)) { return }
			}
			ctx.drawImage.apply(ctx, args)
		}),

		getImageData:ctxFunction(function(ctx, p, d) {
			if (!p) { p = [0,0] }
			if (!d) { d = this.dim }
			return ctx.getImageData(p[0], p[1], d[0], d[1])
		}),
		putImageData:ctxFunction(function(ctx, imageData, p) {
			ctx.putImageData(imageData, p[0], p[1])
		}),
		
		/* per-pixel drawing
		 *******************/
		drawPixels:ctxFunction(function(ctx, p, d, drawFn) {
			var imageData = this.getImageData(ctx, p, d)
			var data = imageData.data
			var width = d[1]
			drawFn(data, {
				getIndex: function getIndex(p) {
					return (p[0] + p[1] * width) * 4
				},
				getR: function getR(p) {
					return data[this.getIndex(p)]
				},
				setRgba: function setRgba(p, rgba) {
					var index = this.getIndex(p)
					data[index] = rgba[0]
					data[index + 1] = rgba[1]
					data[index + 2] = rgba[2]
					data[index + 3] = rgba[3]
				}
			})
			this.putImageData(ctx, imageData, p)
		}),
		
		/* Drawing conveniences
		 **********************/
		line:ctxFunction(function(ctx, p1, p2) {
			if (p1[0] - p2[0] == 0 && p1[1] - p2[1] == 0) { return }
			this.moveTo(ctx, p1).lineTo(ctx, p2)
		}),
		dot:ctxFunction(function(ctx, p, r) { this.arc(ctx, p, r, [0, Math.PI*2], true) }),
		style:ctxFunction(function(ctx, style) { this.strokeStyle(ctx, style).fillStyle(ctx, style) }),
		fillAll:ctxFunction(function(ctx, color) { this.fillStyle(ctx, color).fillRect(ctx, [0, 0], [this.dim[0], this.dim[1]]) }),
		
		/* Layer selections
		 ******************/
		withBackground:function(fn) { return this.withLayer(this.bg, fn) },
		withLayer:function(layer, fn) {
			this.currentLayer = layer
			fn.call(this, this)
			this.currentLayer = null
			return this
		},
		snapshot:function() {
			var snap = this.create('canvas').getContext('2d')
			this.drawImage(snap, this.bg)
			this.drawImage(snap, this.fg)
			var buf = this.buf.children
			for (var i=0; i<buf.length; i++) {
				this.drawImage(snap, buf[i])
			}
			this.drawImage(snap, this.filter)
			this.drawImage(snap, this.frame)
			return snap.canvas
		},
		
		/* Buffer/Undo
		 *************/
		pushLayer: function(ctxOrCanvas) {
			this.addCanvas(this.buf, ctxOrCanvas && (ctxOrCanvas.canvas || ctxOrCanvas))
			return this
		},
		popLayer: function() {
			var layer = this.buf.lastChild
			if (layer) { this.buf.removeChild(layer) }
			return this
		},
		flattenLayer: function() {
			var layer = this.buf.firstChild
			if (!layer) { return this }
			this.buf.removeChild(layer)
			return this.drawImage(this.fg, layer)
		},
		flattenAll: function() {
			while (this.buf.firstChild) { this.flattenLayer() }
			return this
		},
		createLayer:function() {
			var ctx = this.create('canvas').getContext('2d')
			this.scale(ctx, [this.pixelRatio, this.pixelRatio])
			return ctx
		},
		
		/* Utils
		 *******/
		clearDrawn: function() {
			var stack = this.buf.childNodes
			for (var i=stack.length-1; i>=0; i--) {
				this.buf.removeChild(stack[i])
			}
			this.clearRect(this.fg, [0,0], this.dim)
			return this
		},
		
		/* DOM utils
		 ***********/
		create:function(tag, relative) {
			var el = document.createElement(tag)
			var dim = this.dim
			el.setAttribute('width', dim[0] * this.pixelRatio)
			el.setAttribute('height', dim[1] * this.pixelRatio)
			el.style.width = dim[0]+'px'
			el.style.height = dim[1]+'px'
			el.style.position = relative ? 'relative' : 'absolute'
			return el
		},
		addCanvas:function(el, canvas) {
			var ctx = el.appendChild(canvas || this.createLayer().canvas).getContext('2d')
			this.scale(ctx, [1/this.pixelRatio, 1/this.pixelRatio])
			return ctx
		},
		toTag:function() {
			return this.el
		}
	}

	function ctxFunction(fn) {
		return function() {
			var args = Array.prototype.slice.call(arguments, 0)
			if (!is2dContext(args[0])) {
				var topLayer = this.buf.lastChild
				args.unshift(this.currentLayer || (topLayer ? topLayer.getContext('2d') : this.fg))
			}
			var res = fn.apply(this, args)
			return res || this
		}
	}

	function is2dContext(obj) {
		return ({}).toString.call(obj) == '[object CanvasRenderingContext2D]'
	}
	function isArray(obj) {
		return ({}).toString.call(obj) == '[object Array]'
	}

	function checkNum() {
		for (var i=0; i<arguments.length; i++) {
			var arg = arguments[i]
			if (isArray(arg)) {
				if (!checkNum.apply(this, arg)) { return false }
			} else if (typeof arg == 'number') {
				continue
			} else {
				return false
			}
		}
		return true
	}
	
	if (typeof module == 'undefined') { global.paint = paint }
	else { module.exports = paint }
})(this);

