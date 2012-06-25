var searchButton = require('./searchButton')
var home = require('./home')
var connect = require('./connect')
var conversation = require('./conversation')

module.exports = {
	createAndRender:createAndRenderScroller
}

function createAndRenderScroller() {
	gScroller = tags.scroller({ onViewChange:function onViewChange() { events.fire('view.change') }, duration:400 })
	$(document.body).append(div('app', viewport.fit))
	$('.app')
		.append(gScroller.renderHead(gHeadHeight, scrollerRenderHeadContent))
		.append(gScroller.renderBody(3, scrollerRenderBodyContent))
}

function scrollerRenderHeadContent($head, view, viewBelow, fromView) {
	var stackIsAboveHome = (gScroller.stack.length > (gScroller.hasConnectView ? 2 : 1))
	var stackIsAboveConnect = (gScroller.stack.length > (gScroller.hasConnectView ? 1 : 0))
	var stackIsAtHome = gState.authToken() && (gScroller.stack.length == (gScroller.hasConnectView ? 2 : 1)) // hack - hasConnectView is not set yet
	var showBackButton = viewBelow && stackIsAboveHome
	var showSearch = stackIsAtHome
	$head.append(div('head',
		(appInfo.config.mode == 'dev') && div('devBar',
			div('button', 'R', button(function() { bridge.command('app.restart') })),
			div('button', 'X', button(function() { gState.clear(); bridge.command('app.restart') })),
			div('button', 'U', button(function() { gState.checkNewVersion() }))
		),
		showBackButton && renderBackButton(viewBelow.title || 'Home'),
		div('title', view.title || 'Dogo'),
		showSearch && searchButton.render()
	))
	function renderBackButton(title) {
		return div('button back', title, button(function() {
			gScroller.pop()
		}))
	}
}

events.on('searchButton.results', function(info) {
	if (info.showing) {
		$('.scroller-head').addClass('flat')
	} else {
		$('.scroller-head').removeClass('flat')
	}
})


function scrollerRenderBodyContent($body, view) {
	console.log("scroller.scrollerRenderBodyContent", JSON.stringify(view))
	if (view.conversation) {
		conversation.render($body, view.conversation)
		buildContactsIndex()
	} else if (gState.authToken()) {
		home.render($body, view)
		buildContactsIndex()
	} else {
		gScroller.hasConnectView = true
		connect.render($body, function connectRender(res, facebookSession) {
			var contacts = res.contacts
			var contactsByAccountId = gState.cache['contactsByAccountId'] || {}
			var contactsByFacebookId = gState.cache['contactsByFacebookId'] || {}
			each(contacts, function(contact) {
				if (contact.accountId) {
					contactsByAccountId[contact.accountId] = contact
				}
				contactsByFacebookId[contact.facebookId] = contact
			})
			
			gState.set('contactsByAccountId', contactsByAccountId)
			gState.set('contactsByFacebookId', contactsByFacebookId)
			gState.set('sessionInfo', { myAccount:res.account, authToken:res.authToken, facebookSession:facebookSession })
			gScroller.push({ title:'Dogo' })

			bridge.command('push.register')
			
			buildContactsIndex()
		})
	}
	console.log("scroller.scrollerRenderBodyContent done")
}

function buildContactsIndex() {
	var facebookIdToNames = {}
	each(gState.cache['contactsByFacebookId'], function(contact, facebookId) {
		var names = contact.name.split(' ')
		facebookIdToNames[facebookId] = names
	})
	bridge.command('index.build', { name:'facebookIdByName', payloadToStrings:facebookIdToNames })
}
