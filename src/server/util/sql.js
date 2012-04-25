module.exports = {
	joinProperties: joinProperties
}

function joinProperties(props) {
	return ' '+map(props, function(rawName, prettyName) {
		return rawName+' as '+prettyName
	}).join(', ')+' '
}
