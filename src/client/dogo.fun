import localstorage
import xhr
import "./bridge"
import tap
import console

<link rel="stylesheet/stylus" type="css" href="./style/dogo.styl" />

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

state = {
	version: '0.1',
	authToken: null
}

localstorage.persist(state, 'state8')

renderReloadButton = template() {
	<div style={ position:'absolute', top:0, right:0, background:'red'}>'R'</div ontouchend=handler() {
		<script> location.reload() </script>
	}>
}

renderConversation = template(conv) {
	<div class="back">"Back"</div #tap.button(handler() { state.currentConversation set: null })>
	<div class="conversation">
		conv
	</div>
	<div class="footer">
		<div class="item">"Text"</div>
		<div class="item">"Camera"</div>
		<div class="item">"Draw"</div>
		<div class="item">"Voice"</div>
	</div>
}

renderConversationList = template() {
	<div class="list">
		if (state.conversations.length) {
			<div class="header">"Conversations"</div>
			for conversation in state.conversations {
				<div class="item conversation">conversation</div #tap.button(handler() {
					state.currentConversation set: conversation
				})>
			}
		}
		<div class="header">"Start a conversation"</div>
	</div>
}

renderSignup = template() {
	request = null
	<div style={ marginTop:150, textAlign:'center' }>
		<button>"Facebook connect"</button style={ width:140, height:40, marginTop:10 } #tap.button(handler() {
			bridge.command('facebook_connect', null, handler(event) {
				<script event=event>
					console.log(event)
				</script>
			})
		})>
	</div>
}

<div style={ width:320, height:460, margin:'0 auto', overflow:'auto', background:'#fff', position:'relative' }>
	renderReloadButton()
	
	if (state.currentConversation) {
		renderConversation(state.currentConversation)
	} else if (state.sentVerificationSmsTo) {
		"We sent a verification SMS to "state.sentVerificationSmsTo". Please be patient"
	} else if (state.authToken) {
		renderConversationList()
	} else {
		renderSignup()
	}
</div>
