var face = module.exports = {

	facebook: function(contact) {
		return div('face', style({
			width:50, height:50,
			background:'url("https://graph.facebook.com/'+contact.facebookId+'/picture") rgba(100, 100, 100, .5)'
		}))
	},
	
	account: function(accountId) {
		if (!state.get('contactsById')) { return }
		return face.facebook(state.get('contactsById')[accountId])
	}

}
