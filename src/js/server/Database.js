// It is worth noting that we should never write into the mysql databases directly, but must always go through the shard

var mysql = require('mysql')
var log = makeLog('Database')
var shardConfig = require('server/config/shardConfig')

var Database = module.exports = {
	configure:configure,
	shard:shard,
	randomShard:randomShard,
	lookupShard:null,
	time:getTime,
	getShardName:getShardName
}

var shards = {}
var numDogoShards = 0
function configure(shardConfs) {
	for (var shardName in shardConfs) {
		shards[shardName] = new Shard(shardConfs[shardName])
		if (shardName.match(/dogo\d+/)) {
			numDogoShards += 1
		}
	}
	Database.lookupShard = shards['dogoLookup']
}

function getShardName(id) {
	var shardIndex = ((parseInt(id) - 1) % shardConfig.MAX_SHARDS) + 1 // 1->1, 2->2, 3->3, ..., 65535->65535, 65536->1, 65537->2
	return 'dogo'+shardIndex
}

function shard(id) {
	return shards[getShardName(id)]
}

function randomShard() {
	return shard(Math.floor(Math.random() * numDogoShards) + 1)
}

var connectionBase = {
	query:function(query, args, callback) {
		var stackError = new Error()
		this._query(query, args, function(err) {
			if (err) { onDbError('query', err, stackError, query, args) }
			callback.apply(this, arguments)
		})
	},
	selectOne: function(query, args, callback) {
		var stackError = new Error()
		this.query(query, args, function(err, rows) {
			if (err) { onDbError('selectOne', err, stackError, query, args) }
			if (!err && rows.length > 1) {
				log.warn('selectOne got multiple rows', query, args, stack)
				err = "Got more rows than expected"
			}
			callback(err, err ? undefined : (rows[0] || null))
		})
	},
	select:function(query, args, callback) {
		var stackError = new Error()
		this.query(query, args, function(err, rows) {
			if (err) { onDbError('select', err, stackError, query, args) }
			callback(err, !err && rows)
		})
	},
	insert:function(query, args, callback) {
		var stackError = new Error()
		this.query(query, args, function(err, info) {
			if (err) { onDbError('insert', err, stackError, query, args) }
			if (!err && !info.insertId) {
				err = onDbError('query', new Error('Did not receive an insertId'), stackError, query, args)
			}
			callback(err, !err && info.insertId)
		})
	},
	
	insertIgnoreDuplicate:function(query, args, callback) {
		var stackError = new Error()
		this._query(query, args, function(err, info) {
			if (err && !err.message.match(/Duplicate entry/)) {
				onDbError('insertIgnoreDuplicate', err, stackError, query, args)
				callback(err)
			} else if (err) {
				return callback(err, null)
			} else {
				callback(null, info.insertId)
			}
		})
	},
	
	updateOne:function(query, args, callback) {
		var stackError = new Error()
		this.query(query, args, function(err, info) {
			if (err) { onDbError('updateOne', err, stackError, query, args) }
			if (!err && info.affectedRows > 1) {
				var errorMessage = 'updateOne affected '+info.affectedRows+' rows'
				err = onDbError(errorMessage, new Error(errorMessage), stackError, query, args)
			}
			callback(err, null)
		})
	},
	time:getTime
}

function onDbError(method, err, stackError, query, args) {
	err.stack = stackError.stack // make it easy to see where the calling code came from
	log.error(method, err.message, query, args)
	return err
}

function getTime() {
	return Math.floor(new Date().getTime() / 1000)
}

var Shard = proto(connectionBase,
	function(shardConfig) {
		this._queue = []
		this._pool = map(new Array(shardConfig.numConnections), bind(this, _createConnection))
		
		function _createConnection() {
			var connection = mysql.createClient({
				host:shardConfig.host,
				port:3306,
				user:shardConfig.user,
				password:shardConfig.password,
				database:shardConfig.shardName
			})
			connection.query('SET SESSION \n'+[
				'sql_mode="STRICT_ALL_TABLES,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION"',
				'auto_increment_increment='+shardConfig.autoIncrement.increment,
				'auto_increment_offset='+shardConfig.autoIncrement.offset
			].join(',\n'))
			// connection.query('SET NAMES utf8mb4')
			
			// from https://github.com/felixge/node-mysql#server-disconnects
			connection.on('error', bind(this, function(err) {
				if (!err.fatal) { return }
				if (err.code !== 'PROTOCOL_CONNECTION_LOST') {
					// We may want to consider staying up here, but do the simple thing for now
					log.error('Lost connection', err)
					throw err
				}
				log.warn('Reconnecting lost connection', err)
				for (var i=0; i<this._pool.length; i++) {
					if (this._pool[i] != connection) { continue }
					this._pool.splice(i, i)
					this._pool.push(_createConnection())
					break
				}
			}))
			
			return connection
		}
	}, {
		transact: function(fn) {
			this._takeConnection(function(conn) {
				fn(Transaction(this, conn))
			})
		},
		autocommit: function(fn) {
			this._takeConnection(function(conn) {
				fn(Autocommit(this, conn))
			})
		},
		_query: function(query, args, callback) {
			this._takeConnection(function(conn) {
				var self = this
				conn.query(query, args, function(err) {
					self._returnConnection(conn)
					callback.apply(this, arguments)
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
		_query:function(query, args, callback) {
			if (!this._conn) {
				callback('Transaction closed')
				return
			}
			this._conn.query(query, args, callback)
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
		_query:function(query, args, callback) {
			if (!this._conn) {
				callback('Autocommit closed')
				return
			}
			this._conn.query(query, args, callback)
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

