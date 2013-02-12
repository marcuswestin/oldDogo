var fs = require('fs')
var mysql = require('mysql')
var map = require('std/map')
var asyncEach = require('std/asyncEach')
var secrets = require('server/config/secrets').dev()

var peopleSchema = fs.readFileSync('src/db/people-schema.sql').toString()
var conversationsSchema = fs.readFileSync('src/db/conversations-schema.sql').toString()
var lookupSchema = fs.readFileSync('src/db/lookup-schema.sql').toString()

var client = mysql.createClient({ host:secrets.db.host, port:3306, user:secrets.db.admin.user, password:secrets.db.admin.password })

var peopleShards = map([1,2,3,4], function(shardIndex) { return 'dogoPeople'+shardIndex })
var conversationsShards = map([1,2,3,4], function(shardIndex) { return 'dogoConversations'+shardIndex })
var lookupShard = 'dogoLookup'

var appUser = { name:secrets.db.user, password:secrets.db.password }
createUser(appUser.name, appUser.password, function(err) {
	if (err) { throw err }
	_createDatabase('dogoLookup', appUser.name, lookupSchema, function() {
		_createDatabases(peopleShards, peopleSchema, function() {
			_createDatabases(conversationsShards, conversationsSchema, function() {
				console.log("All done!")
				client.end(function(err) {
					if (err) { throw err }
				})
			})
		})
	})
})

function _createDatabases(shards, schema, callback) {
	asyncEach(shards, {
		iterate: function(shard, next) {
			_createDatabase(shard, appUser.name, schema, next)
		},
		finish:function(err) {
			if (err) { throw err }
			callback()
		}
	})
}

function createUser(username, password, callback) {
	console.log('drop & create user', username)
	client.query('DROP USER '+username, [], function() {
		client.query('DROP USER '+username+'@localhost', [], function() {
			client.query("CREATE USER '"+username+"'@'localhost' IDENTIFIED BY '"+password+"'", [], function(err, res) {
				if (err) { throw err }
				client.query("CREATE USER '"+username+"'@'%' IDENTIFIED BY '"+password+"'", [], function(err, res) {
					if (err) { throw err }
					console.log('granting priveleges')
					asyncEach(peopleShards.concat(conversationsShards).concat(lookupShard), {
						iterate: function(shardName, next) {
							client.query("GRANT SELECT, UPDATE, INSERT ON "+shardName+".* TO '"+username+"'@'%'", next)
						},
						finish:function(err) {
							if (err) { throw err }
							callback()
						}
					})
				})
			})
		})
	})
}

function _createDatabase(shardName, username, schema, callback) {
	console.log('create database', shardName)
	client.query('CREATE DATABASE IF NOT EXISTS '+shardName, function(err, res) {
		var databaseAlreadyExisted = (res.warningCount == 1)
		if (databaseAlreadyExisted) {
			console.log("Skip", shardName, '(already exists)')
			callback()
		} else {
			client.query('USE '+shardName + '; \n'+schema, [], function(err) {
				if (err) {
					console.warn("ERROR creating schema", err.message, err.sql)
					throw err
				}
				callback()
			})
		}
	})
}
