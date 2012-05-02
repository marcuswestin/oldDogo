home = {
	render:template(scroller) {
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
		
		<div class="list">
			convosReq = api.get('conversations')
			contactsReq = api.get('contacts', null, handler(event) {
				if (event.response) {
					for contact in event.response.contacts {
						if contact.accountId {
							state.contactsById set: contact.accountId, contact
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
						face.account(convo.withAccountId)
						<div class="messageBubble">
							convo.lastMessageBody
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
					<div class="item contact "+memberClass>face.facebook(contact)</div #tap.listItem(handler() {
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
}