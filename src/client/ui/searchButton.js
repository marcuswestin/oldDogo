var trim = require('std/trim')

module.exports = {
	render:render
}

function render() {
	var resultSize = 80

	var searchItems = map(gState.get('conversations'), function(conversation) {
		var names = conversation.person.fullName.split(' ')
		return { names:names, conversation:conversation }
	})
	
	var defaultResults = searchItems.slice(0, 20) // default to the top conversations

	var searchList = list({
		items:defaultResults,
		renderItem:renderResult,
		onSelect:selectResult,
		renderEmpty:renderEmpty
	})
	
	registerTextInputEventListeners(searchItems, defaultResults, searchList)
	
	return div('searchResults', searchList)

	function renderResult(result, i) {
		if (!result.face) {
			result.face = face(result.conversation.person, resultSize).__render()
		}
		var classNames = 'result'
		if (i == 0) { classNames += ' topLeft' }
		if (i == 3) { classNames += ' topRight' }
		return div(classNames, style({ width:resultSize, height:resultSize }),
			result.face,
			div('names', result.conversation.person.fullName)
		)
	}
	
	function selectResult(result) {
		bridge.command('textInput.hide')
		var view = { conversation:result.conversation }
		gScroller.set({ view:view, index:1, render:true })
	}
	
	function renderEmpty() {
		return div('ghostTown dark', "Type a friend's name")
	}
}

function registerTextInputEventListeners(searchItems, defaultResults, searchList) {
	var onTextChange = events.on('textInput.didChange', function onTextChange(info) {
		var searchString = trim(info.text)
		if (!searchString) {
			var results = defaultResults
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
		var maxResults = 8 * 5
		if (results.length > maxResults) {
			results = results.slice(0, maxResults)
		}
		searchList.empty().append(results)
	})
	
	var onTextInputReturn = events.on('textInput.return', function() {
		searchList.selectIndex(0)
	})
	
	events.once('keyboard.willHide', function() {
		events.off('textInput.return', onTextInputReturn)
		events.off('textInput.didChange', onTextChange)
	})
}
