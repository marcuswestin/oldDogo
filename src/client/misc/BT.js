var BT = module.exports = {
	url:function(request, params) {
		return gConfig.serverUrl+'/'+request+'?'+parseUrl.query.string(params)
	}
}
