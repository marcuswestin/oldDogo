import ../state
import ../util

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
							sessionReq set: api.post('sessions', { facebook_access_token:event.response.accessToken }, util.handleLogin)
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