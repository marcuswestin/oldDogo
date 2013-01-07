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
	
	var defaultResults = getDefaultResults(searchItems)
	
	var searchList = list({
		items:defaultResults,
		renderItem:renderResult,
		onSelect:selectResult,
		renderEmpty:renderEmpty
	})
	
	registerTextInputEventListeners(searchItems, defaultResults, searchList)
	
	return div('searchResults', searchList)

	function getDefaultResults(searchItems) {
		// First fill with up to 4 recent convos.
		// Then pack with 20 - (# recent convos) random convos, by starting at a random index
		// in the list of convos and avoiding the first N convos (N == baseIndex).
		var defaultResults = []
		var numDefaultResults = clip(searchItems.length, 0, 20)
		var baseIndex = 0
		while (baseIndex < 4 && baseIndex < numDefaultResults) { // select up to 4 recent convos
			if (!searchItems[baseIndex].conversation.lastMessage) { break }
			defaultResults.push(searchItems[baseIndex])
			baseIndex += 1
		}
		var randIndex = Math.floor(Math.random() * (searchItems.length - baseIndex)) + baseIndex
		while (defaultResults.length < numDefaultResults) {
			defaultResults.push(searchItems[randIndex])
			randIndex = ((randIndex + 1) % (searchItems.length - baseIndex)) + baseIndex
		}
		
		return defaultResults
	}

	function renderResult(result, i) {
		var classNames = 'result'
		if (i == 0) { classNames += ' topLeft' }
		if (i == 3) { classNames += ' topRight' }
		return div(classNames, style({ width:resultSize, height:resultSize }),
			face(result.conversation.person, resultSize),
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
		searchList.empty().append(results, { updateItems:false })
	})
	
	var onTextInputReturn = events.on('textInput.return', function() {
		searchList.selectIndex(0)
	})
	
	events.once('keyboard.willHide', function() {
		events.off('textInput.return', onTextInputReturn)
		events.off('textInput.didChange', onTextChange)
	})
}
