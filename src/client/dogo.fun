import localstorage
import xhr
import tap
import console
import "./bridge"
import "./util"

<link rel="stylesheet/stylus" type="css" href="./style/dogo.styl" />

state = {
	version: '0.1',
	authToken: null
}

localstorage.persist(state, 'state8')

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
	util.renderReloadButton()
	
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
