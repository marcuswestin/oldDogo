var mysql = require('mysql')
var client = mysql.createClient({ host:'localhost', port:3306, user:'root' })
var asyncMap = require('std/asyncMap')

client.query('SHOW DATABASES', function(err, results) {
	if (err) { throw err }
	asyncMap(results, {
		iterate:function(result, next) {
			if (result.Database.match(/^dogo.*$/)) {
				console.log('drop database', result.Database)
				client.query('DROP DATABASE '+result.Database, [], next)
			} else {
				next()
			}
		},
		finish:function(err) {
			if (err) { throw err }
			client.end(function(err) {
				if (err) { throw err }
				console.log("Done dropping databases")
				require('./createDatabases')
			})
		}
	})
})
