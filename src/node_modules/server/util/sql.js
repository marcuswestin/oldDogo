module.exports = {
	selectFrom:selectFrom
}

function joinProperties(props) {
	return ' '+map(props, function(rawName, prettyName) {
		return rawName+' as '+prettyName
	}).join(', ')+' '
}

function selectFrom(table, props) {
	return 'SELECT ' + joinProperties(props) + ' FROM ' + table + '\n'
}