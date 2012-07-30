require('../../client/globals')
var conversation = require('../../client/ui/conversation')


;(function() {
	var requestIds = parseUrl(location).getSearchParam('request_ids')
	if (requestIds) {
		var facebookRequestId = requestIds.split(',').pop()
		api.connect({ facebookRequestId:facebookRequestId }, function(err, res) {
			if (err) { return error(err) }
			api.get('facebook_canvas/conversation', { facebookRequestId:facebookRequestId }, function(err, res) {
				if (err) { return error(err) }
				viewport.fit($('#viewport'))
				$('#viewport').append(
					div('dogoApp', style({ 'overflow-y':'scroll', '-webkit-overflow-scrolling':'touch' }),
						conversation.render({
							messages:res.messages,
							myAccountId:res.facebookRequest.toAccountId
						})
					)
				)
			})
		})
	}

	console.log('requestIds', requestIds)
	// api.get('messages', {})
})()