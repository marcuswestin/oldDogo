var face = module.exports = function face(account, size, styles) {
	return facebookFace(account, size, styles)
}

face.large = function(account) {
	return facebookFace(account, 75)
}

face.small = function(account) {
	return facebookFace(account, false, 25)
}

face.backgroundStyle = backgroundStyle

face.mine = function myFace(size, styles) {
	return div('face', style({ width:size, height:size }), function($tag) {
		loadAccount(gState.myAccount().accountId, null, function(account) {
			$tag.css(backgroundStyle(account.facebookId, size)).css(styles || {})
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

function facebookFace(account, size, styles) {
	return div('face',
		style({ width:size, height:size }),
		style(backgroundStyle(account.facebookId, size)),
		style(styles)
	)
}
