var face = module.exports = {

	facebook: function(contact, showRibbon) {
		return div('face', showRibbon && contact.memberSince && div('member-ribbon'), style({
			width:50, height:50,
			background:'url("https://graph.facebook.com/'+contact.facebookId+'/picture") rgba(255, 255, 255, .4)'
		}))
	},
	
	account: function(accountId) {
		return face.facebook(contactsById[accountId])
	}

}
