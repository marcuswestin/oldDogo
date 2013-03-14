var BT = module.exports = {
	url:function(request, params) {
		return gAppInfo.config.serverUrl+'/'+request+'?'+parseUrl.query.string(params)
	}
}
