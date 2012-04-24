import ./net
import ./session

util = {
	
	renderDevBar = template() {
		<div style={ position:'absolute', top:0, right:33, background:'yellow'}>'L'</div onclick=handler() {
			session.load()
		}>
		<div style={ position:'absolute', top:0, right:22, background:'green'}>'A'</div onclick=handler() {
			net.post('sessions/refresh', { authToken:'1:bb77de6c-16e4-4729-b852-7853ff77d1f9' }, handler(event) {
				res = event.response
				session.authToken set: res.authToken
				session.account set: res.account
				bridge.command('state.set', { key:'session', value:res })
			})
		}>
		<div style={ position:'absolute', top:0, right:11, background:'red'}>'R'</div onclick=handler() {
			<script> location.reload() </script>
		}>
		<div style={ position:'absolute', top:0, right:0, background:'blue'}>'X'</div onclick=handler() {
			bridge.command('state.reset')
			session.clear()
		}>
	}

}

<script bridge=bridge>
	window.onerror = function(e) {
		alert('window.onerror: ' + e)
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
