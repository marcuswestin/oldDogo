var delayed = require('std/delayed')
var parallel = require('std/parallel')
var Addresses = require('data/Addresses')
var Conversations = require('client/conversations')

module.exports = function renderFirstStep(view) {
	var welcomeDuration = 50
	
	setTimeout(_emailConnect, 150)
	// setTimeout(_phoneNumberConnect, 150)
	
	return div({ id:'connectUI1' },
		delayed(welcomeDuration * 2, function($el) {
			$('#connectUI1').append(div(_fadeIn,
				div('info', 'Connect to ', _renderLogoName, ' with'),
				div('button email', 'Email', button(_emailConnect)),
				div('button phoneNumber', 'Text Msg', button(_phoneNumberConnect)),
				div('button facebook', 'FB Connect', button(_facebookConnect)),
				div('notice',
					'When you connect, you agree to our ', link('Privacy Policy', '/privacy'), ' & ', link('Terms of Service', '/terms')
				)
			))
		})
	)
	
	function _fadeIn() {
		var id = tags.id()
		return [
			{ id:id }, style({ opacity:0 }), style(transition('opacity', welcomeDuration)),
			delayed(welcomeDuration, function() { $('#'+id).css({ opacity:1 }) })
		]
	}
	
	function _renderLogoName() {
		return div(icon('logoName', 56, 24), style({ display:'inline-block', marginTop:-6 }), style(translate.y(7)))
	}	
}

function _emailConnect() {
	gScroller.push({ step:'enterAddress', addressType:'email' })
}

function _phoneNumberConnect() {
	gScroller.push({ step:'enterAddress', addressType:'phone' })
}

var _facebookSession = null
function _facebookConnect() {
	var $button = $('#connectUI1 .facebook.button')
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
