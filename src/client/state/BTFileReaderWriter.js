module.exports = function BTFileReaderWriter(type) {
	return {
		read:read,
		write:write,
		set:set,
		get:get
	}
	
	function read(filename, callback) {
		bridge.command('BTFiles.readJson'+type, { filename:filename }, callback)
	}
	
	function write(filename, jsonValue, callback) {
		bridge.command('BTFiles.writeJson'+type, { filename:filename, jsonValue:jsonValue }, callback)
	}
	
	function set(filename, obj, callback) {
		read(filename, function(err, data) {
			if (err) { return callback(err) }
			if (!data) { data = {} }
			each(obj, function(val, key) { data[key] = val })
			write(filename, data, callback)
		})
	}
	
	function get(filename, key, callback) {
		read(filename, function(err, data) {
			if (err) { return callback(err) }
			callback(null, data ? data[key] : null)
		})
	}
}
