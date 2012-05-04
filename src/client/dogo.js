require('lib/jquery-1.7.2')

style = function(styles) { return { style:styles } }
create = require('std/create')
options = require('std/options')
map = require('std/map')
button = require('dom/button')

require('dom/tags').expose()

var makeScroller = require('dom/scroller'),
	viewport = require('dom/viewport'),
	bridge = require('./bridge')

var config = {}, state = {}, bridge

bridge.eventHandler = function(event) {
	var info
	switch(event.name) {
		case 'app.start':
			config = info
			renderApp()
			bridge.command('app.show')
			break
		case 'push.registerFailed':
			alert("Uh oh. Push registration failed")
			break
		case 'push.registered':
			state.set('pushToken', info.deviceToken)
			api.post('push_auth', { pushToken:info.deviceToken, pushSystem:'ios' })
			break
		case 'push.notification':
			alert(info.data.aps.alert)
			break
		default:
			alert('Got unknown event ' + JSON.stringify(event))
	}
}

window.onerror = function(e) { alert('err ' + e)}

var scroller = makeScroller()

var state

function renderApp() {
	div('app', viewport.fit,

		scroller.renderHead(45, function(view) {
			return div('head',
				scroller.stack.length > 1 && renderBackButton(),
				div('title', view.title || 'Dogo')
			)
			function renderBackButton() {
				return div('button back', button(function() {
					scroller.pop()
				}))
			}
		}),

		scroller.renderBody(2, function(view) {
			if (view.convo) {
				return 'convo'
			} else if (view.contact) {
				return 'contact'
			} else if (state.authToken) {
				return 'home'
			} else {
				return 'signup'
			}
		})
	).appendTo(document.body)
}

renderApp()