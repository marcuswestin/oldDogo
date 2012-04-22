import tap
import console
import ./bridge
import ./util
import ui/lists
import viewport
import alert
import ./net

<link rel="stylesheet/stylus" type="css" href="./style/dogo.styl" />

stateReq = bridge.command('state.load')
state = stateReq.response

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
	<div style={ paddingTop:150, textAlign:'center' }>
		sessionReq = null
		if sessionReq.loading {
			'Loading...'
		} else {
			<button>"Facebook connect"</button style={ width:140, height:40, marginTop:10 } #tap.button(handler() {
				bridge.command('facebook.connect', null, handler(event) {
					if (!event.error) {
						sessionReq set: net.post('sessions', { facebook_access_token:event.response.access_token })
					}
				})
			})>
			if sessionReq.error {
				'Error: 'sessionReq.error
			}
			if sessionReq.response {
				"yay! " sessionReq.response
			}
		}
	</div>
}

headSize = 45
scroller = lists.makeScroller(viewport.size, { headSize:45 })
scroller.renderHead(template() {
	<div class="head">
		util.renderDevBar()
		<div class="title">'Dogo'</div>
	</div>
})
scroller.renderBody([template() {
	<div style={ background:'#fff' minHeight:viewport.size.height-headSize height:900 }>
		if state.session {
			
		} else {
			renderSignup()
		}
		// if (state.currentConversation) {
		// 	renderConversation(state.currentConversation)
		// } else if (state.sentVerificationSmsTo) {
		// 	"We sent a verification SMS to "state.sentVerificationSmsTo". Please be patient"
		// } else if (state.authToken) {
		// 	renderConversationList()
		// } else {
		// 	renderSignup()
		// }
	</div>
}])