BT = {
	url:function(module, path, params) {
		return '//blowtorch:9000/'+module+'/'+path+'?'+parseUrl.query.string(params)
	}
}

module.exports = {

	backgroundStyle:backgroundStyle,
	
	large: function(account, showRibbon, lazyLoad) {
		return facebookFace(account, showRibbon, lazyLoad, 75)
	},
	
	small:function(person) {
		return facebookFace(person, null, false, false)
	},
	
	mine:function(size) {
		return div('face', function($tag) {
			loadAccount(gState.myAccount().accountId, null, function(account) {
				$tag.css(backgroundStyle(account.facebookId, size))
			})
		})
	}
}

function backgroundStyle(facebookId, size) {
	if (!size) { size = 25 }
	var ratio = window.devicePixelRatio || 1
	var imageUrl = 'http://graph.facebook.com/'+facebookId+'/picture'+(size * ratio > 50 ? '?type=large' : '')
	var params = { url:imageUrl, cache:'Yup!', square:size * ratio, mimeType:'image/jpg' }
	return {
		background:'url("'+BT.url('BTImage', 'fetchImage', params)+'") rgba(240,240,255,.3) no-repeat',
		width:size, height:size, backgroundSize:size+'px auto'
	}
}

function facebookFace(account, showRibbon, lazyLoad, large) {
	return div('face', showRibbon && account.memberSince && style({ backgroundImage:image.backgroundUrl('badge') }),
		lazyLoad
			? [{ facebookId:account.facebookId }, style({ backgroundColor:'#fff' })]
			: style(backgroundStyle(account.facebookId, large))
	)
}
