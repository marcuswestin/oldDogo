util = {
	
	renderReloadButton = template() {
		<div style={ position:'absolute', top:0, right:0, background:'red'}>'R'</div ontouchend=handler() {
			<script> location.reload() </script>
		}>
	}

}

<script bridge=bridge>
	window.onerror = function(e) {
		alert('error: ' + e)
		console.log('error:', e)
	}
	window.console = {
		log: function() {
			var args = []
			for (var i=0; i<arguments.length; i++) {
				var arg = arguments[i]
				if (arg && arg.asJSONObject) { arg = arg.asJSONObject() }
				args.push(arg)
			}
			bridge.evaluate()._send({ command:'console.log', data:args })
		}
	}
</script>
