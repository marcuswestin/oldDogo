import localstorage
import xhr
import "./bridge"
import tap

<link rel="stylesheet/stylus" type="css" href="./style/dogo.styl" />

state = {
	version: '0.1',
	authToken: null,
	conversations: null,
	currentConversation: null,
	currentTool: 'text'
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
	phoneNumber = "+14156015654"
	request = null
	<div style={ marginTop:150, textAlign:'center' }>
		<input data=phoneNumber placeholder="Your phone number" style={ padding:10, width:280 } />
		<button>"Go"</button style={ width:140, height:40, marginTop:10 } #tap.button(handler() {
			bridge.hackPhoneNumber set: phoneNumber.copy()
			request set: xhr.post('/api/authentication', { phone_number:phoneNumber }, handler(event) {
				if (event.response) {
					state.authToken set: event.response.dev.authToken
				}
			})
		})>
		if (request.loading) { <div>"Loading..."</div> }
		if (request.error) {
			<pre>request.error</pre>
		}
		if (request.response.dev.authLink) {
			<div class="link">"Auto-auth (dev)"</div #tap.button(handler() {
				bridge.command('openUrl', { url:request.response.dev.authLink })
			})>
		}
	</div>
}

<div style={ width:320, height:460, margin:'0 auto', overflow:'auto', background:'#fff', position:'relative' }>
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
