var face = module.exports = {

	facebook: function(account, showRibbon) {
		return div('face', showRibbon && account.memberSince && div('member-ribbon'), style({
			background:'url("https://graph.facebook.com/'+account.facebookId+'/picture") rgba(255, 255, 255, .4)'
		}))
		// return div('face', showRibbon && account.memberSince && div('member-ribbon'), function($tag) {
		// 	var url = 'https://graph.facebook.com/'+account.facebookId+'/picture'
		// 	bridge.command('net.cache', { url:url, override:false }, function(err, res) {
		// 		if (err) { return }
		// 		$tag.css('background', 'url("'+url+'")')
		// 	})
		// })
	},
	
	load: function(accountId, showRibbon) {
		return div('face', function($tag) {
			loadAccount(accountId, null, function(account) {
				if (showRibbon && account.memberSince) {
					$tag.append(div('member-ribbon'))
				}
				$tag.css('background', 'url("https://graph.facebook.com/'+account.facebookId+'/picture") rgba(255, 255, 255, .4)')
			})
		})
	}

}
