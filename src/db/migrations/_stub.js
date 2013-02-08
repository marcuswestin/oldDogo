require('server/globals')
var config = require('server/config/devConfig')
db.config(config.db)

getData(function(stuff) {
	updateData(stuff, function() {
		
	})
})

function getData(callback) {
	log("Getting data")
	db.select("SELECT * FROM SOMEWHERE", [], function(err, stuff) {
		if (err) { throw err }
		log("Done getting data")
		callback(stuff)
	})
}

function updateData(stuff, callback) {
	console.log("Updating data")
	asyncEach(stuff, {
		parallel:4,
		iterate:function(thing, next) {
			log('processing', thing)
			db.updateOne("UPDATE thing SET property=? WHERE id=?", ['foo', thing.id], next)
		},
		finish:function(err) {
			if (err) { throw err }
			log('Done doing something else')
			callback()
		}
	})
}
