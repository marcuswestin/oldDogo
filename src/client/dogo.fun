import console
import alert

import app
import tap
import viewport
import ui/lists

import ./config
import ./bridge
import ./util
import ./state
import ./api
import ./state
import ./ui/signup
import ./ui/head
import ./ui/face
import ./ui/home
import ./ui/conversation

viewport.fitToDevice()
<link rel="stylesheet/stylus" type="css" href="./style/dogo.styl" />

uiSize = {
	height:viewport.size.height
	width:viewport.size.width is > 800 ? 800 : viewport.size.width
}
scroller = lists.makeScroller(uiSize, { headSize:45 })

app.whenLoaded(handler() {
	bridge.eventHandler set: handler(event) {
		info = event.info
		switch (event.name) {
			case 'app.start':
				config set:info
				bridge.command('app.show')
			case 'push.registerFailed':
				alert("Uh oh. Push registration failed")
			case 'push.registered':
				state.account set:'pushToken', info.deviceToken
				api.post('push_auth', { pushToken:info.deviceToken, pushSystem:'ios' })
			case 'push.notification':
				alert(info.data.aps.alert)
			default:
				alert('Got unknown event', event)
		}
	}
	
	localstorage.persist(state, 'state')
})

<script>
	window.onerror = function(e) { alert('err ' + e)}
</script>

<div style=uiSize style={ margin:'0 auto' }>
	head.render(scroller)
	scroller.renderBody(template(view) {
		if view.convo {
			conversation.render(view.convo, view.convo.contact)
		} else if view.contact {
			conversation.render(null, view.contact)
		} else if state.authToken {
			home.render(scroller)
		} else {
			signup.render()
		}
	})
</div>

