module.exports = clearState

function clearState() {
	bridge.command('BTFiles.clearAll', function(err) {
		if (err) { return error(err) }
		bridge.command('app.restart')
	})
}
