var face = module.exports = {

	facebook: function(account, showRibbon, lazyLoad) {
		return div('face', showRibbon && account.memberSince && div('member-ribbon'),
			lazyLoad
				? [{ facebookId:account.facebookId }, style({ backgroundColor:'rgba(255, 255, 255, .4)' })]
				: style({ background:face.background(account.facebookId) })
		)
		// return div('face', showRibbon && account.memberSince && div('member-ribbon'), function($tag) {
		// 	var url = 'https://graph.facebook.com/'+account.facebookId+'/picture'
		// 	bridge.command('net.cache', { url:url, override:false }, function(err, res) {
		// 		if (err) { return }
		// 		$tag.css('background', 'url("'+url+'")')
		// 	})
		// })
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
