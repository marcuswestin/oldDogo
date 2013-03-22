var trim = require('std/trim')

module.exports = {
	render:render
}

var sizes = {}
var numCols = 3
events.on('app.start', function() {
	sizes.result = Math.floor(viewport.width() / numCols)
	sizes.padding = viewport.width() - sizes.result*numCols
})

function render() {
	var searchItems = map(gState.get('conversations'), function(conversation) {
		var names = conversation.people[0].name.split(' ')
		return { names:names, conversation:conversation }
	})
	
	var defaultResults = getDefaultResults(searchItems)
	
	var searchList = list({
		items:defaultResults,
		renderItem:renderResult,
		onSelect:selectResult,
		renderEmpty:renderEmpty
		// onUpdated:function() {
		// 	searchList.find('.faceHolder').replaceWith(function() {
		// 		return getFace($(this).attr('facebookId'))
		// 	})
		// }
	})
	
	registerTextInputEventListeners(searchItems, defaultResults, searchList)
	
	var padding1 = Math.floor(sizes.padding / 2)
	var padding2 = sizes.padding - padding1
	return div('searchResults', style({ padding:px(padding1, padding2, padding1, padding1) }), searchList, div('clear', style({ paddingBottom:1 })))

	function getDefaultResults(searchItems) {
		// First fill with up to N recent convos.
		// Then pack with X - (# recent convos) random convos, by starting at a random index
		// in the list of convos and avoiding the first N convos (N == baseIndex).
		var defaultResults = []
		var numRecentConvos = numCols * 3
		var numDefaultResults = clip(searchItems.length, 0, numCols * 16)
		var baseIndex = 0
		while (baseIndex < numRecentConvos && baseIndex < numDefaultResults) { // select up to 4 recent convos
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
		return div(classNames, style({ width:sizes.result - 3, height:sizes.result }),
			div(face(result.conversation.people[0], { size:sizes.result })),
			div('names', result.conversation.people[0].name)
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
		var maxResults = 3 * 40
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