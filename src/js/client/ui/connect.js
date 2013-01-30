var delayed = require('std/delayed')
var Conversations = require('../conversations')
var parallel = require('std/parallel')
var Addresses = require('data/Addresses')

module.exports = {
	render: function(onConnected) {
		var scroller = makeScroller({
			numViews:2,
			duration:400,
			alwaysBounce:false,
			renderView:renderView
		})
		return div({ id:'connectView' }, brandGradient([viewport.width() / 2, 150], 50),
			div('logoIcon', icon('logoIcon-blank', 128, 128, 48, 0, 0, 0)),
			div({ id:'logoName' }, icon('logoName', 166, 72, 64, 0, 0, 0), style(translate(0, 0, 1000))),
			scroller
		)
		
		function renderView(view, info) {
			switch (info.index) {
				case 0: return function() {
					var duration = 400
					function _fader() {
						var id = tags.id()
						return [
							{ id:id }, style({ opacity:0 }), style(transition('opacity', duration)),
							delayed(duration, function() { $('#'+id).css({ opacity:1 }) })
						]
					}
					
					return div({ id:'connectUI1' },
						delayed(duration * 2, function($el) {
							$('#logoName').css(translate(0, -169, duration * 1.25))
							$('#connectUI1').append(div(style({ marginTop:300 }),
								_fader(),
								div('button connect',
									'Connect to ',
									div(icon('logoName', 56, 24), style({ display:'inline-block', marginTop:-6 }), style(translate.y(7))),
									button(_facebookConnect)
								),
								div('notice',
									'When you connect, you agree to our ', link('Privacy Policy', '/privacy'), ' & ', link('Terms of Service', '/terms')
								)
							))
						})
					)
				}
				case 1: return div(style({ marginTop:300 }),
					div('Welcome', JSON.stringify(view.person)),
					div('button', 'Enable Notifications', button(function() {
						$(this).text('Enabling...').addClass('active')
						bridge.command('push.register', function(err) {
							onConnected()
						})
					})),
					link('noNotifications', 'no thanks', function() {
						setTimeout(function() {
							var warning = "You must enable notifications for Dogo to work properly"
							return alert(warning)
							// if (!confirm(warning)) { return }
							onConnected()
						})
					})
				)
			}
			
			var _facebookSession = null
			function _facebookConnect() {
				var $button = $('#connectUI1 .connect.button')
				if ($button.hasClass('disabled')) { return }
				
				if (_facebookSession) {
					attemptLogin()
				} else {
					$button.text('Connecting...').addClass('active disabled')
					bridge.command('facebook.connect', { permissions:['email','friends_birthday'] }, function(err, data) {
						if (err || !data.facebookSession || !data.facebookSession.accessToken) {
							error('I was unable to connect to Facebook')
							$button.text('Try again').removeClass('active disabled')
							return
						}
						_facebookSession = data.facebookSession
						setTimeout(attemptLogin)
					})
				}
				
				function attemptLogin() {
					$button.text('Connecting...').addClass('active disabled')
					api.createSession({ facebookSession:_facebookSession }, function(err, person) {
						if (err || !person) {
							error('I was unable to connect to Dogo')
							$button.text('Try again').removeClass('active disabled')
							return
						}
						
						$button.text('Connected!')
						events.fire('person.connected', person)
						setTimeout(function() { scroller.push({ person:person }), 250 })
						
						mergeConversations()
					})
				}
				
				function mergeConversations() {
					parallel(
						_fetchConversations, _fetchFacebookFriends,
						function(err, conversations, fbFriends) {
							if (err) { return }
							var friendsByFbId = {}
							each(fbFriends, function(fbFriend) {
								friendsByFbId[fbFriend.id] = fbFriend
							})
							each(conversations, function(convo) {
								var soloPerson = (convo.people.length == 1 && convo.people[0])
								if (soloPerson && soloPerson.facebookId) {
									delete friendsByFbId[soloPerson.facebookId]
								}
							})
							
							var newAddresses = map(friendsByFbId, function(fbFriend) {
								return { type:Addresses.types.facebook, address:fbFriend.id, name:fbFriend.name }
							})
							
							newAddresses = newAddresses.slice(0,10) // for testing
							Conversations.addAddresses(newAddresses, function(err) {
								if (err) { return error(err) }
							})
						}
					)
					
					function _fetchConversations(callback) {
						Conversations.fetch(function(err, conversations) {
							if (err) {
								error("I'm sorry, I am unable to fetch your conversations from my server.")
								return callback(err)
							}
							callback(null, conversations)
						})
					}
					
					function _fetchFacebookFriends(callback) {
						bridge.command('facebook.request', { path:'/me/friends?fields=id,name,birthday' }, function(err, response) {
							if (err) {
								error("I'm sorry. I was unable to fetch your friends from Facebook.")
								return callback(err)
							}
							callback(null, response.data)
						})
					}
				}
			}
		}
	},
	slideOut: function() {
		var duration = 750
		$('#connectView')
			.css(transition('opacity', duration)).css('opacity', 0)
		setTimeout(function() {
			$('#connectView').css(translate.y(-viewport.height()-100, 0))
		}, duration)
		// Warning: Actually removing the conenct view after the transition has completed causes an error where the screen becomes unresponsive. ¿Que?
	}
}

events.on('push.registerFailed', function(info) {
	alert("Oh no! Notifications were not enabled. Go to your settings app and enable notifications for Dogo.")
})
