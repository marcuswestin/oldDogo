module.exports = function() {
	return {
		payloads: {
			protocol:gConfig.protocol,
			bucket:gConfig.aws.s3.bucket,
			region:gConfig.aws.s3.region
		}
	}
}