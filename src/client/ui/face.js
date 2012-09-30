var face = module.exports = {

	large: function(account, showRibbon, lazyLoad) {
		return face.facebook(account, showRibbon, lazyLoad, true)
	},
	
	small:function(person) {
		return face.facebook(person, null, false, false)
	},
	
	facebook: function(account, showRibbon, lazyLoad, large) {
		return div('face', showRibbon && account.memberSince && div('member-ribbon'),
			lazyLoad
				? [{ facebookId:account.facebookId }, style({ backgroundColor:'#fff' })]
				: style(face.backgroundStyle(account.facebookId, large))
		)
	},
	
	backgroundStyle:function(facebookId, large) {
		var postFix = large ? '?type=normal' : ''
		var size = large ? 50 : 25
		return {
			background:'url("http://graph.facebook.com/'+facebookId+'/picture'+postFix+'") transparent no-repeat',
			width:size, height:size, backgroundSize:size+'px auto'
		}
	},
	
	loadAccount: function(accountId, showRibbon) {
		return div('face', function($tag) {
			loadAccount(accountId, null, function(account) {
				if (showRibbon && account.memberSince) {
					$tag.append(div('member-ribbon'))
				}
				$tag.css(face.backgroundStyle(account.facebookId))
			})
		})
	},
	
	loadFacebook:function(facebookId, showRibbon) {
		return div('face', function($tag) {
			loadFacebook(facebookId, null, function(account) {
				if (showRibbon && account.memberSince) {
					$tag.append(div('member-ribbon'))
				}
				$tag.css(face.backgroundStyle(account.facebookId))
			})
		})
	},
	
	mine:function() {
		return face.loadAccount(gState.myAccount().accountId)
	}

}
