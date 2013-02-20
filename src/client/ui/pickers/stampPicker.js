module.exports = function() {
	return {
		path:'stamp-mustache',
		create:function(opts) {
			return {
				handleDown:function(p) {
					opts.p.style('#000').fillRect(p, [10, 10])
				},
				handleMove:function(p) {
				
				},
				handleUp:function(p) {
				
				}
			}
		}
	}
}