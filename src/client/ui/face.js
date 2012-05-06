var face = module.exports = {

	facebook: function(account, showRibbon) {
		return div('face', showRibbon && account.memberSince && div('member-ribbon'), style({
			background:'url("https://graph.facebook.com/'+account.facebookId+'/picture") rgba(255, 255, 255, .4)'
		}))
	}

}
