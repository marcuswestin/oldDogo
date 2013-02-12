var mysql = require('mysql')
var secrets = require('server/config/secrets').dev()
var asyncMap = require('std/asyncMap')

var client = mysql.createClient({ host:secrets.db.host, port:3306, user:secrets.db.admin.user, password:secrets.db.admin.password })

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
