import tap
import console
import ./bridge
import ./util
import ui/lists
import viewport
import alert
import ./session
import app
import ./net
import localstorage

viewport.fitToDevice()
<link rel="stylesheet/stylus" type="css" href="./style/dogo.styl" />

headSize = 45
size = {
	height:viewport.size.height
	width:viewport.size.width is > 800 ? 800 : viewport.size.width
}
scroller = lists.makeScroller(size, { headSize:45 })

// localstorage.persist(scroller.stack, 'scroller.stack')

app.whenLoaded(handler() {
	session.load()
})

contactsById = {}
// localstorage.persist(contactsById, 'contactsById')

renderConvo = template(convo, contact) {
	// <div>"convo: "convo</div>
	//  	<div>"contact: "contact</div>
	params = convo.withAccountId ? { withAccountId:convo.withAccountId } : { withFacebookId:contact.facebookId }
	messagesReq = api.get('messages', params)
	<div class="conversation">
		<div class="messages">
			for message in messagesReq.response.messages {
				<div class="messageBubble">
					message.body
				</div>
			}
		</div>
		<div class="composer">
			messageText = ""
			<textarea class="bodyInput" data=messageText placeholder="Say something :)" />
			<div class="button send">"Send"</div #tap.button(handler() {
				api.post('messages', { to_facebook_account_id:contact.facebookId, body:messageText }, handler(event) {
					
				})
				messageText set:''
			})>
		</div>
	</div>
}

face = template(contact) {
	<div class="face" style={
		width:50 height:50
		background:'url("https://graph.facebook.com/'+contact.facebookId+'/picture")'
	}/>
}

accountFace = template(accountId) {
	face(contactsById[accountId])
}

section = template(label, class, renderContent) {
	<div class="section clear">
		<div class="header">
			<div class="label">label</div>
		</div>
		<div class="section "+class>
			renderContent()
		</div>
	</div>
}

renderConversationList = template() {
	<div class="list">
		convosReq = api.get('conversations')
		contactsReq = api.get('contacts', null, handler(event) {
			if (event.response) {
				for contact in event.response.contacts {
					if contact.accountId {
						contactsById set: contact.accountId, contact
					}
				}
			}
		})
		
		section('Conversations', 'conversations', template() {
			// if convosReq.loading { 'Loading...' }
			if convosReq.error { 'Error: 'convosReq.error }
			for convo in convosReq.response.conversations {
				selectConvo = handler() { scroller.push({ convo:convo }) }
				<div class="item" #tap.button(selectConvo)>
					accountFace(convo.withAccountId)
					<div class="messageBubble">
						convo.body
					</div>
				</div>
				<div class="clear"/>
			}
			if convosReq.response.conversations.length is 0 {
				<div class="ghostTown">"Start a conversation with a friend below"</div>
			}
		})
		
		<div style={ height:4 }/>
		
		section('Friends', 'contacts', template() {
			// if contactsReq.loading { 'Loading...' }
			if contactsReq.error { 'Error ' contactsReq.error }
			for contact in contactsReq.response.contacts {
				memberClass = contact.memberSince ? ' member' : ''
				<div class="item contact "+memberClass>face(contact)</div #tap.listItem(handler() {
					if (contact.memberSince) {
						scroller.push({ contact:contact })
					} else {
						alert("Time to implement invites!")
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
						sessionReq set: api.post('sessions', { facebook_access_token:event.response.accessToken }, handler(event) {
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
		view = scroller.stack.last
		<div class="head">
			util.renderDevBar()
			<div class="title">
				view.contact ? view.contact.fullName : 'Dogo'
			</div>
			if scroller.stack.length is > 1 {
				<div class="button back">'Back'</div #tap.button(handler() {
					scroller.pop()
				})>
			}
		</div>
	})
	scroller.renderBody(template(view) {
		if view.convo {
			renderConvo(view.convo, view.convo.contact)
		} else if view.contact {
			renderConvo(null, view.contact)
		} else if session.state.authToken {
			renderConversationList()
		} else {
			renderSignup()
		}
	})
</div>

