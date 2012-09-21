var mysql = require('mysql')

var connectionBase = {
	selectOne: function(ctx, query, args, callback) {
		this.query(ctx, query, args, function(err, rows) {
			if (err) { console.error('selectOne error', query, args, err) }
			if (!err && rows.length > 1) { err = "Got more rows than expected" }
			callback.call(this, err, !err && rows[0])
		})
	},
	select:function(ctx, query, args, callback) {
		this.query(ctx, query, args, function(err, rows) {
			if (err) { console.error('select error', query, args, err) }
			callback.call(this, err, !err && rows)
		})
	},
	insert:function(ctx, query, args, callback) {
		this.query(ctx, query, args, function(err, info) {
			if (err) { console.error('insert error', query, args, err) }
			if (!err && !info.insertId) { err = "Did not recieve an insertId" }
			callback.call(this, err, !err && info.insertId)
		})
	},
	
	insertIgnoreDuplicateEntry:function(ctx, query, args, callback) {
		this.insert(ctx, query, args, function(err, info) {
			if (err && !err.message.match(/Duplicate entry/)) {
				callback(err)
			} else {
				callback(null)
			}
		})
	},
	
	updateOne:function(ctx, query, args, callback) {
		this.query(ctx, query, args, function(err, info) {
			if (err) { console.error('updateOne error', query, args, err) }
			if (!err && info.affectedRows > 1) { err = "Updated more rows than expected ("+info.affectedRows+")" }
			callback.call(this, err, null)
		})
	},
	time: function() {
		return Math.floor(new Date().getTime() / 1000)
	}
}

module.exports = proto(connectionBase,
	function(conf) {
		this._poolSize = 4
		this._pool = map(new Array(this._poolSize), function() {
			var client = mysql.createClient({ host:conf.host, port:3306, user:conf.user, password:conf.password, database:conf.database })
			client.query("SET SESSION sql_mode='STRICT_ALL_TABLES,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION'")
			// client.query('SET NAMES utf8mb4')
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
		autocommit: function(ctx, fn) {
			if (!fn) {
				fn = ctx
				ctx = this
			}
			this._takeConnection(function(conn) {
				fn.call(tx, Transaction(this, conn))
			})
		},
		query: function(ctx, query, args, callback) {
			var stack = new Error()
			this._takeConnection(function(conn) {
				var self = this
				conn.query(query, args, function(err) {
					if (err) { err = logError(err, query, args, stack.stack) }
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

function logError(err, query, args, stack) {
	err = new Error((err.message || err) + '\n\t' + JSON.stringify(query) + ' '+JSON.stringify(args), stack)
	// console.warn(err)
	return err
}