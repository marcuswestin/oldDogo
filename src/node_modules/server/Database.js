var mysql = require('mysql')
var log = makeLog('Database')

var connectionBase = {
	query:function(ctx, query, args, callback) {
		var stackError = new Error()
		this._query(ctx, query, args, function(err) {
			if (err) { err = logError(err, query, args, stackError) }
			callback.apply(ctx, arguments)
		})
	},
	selectOne: function(ctx, query, args, callback) {
		var stackError = new Error()
		this.query(ctx, query, args, function(err, rows) {
			if (err) { logError('selectOne error', query, args, err) }
			if (!err && rows.length > 1) {
				logError('Got more rows than expected', query, args, stackError)
				err = "Got more rows than expected"
			}
			callback.call(this, err, err ? undefined : (rows[0] || null))
		})
	},
	select:function(ctx, query, args, callback) {
		var stackError = new Error()
		this.query(ctx, query, args, function(err, rows) {
			if (err) { logError('select error', query, args, stackError) }
			callback.call(this, err, !err && rows)
		})
	},
	insert:function(ctx, query, args, callback) {
		var stackError = new Error()
		this.query(ctx, query, args, function(err, info) {
			if (err) { logError('insert error', query, args, err) }
			if (!err && !info.insertId) {
				logError('insert error', query, args, stackError)
				err = "Did not recieve an insertId"
			}
			callback.call(this, err, !err && info.insertId)
		})
	},
	
	insertIgnoreDuplicateEntry:function(ctx, query, args, callback) {
		var stackError = new Error()
		this._query(ctx, query, args, function(err, info) {
			if (err && !err.message.match(/Duplicate entry/)) {
				logError('insert ignore dup entry', query, args, stackError)
				callback(err)
			} else {
				callback(null)
			}
		})
	},
	
	updateOne:function(ctx, query, args, callback) {
		this.query(ctx, query, args, function(err, info) {
			if (err) { log.error('updateOne error', query, args, err) }
			if (!err && info.affectedRows > 1) { err = "Updated more rows than expected ("+info.affectedRows+")" }
			callback.call(this, err, null)
		})
	},
	time:getTime
}

function getTime() {
	return Math.floor(new Date().getTime() / 1000)
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
				fn.call(ctx, Autocommit(this, conn))
			})
		},
		_query: function(ctx, query, args, callback) {
			this._takeConnection(function(conn) {
				var self = this
				conn.query(query, args, function(err) {
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
		this._time = getTime()
		this._conn = conn
		this._conn.query('START TRANSACTION')
	}, {
		time: function() {
			return this._time
		},
		_query:function(ctx, query, args, callback) {
			if (!this._conn) {
				callback('Transaction closed')
				return
			}
			this._conn.query(query, args, function(err) {
				callback.apply(ctx, arguments)
			})
		},
		wrapCallback:function wrapTxCallback(callback) {
			var tx = this
			return function(err, result) {
				try {
					if (err) { tx.rollback() }
					else { tx.commit() }
				} catch(e) {
					// Should this really be wrapped in a try/catch? And should we really overwrite the error?
					err = e
				}
				callback.call(this, err, result)
			}
			
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

var Autocommit = proto(connectionBase,
	function(db, conn) {
		this.db = db
		this._time = getTime()
		this._conn = conn
	}, {
		time: function() {
			return this._time
		},
		_query:function(ctx, query, args, callback) {
			if (!this._conn) {
				callback('Autocommit closed')
				return
			}
			this._conn.query(query, args, function(err) {
				callback.apply(ctx, arguments)
			})
		},
		wrapCallback:function(callback) {
			var autocommit = this
			return function() {
				autocommit.done()
				callback.apply(this, arguments)
			}
		},
		done:function() {
			this.db._returnConnection(this._conn)
			delete this._conn
		}
	}
)

function logError(err, query, args, stackError) {
	err = new Error((err.message || err) + '\n\t' + JSON.stringify(query) + ' '+JSON.stringify(args), stackError.stack || stackError)
	log.warn(err, query, args, stackError.stack || stackError)
	return err
}