import ../session

signup = {
	render = template() {
		request = null
		<div style={ textAlign:'center' }>
			sessionReq = null
			if sessionReq.loading {
				'Loading...'
			} else {
				foo = null
				<div class="button login">"Login"</div #tap.button(handler() {
					bridge.command('facebook.connect', null, handler(event) {
						if (!event.error) {
							sessionReq set: api.post('sessions', { facebook_access_token:event.response.accessToken }, handler(event) {
								if (!event.error) {
									res = event.response
									session.state set: 'authToken', res.authToken
									session.state set: 'account', res.account
									bridge.command('state.set', { key:'session', value:res })
								}
							})
						}
					})
				})>
				if sessionReq.error {
					'Error: 'sessionReq.error
				}
			}
		</div>
	}
	
}