var request = require('request')

module.exports = {
	get: get
}

function get(path, params, callback) {
	request.get({ url:'https://graph.facebook.com/' + path, qs:params }, bind(this, function(err, res) {
		if (err) { return callback(err) }
		try { res = JSON.parse(res.body) }
		catch(e) { return callback(e) }
		callback(null, res)
	}))
}