import alert

conversation = {
	render = template(convo, contact) {
		messagesReq = api.get('messages', { withAccountId:convo.withAccountId, withFacebookId:contact.facebookId })
		messages = messagesReq.response.messages
		<div class="conversation">
			<div class="messages">
				for message in messages {
					<div class="messageBubble">
						message.body
					</div>
				}
			</div>
			<div class="composer">
				messageText = ""
				<textarea class="bodyInput" data=messageText placeholder="Say something :)" />
				<div class="button send">"Send"</div #tap.button(handler() {
					params = { toAccountId:convo.withAccountId, toFacebookId:contact.facebookId, body:messageText }
					api.post('messages', params, handler(event) {
						if (!event.error) {
							messages push: event.response.message
						}
					})
					messageText set:''
				})>
			</div>
		</div>
	}
	
}

