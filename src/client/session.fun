import ./bridge
import localstorage
import alert

session = {
	
	authToken:null
	account:null
	loading:true
	
	load: handler() {
		localstorage.persist(session, 'session')
		session set: 'loading', false
		// bridge.command('state.load', null, handler(event) {
		// 	session.loading set: false
		// 	if (!event.error) {
		// 		res = event.response
		// 		session.authToken set: res.session.authToken
		// 		session.account set: res.session.account
		// 	}
		// })
	}
	
	clear: handler() {
		session set: 'authToken', null
		session set: 'account', null
	}
}
