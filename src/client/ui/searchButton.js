var trim = require('std/trim')

module.exports = {
	render:renderSearchButton,
	renderSearchInput:renderSearchInput
}

function renderSearchButton() {
	return div('search-control',
		div('search', icon(32, 21, 'white/112-group', 12, 8), button(renderSearchInput))
	)
}

function renderSearchInput() {
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
	var searchList
	var $searchResults = $(div('searchResults'))
		.css({ maxHeight:viewport.height() - gHeadHeight - gKeyboardHeight })
		.append(searchList = list({
			items:[],
			onSelect:selectSearchResult,
			renderItem:function renderSearchResult(result) {
				return gRenderConversation(result.conversation)
			},
			renderEmpty:function() {
				return div('ghostTown dark', "Type a friend's name")
			}
		}))
		.appendTo($('.dogoApp .tags-scroller-body'))

	var searchItems = map(gState.get('conversations'), function(conversation) {
		return {
			names: conversation.person.fullName.split(' '),
			conversation: conversation
		}
	})
	
	events.on('textInput.didChange', onTextChange=function onTextChange(info) {
		if (hidden) { return }
		var searchString = trim(info.text)
		if (!searchString) {
			var results = []
		} else {
			var regexp = new RegExp('^'+trim(info.text), 'i')
			var results = _.filter(searchItems, function(item) {
				var names = item.names
				for (var i=0; i<names.length; i++) {
					if (names[i].match(regexp)) { return true }
				}
				return false
			})
		}
		
		searchList.empty().append(results)
		events.fire('searchButton.results', { showing:true })
		
		// var searchString = trim(info.text).toLowerCase().replace(/[\\D\\W]/g, '')
		// var params = { name:'facebookIdByName', searchString:info.text }
		// bridge.command('index.lookup', params, function renderSearchMatches(err, res) {
		// 	if (err) { return error(err) }
		// 	if (hidden) { return }
		// 	$searchResults.empty().append(div('people', list({ items:res.matches, onSelect:onSelect, renderItem:function renderFbMatch(facebookId) {
		// 		return div('person loading', 'Loading...', function($match) {
		// 			loadFacebookId(facebookId, function(account) {
		// 				$match.removeClass('loading').empty().append(div(
		// 					face.facebook(account, true),
		// 					div('name', account.name)
		// 				))
		// 			})
		// 		}, div('clear'))
		// 	}})))
		// 	
		// 	if (res.matches.length == 0) {
		// 		$searchResults.append(div('ghostTown dark', searchString ? 'No matches' : "Type a friend's name"))
		// 	}
		// 	
		// })
	})
	events.on('textInput.return', function() {
		searchList.selectIndex(0)
		hideInput()
	})
	
	bridge.command('textInput.show', {
		at:pos0,
		returnKeyType:'Go',
		contentInset: [0,0,0,-10]
	})
	
	function selectSearchResult(result) {
		hideInput()
		var view = { conversation:result.conversation }
		gScroller.set({ view:view, index:1, render:true })
	}
	
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
}
