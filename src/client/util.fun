import ./api
import ./config
import ./state
import ./bridge
import tap

util = {
	
	renderDevBar = template() {
		<div style={ position:'absolute' top:4 right:4 }>
			style = { width:30 height:24 float:'right' textAlign:'center' paddingTop:4 }
			<div style=style style={ background:'green' }>'A'</div #tap.button(handler() {
				api.post('sessions/refresh', { authToken:'1:d57166ef-dd9e-440a-becc-75da07d03c20' }, util.handleLogin)
			})>
			<div style=style style={ background:'red' }>'R'</div #tap.button(handler() {
				<script> location.reload() </script>
			})>
		
		</div>
	}
	
	handleLogin = handler(event) {
		if (!event.error) {
			res = event.response
			state set: 'authToken', res.authToken
			state set: 'account', res.account
		}
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
				if (arg && arg.toJSON) { arg = arg.toJSON() }
				args.push(arg)
			}
			bridge.evaluate()._send({ command:'console.log', data:args })
		}
	}
</script>
