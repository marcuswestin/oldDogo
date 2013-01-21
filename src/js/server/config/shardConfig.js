var MAX_SHARDS = 65535 // Don't change this :->

module.exports = {
	dogoShard:dogoShardConfig,
	lookupShard:lookupShardConfig,
	MAX_SHARDS:MAX_SHARDS
}

function dogoShardConfig(shardIndex, shardAccess) {
	return _shardConfig(shardAccess, 'dogo'+shardIndex, { offset:shardIndex, increment:MAX_SHARDS })
}

function lookupShardConfig(shardAccess) {
	return _shardConfig(shardAccess, 'dogoLookup', { offset:1, increment:1 })
}

function _shardConfig(shardAccess, shardName, autoIncrement) {
	return {
		numConnections:2,
		host:shardAccess.host,
		password:shardAccess.password,
		user:shardAccess.user,
		shardName:shardName,
		autoIncrement:autoIncrement
	}
}
