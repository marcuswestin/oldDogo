var face = module.exports = function face(account, size) {
	return facebookFace(account, null, false, size)
}

face.large = function(account, showRibbon, lazyLoad) {
	return facebookFace(account, showRibbon, lazyLoad, 75)
}

face.small = function(account) {
	return facebookFace(account, null, false, 25)
}

face.backgroundStyle = backgroundStyle

face.mine = function myFace(size) {
	return div('face', style({ width:size, height:size }), function($tag) {
		loadAccount(gState.myAccount().accountId, null, function(account) {
			$tag.css(backgroundStyle(account.facebookId, size))
		})
	})
}

function backgroundStyle(facebookId, displaySize) {
	if (!displaySize) { displaySize = 25 }
	var ratio = window.devicePixelRatio || 1
	var size = displaySize*ratio
	var imageUrl = 'http://graph.facebook.com/'+facebookId+'/picture'+(size > 50 ? '?type=large' : '')
	var params = { url:imageUrl, cache:'Yup!', resize:size+'x'+size, mimeType:'image/jpg' }
	return {
		background:'url("'+BT.url('BTImage', 'fetchImage', params)+'") rgba(240,240,255,.3) no-repeat',
		width:displaySize, height:displaySize, backgroundSize:px(displaySize, displaySize)
	}
}

function facebookFace(account, showRibbon, lazyLoad, size) {
	return div('face',
		style({ width:size, height:size }),
		showRibbon && account.memberSince && style({ backgroundImage:image.backgroundUrl('badge') }),
		lazyLoad
			? [{ facebookId:account.facebookId }, style({ backgroundColor:'#fff' })]
			: style(backgroundStyle(account.facebookId, size))
	)
}
