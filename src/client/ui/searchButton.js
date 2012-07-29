var trim = require('std/trim')

module.exports = {
	render:renderSearchButton
}

function renderSearchButton() {
	return $search = $(div('search-control',
		div('button search', div('icon'), button(function() {
			var margin = 4
			var width = viewport.width() - margin*2
			var height = 37
			var y = margin
			var pos0 = { x:margin+width, y:y, width:0, height:height }
			var pos1 = { x:0+margin, y:y, width:width, height:height }
			var animateDuration
			var hidden = false
			events.once('keyboard.willShow', function(info) {
				animateDuration = info.keyboardAnimationDuration
				bridge.command('textInput.animate', {
					duration:animateDuration,
					to:pos1
				})
			})
			events.once('keyboard.willHide', hideInput)
			var onTextChange
			var $searchResults = $(div('searchResults'))
				.css({ maxHeight:viewport.height() - gHeadHeight - gKeyboardHeight })
				.append(div('ghostTown dark', "Type a friend's name"))
				.appendTo($('.dogoApp > .scroller-body'))
			events.on('textInput.didChange', onTextChange=function onTextChange(info) {
				var searchString = trim(info.text).toLowerCase().replace(/[\\D\\W]/g, '')
				var params = { name:'facebookIdByName', searchString:info.text }
				bridge.command('index.lookup', params, function renderSearchMatches(err, res) {
					if (err) { return error(err) }
					if (hidden) { return }
					$searchResults.empty().append(div('people', list({ items:res.matches, onSelect:onSelect, renderItem:function renderFbMatch(facebookId) {
						return div('person loading', 'Loading...', function($match) {
							loadFacebookId(facebookId, function(account) {
								$match.removeClass('loading').empty().append(div(
									face.facebook(account, true),
									div('name', account.name)
								))
							})
						}, div('clear'))
					}})))
					
					if (res.matches.length == 0) {
						$searchResults.append(div('ghostTown dark', searchString ? 'No matches' : "Type a friend's name"))
					}
					
					events.fire('searchButton.results', { showing:true })
				})
				function onSelect(facebookId, id, $el, $event) {
					$event.preventDefault()
					hideInput()
					var contact = gState.cache['contactsByFacebookId'][facebookId]
					var title = (contact.name || 'Friend')
					var conversation = { facebookId:facebookId }
					gScroller.push({ title:title, conversation:conversation })
				}
			})
			events.on('textInput.return', hideInput)
			
			bridge.command('textInput.show', {
				at:pos0,
				returnKeyType:'Done',
				contentInset: [0,0,0,-10]
			})
			
			function hideInput() {
				hidden = true
				events.off('textInput.return', hideInput)
				$searchResults.remove()
				bridge.command('textInput.animate', {
					blur:true,
					duration:animateDuration,
					to:pos0
				})
				events.off('textInput.didChange', onTextChange)
				events.fire('searchButton.results', { showing:false })
				setTimeout(function() {
					bridge.command('textInput.hide')
				}, animateDuration * 1000)
			}
		}))
	))
}
