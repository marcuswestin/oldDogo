var fs = require('fs')
var mysql = require('mysql')
var serialMap = require('std/serialMap')
var map = require('std/map')

var dogoSchema = fs.readFileSync('src/db/dogo-schema.sql').toString()
var lookupSchema = fs.readFileSync('src/db/lookup-schema.sql').toString()

var client = mysql.createClient({ host:'localhost', port:3306, user:'root', password:'' })
// var client = mysql.createClient({ host:'dogo-db1.cqka8vcdrksp.us-east-1.rds.amazonaws.com', port:3306, user:'dogo_rw', password: }) // rds master user

var dogoShards = map([1,2,3,4], function(shardIndex) { return 'dogo'+shardIndex })
var lookupShard = 'dogoLookup'

var user = { name:'dogoApp', password:'dogopass9' } // also in config/[prod|dev]/
createUser(user.name, user.password, function(err) {
	checkError(err)
	createDatabase('dogoLookup', user.name, lookupSchema, function(err) {
		checkError(err)
		serialMap(dogoShards, {
			iterate: function(dogoShard, next) {
				createDatabase(dogoShard, user.name, dogoSchema, next)
			},
			finish:function(err) {
				checkError(err)
				console.log("All done!")
				client.end(function(err) {
					checkError(err)
				})
			}
		})
	})
})

function createUser(username, password, callback) {
	console.log('drop & create user', username)
	client.query('DROP USER '+username, [], function() {
		client.query('DROP USER '+username+'@localhost', [], function() {
			client.query("CREATE USER '"+username+"'@'localhost' IDENTIFIED BY '"+password+"'", [], function(err, res) {
				checkError(err)
				client.query("CREATE USER '"+username+"'@'%' IDENTIFIED BY '"+password+"'", [], function(err, res) {
					checkError(err)
					console.log('granting priveleges')
					serialMap(dogoShards.concat(lookupShard), {
						iterate: function(shardName, next) {
							client.query("GRANT SELECT, UPDATE, INSERT ON "+shardName+".* TO '"+username+"'@'%'", next)
						},
						finish:function(err) {
							checkError(err)
							callback()
						}
					})
				})
			})
		})
	})
}

function createDatabase(shardName, username, schema, callback) {
	console.log('create database', shardName)
	client.query('CREATE DATABASE IF NOT EXISTS '+shardName, function(err, res) {
		var databaseAlreadyExisted = (res.warningCount == 1)
		if (databaseAlreadyExisted) {
			console.log("Skip", shardName, '(already exists)')
			callback()
		} else {
			client.query('USE '+shardName + '; \n'+schema, [], function(err) {
				if (err) { console.warn("ERROR creating schema", err.message, err.sql) }
				callback()
			})
		}
	})
}

function checkError(err) {
	if (err) { throw new Error(err) }
}
