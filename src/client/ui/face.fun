import ../state

face = {

	facebook = template(contact) {
		<div class="face" style={
			width:50 height:50
			background:'url("https://graph.facebook.com/'+contact.facebookId+'/picture") rgba(100, 100, 100, .5)'
		}/>
	}

	account = template(accountId) {
		face.facebook(state.contactsById[accountId])
	}

}
