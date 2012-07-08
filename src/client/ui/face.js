var face = module.exports = {

	facebook: function(account, showRibbon, lazyLoad) {
		return div('face', showRibbon && account.memberSince && div('member-ribbon'),
			lazyLoad
				? [{ facebookId:account.facebookId }, style({ backgroundColor:'#fff' })]
				: style({ background:face.background(account.facebookId) })
		)
	},
	
	background:function(facebookId) {
		return 'url("http://graph.facebook.com/'+facebookId+'/picture") rgba(255, 255, 255, .4)'
	},
	
	loadAccount: function(accountId, showRibbon) {
		return div('face', function($tag) {
			loadAccount(accountId, null, function(account) {
				if (showRibbon && account.memberSince) {
					$tag.append(div('member-ribbon'))
				}
				$tag.css('background', face.background(account.facebookId))
			})
		})
	},
	
	loadFacebook:function(facebookId, showRibbon) {
		return div('face', function($tag) {
			loadFacebook(facebookId, null, function(account) {
				if (showRibbon && account.memberSince) {
					$tag.append(div('member-ribbon'))
				}
				$tag.css('background', face.background(account.facebookId))
			})
		})
	}

}
