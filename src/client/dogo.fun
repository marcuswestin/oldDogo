import tap
import console
import ./bridge
import ./util
import ui/lists
import viewport
import alert
import ./session
import app

viewport.fitToDevice()
<link rel="stylesheet/stylus" type="css" href="./style/dogo.styl" />

headSize = 45
size = {
	height:viewport.size.height
	width:viewport.size.width is > 800 ? 800 : viewport.size.width
}
scroller = lists.makeScroller(size, { headSize:45 })

app.whenLoaded(handler() {
	session.load()
})

// renderConversation = template(conv) {
// 	<div class="back">"Back"</div #tap.button(handler() { state.currentConversation set: null })>
// 	<div class="conversation">
// 		conv
// 	</div>
// 	<div class="footer">
// 		<div class="item">"Text"</div>
// 		<div class="item">"Camera"</div>
// 		<div class="item">"Draw"</div>
// 		<div class="item">"Voice"</div>
// 	</div>
// }

renderConvo = template(convo) {
	'Convo' convo
}

renderContact = template(contact) {
	'Contact' contact
}

face = template(contact) {
	<div class="face" style={
		width:50 height:50
		background:'url("https://graph.facebook.com/'+contact.facebookId+'/picture")'
	}/>
}

section = template(label, class, renderContent) {
	<div class="header">
		<div class="label">label</div>
	</div>
	<div class="section "+class>
		renderContent()
	</div>
	
}

renderConversationList = template() {
	<div class="list">
		convosReq = net.get('conversations')
		contactsReq = net.get('contacts')
		
		section('Conversations', 'conversations', template() {
			if convosReq.loading { 'Loading...' }
			if convosReq.error { 'Error: 'convosReq.error }
			for convo in convosReq.response.conversations {
				<div class="item conversation">convo</div #tap.button(handler() {
					scroller.push({ convo:convo })
				})>
			}
			if convosReq.response.conversations.length is 0 {
				<div class="ghostTown">"Start a conversation with a friend below"</div>
			}
		})
		
		section('Friends', 'contacts', template() {
			if contactsReq.loading { 'Loading...' }
			if contactsReq.error { 'Error ' contactsReq.error }
			for contact in contactsReq.response.contacts {
				memberClass = contact.memberSince ? ' member' : ''
				<div class="item contact "+memberClass>face(contact)</div #tap.listItem(handler() {
					if (contact.memberSince) {
						scroller.push({ contact:contact })
					} else {
						alert("Invite them")
					}
				})>
			}
		})
	</div>
}

image = template(name) {
	<img src="http://blowtorch-payload/image/"+name />
} 

renderSignup = template() {
	request = null
	<div style={ textAlign:'center' }>
		sessionReq = null
		if sessionReq.loading {
			'Loading...'
		} else {
			foo = null
			<div class="button login">"Login"</div #tap.button(handler() {
				bridge.command('facebook.connect', null, handler(event) {
					if (!event.error) {
						sessionReq set: net.post('sessions', { facebook_access_token:event.response.accessToken }, handler(event) {
							if (!event.error) {
								res = event.response
								session.state set: 'authToken', res.authToken
								session.state set: 'account', res.account
								bridge.command('state.set', { key:'session', value:res })
							}
						})
					}
				})
			})>
			if sessionReq.error {
				'Error: 'sessionReq.error
			}
		}
	</div>
}

<div style=size style={ margin:'0 auto' }>
	scroller.renderHead(template() {
		<div class="head">
			util.renderDevBar()
			<div class="title">
				scroller.view ? scroller.view.title : 'Dogo'
			</div>
		</div>
	})
	scroller.renderBody(template(view) {
		if view.convo {
			// renderConvo(view.convo)
		} else if view.contact {
			// renderContact(view.contact)
		} else if session.state.authToken {
			renderConversationList()
		} else {
			renderSignup()
		}
	})
</div>