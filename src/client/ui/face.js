var BT = {
	url:function(module, path, params) {
		return '//blowtorch:9000/'+module+'/'+path+'?'+parseUrl.query.string(params)
	}
}

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
		var size = large ? 50 : 25
		var imageUrl = 'http://graph.facebook.com/'+facebookId+'/picture'+(large ? '?type=normal' : '')
		var params = { url:imageUrl, cache:'cache', resize:size+'x^', mimeType:'image/jpg' }
		return {
			background:'url("'+BT.url('BTImage', 'fetchImage', params)+'") transparent no-repeat',
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
