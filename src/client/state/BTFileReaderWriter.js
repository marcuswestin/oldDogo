module.exports = function BTFileReaderWriter(type) {
	return {
		read:read,
		write:write
	}
	
	function read(filename, callback) {
		bridge.command('BTFiles.readJson'+type, { filename:filename }, callback)
	}
	
	function write(filename, jsonValue, callback) {
		bridge.command('BTFiles.writeJson'+type, { filename:filename, jsonValue:jsonValue }, callback)
	}
}
