var mysql = require('mysql')

var connectionBase = {
	selectOne: function(ctx, query, args, callback) {
		this.query(ctx, query, args, function(err, rows) {
			if (!err && rows.length > 1) { err = "Got more rows than expected" }
			callback.call(this, err, !err && rows[0])
		})
	},
	select:function(ctx, query, args, callback) {
		this.query(ctx, query, args, function(err, rows) {
			callback.call(this, err, !err && rows)
		})
	},
	insert:function(ctx, query, args, callback) {
		this.query(ctx, query, args, function(err, info) {
			if (!err && !info.insertId) { err = "Did not recieve an insertId" }
			callback.call(this, err, !err && info.insertId)
		})
	},
	updateOne:function(ctx, query, args, callback) {
		this.query(ctx, query, args, function(err, info) {
			if (!err && info.affectedRows > 1) { err = "Updated more rows than expected" }
			callback.call(this, err, !err && info.insertId)
		})
	},
	time: function() {
		return Math.floor(new Date().getTime() / 1000)
	}
}

module.exports = proto(connectionBase,
	function(host, db, user, password) {
		this._poolSize = 4
		this._pool = map(new Array(this._poolSize), function() {
			console.log("Create client", { host:host, port:3306, user:user, password:'*****' }, 'USE '+db)
			var client = mysql.createClient({ host:host, port:3306, user:user, password:password })
			client.query('USE '+db)
			return client
		})
		this._queue = []
		this._poolSize = this._pool.length
	}, {
		transact: function(ctx, fn) {
			if (!fn) {
				fn = ctx
				ctx = this
			}
			this._takeConnection(function(conn) {
				fn.call(ctx, Transaction(this, conn))
			})
		},
		query: function(ctx, query, args, callback) {
			this._takeConnection(function(conn) {
				var self = this
				conn.query(query, args, function(err) {
					if (err) { err = logError(err, query, args) }
					self._returnConnection(conn)
					callback.apply(ctx, arguments)
				})
			})
		},
		_takeConnection: function(fn) {
			if (!this._pool.length) {
				this._queue.push(fn)
			} else {
				fn.call(this, this._pool.pop())
			}
		},
		_returnConnection: function(conn) {
			if (this._queue.length) {
				var fn = this._queue.shift(), self = this
				process.nextTick(function() { fn.call(self, conn) })
			} else {
				this._pool.push(conn)
			}
		}
	}
)

var Transaction = proto(connectionBase,
	function(db, conn) {
		this.db = db
		this._conn = conn
		this._conn.query('START TRANSACTION')
	}, {
		query:function(ctx, query, args, callback) {
			if (!this._conn) {
				callback('Transaction closed')
				return
			}
			this._conn.query(query, args, function(err) {
				if (err) { err = logError(err, query, args) }
				callback.apply(ctx, arguments)
			})
		},
		commit:function() {
			this._finish('COMMIT')
		},
		rollback:function() {
			this._finish('ROLLBACK')
		},
		_finish:function(command) {
			if (!this._conn) { return }
			this._conn.query(command)
			this.db._returnConnection(this._conn)
			delete this._conn
		}
	}
)

function logError(err, query, args) {
	err = new Error((err.message || err) + '\n\t' + JSON.stringify(query) + ' '+JSON.stringify(args))
	// console.warn(err)
	return err
}