var face = module.exports = function face(account, size, styles) {
	return facebookFace(account, size, styles)
}

face.mine = function myFace(size, styles) {
	return facebookFace(gState.myAccount(), size, styles)
}

face.backgroundStyle = backgroundStyle

function backgroundStyle(facebookId, displaySize) {
	if (!displaySize) { displaySize = 25 }
	var ratio = window.devicePixelRatio || 1
	var size = displaySize*ratio
	var imageUrl = 'http://graph.facebook.com/'+facebookId+'/picture'+(size > 50 ? '?type=large' : '')
	var params = { url:imageUrl, cache:'Yup!', resize:size+'x'+size, mimeType:'image/jpeg' }
	return {
		background:'url('+BT.url('BTImage', 'fetchImage', params)+') rgba(240,240,255,.3) no-repeat',
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
