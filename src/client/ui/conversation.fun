import alert
import viewport
import text

conversation = {
	render = template(convo, contact) {
		messagesReq = api.get('messages', { withAccountId:convo.withAccountId, withFacebookId:contact.facebookId })
		messages = messagesReq.response.messages
		<div class="conversation">
			<div class="messages" style={ height:viewport.size.height - 80 'overflow':'scroll' }>
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
					body = text.trim(messageText.copy())
					if body is ! '' {
						params = { toAccountId:convo.withAccountId, toFacebookId:contact.facebookId, body:body }
						api.post('messages', params, handler(event) {
							if (!event.error) {
								messages push: event.response.message
							}
						})
						messageText set:''
					}
				})>
			</div>
		</div>
	}
	
}

